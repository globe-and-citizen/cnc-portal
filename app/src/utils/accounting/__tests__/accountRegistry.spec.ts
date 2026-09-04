import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import { assembleFromRawEntries } from '@/utils/accounting/assemble'
import { buildAccountRegistry } from '@/utils/accounting/accountRegistry'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'

const BANK_1 = '0x1111111111111111111111111111111111111111' as Address
const BANK_2 = '0x2222222222222222222222222222222222222222' as Address
const PAYROLL_1 = '0x3333333333333333333333333333333333333333' as Address
const PAYROLL_2 = '0x4444444444444444444444444444444444444444' as Address
const EXPENSE_1 = '0x5555555555555555555555555555555555555555' as Address
const EXPENSE_2 = '0x6666666666666666666666666666666666666666' as Address
const CREDIT_1 = '0x7777777777777777777777777777777777777777' as Address
const CREDIT_2 = '0x8888888888888888888888888888888888888888' as Address

function posting(id: string, account: LedgerEntry['debit'], instance?: Address): LedgerEntry {
  return makeEntry({
    id,
    timestamp: 1,
    useCase: 'UC-BANK-02',
    debit: account,
    ...(instance ? { debitInstance: instance } : {}),
    credit: 'Service Revenue',
    amountUsd: 10,
    token: 'usdc',
    rawAmount: '10000000',
    memo: 'Test posting'
  })
}

describe('canonical account registry', () => {
  it('gives every deployment-specific contract generation its own stable AccountId', () => {
    const registry = buildAccountRegistry([
      posting('bank-1', 'Cash — Bank', BANK_1),
      posting('bank-2', 'Cash — Bank', BANK_2),
      posting('payroll-1', 'Cash — Payroll', PAYROLL_1),
      posting('payroll-2', 'Cash — Payroll', PAYROLL_2),
      posting('expense-1', 'Cash — Expense', EXPENSE_1),
      posting('expense-2', 'Cash — Expense', EXPENSE_2),
      posting('credit-1', 'Cash — Credit', CREDIT_1),
      posting('credit-2', 'Cash — Credit', CREDIT_2)
    ])

    expect(registry.resolve('Cash — Bank', BANK_1).id).not.toBe(
      registry.resolve('Cash — Bank', BANK_2).id
    )
    expect(registry.resolve('Cash — Payroll', PAYROLL_1).id).not.toBe(
      registry.resolve('Cash — Payroll', PAYROLL_2).id
    )
    expect(registry.resolve('Cash — Expense', EXPENSE_1).id).not.toBe(
      registry.resolve('Cash — Expense', EXPENSE_2).id
    )
    expect(registry.resolve('Cash — Credit', CREDIT_1).id).not.toBe(
      registry.resolve('Cash — Credit', CREDIT_2).id
    )
    expect(registry.resolve('Cash — Bank', BANK_2)).toMatchObject({
      family: 'Cash — Bank',
      contractAddress: BANK_2,
      accountClass: 'ASSET',
      normalBalance: 'debit',
      resolution: 'resolved'
    })
  })

  it('keeps an unresolvable Bank leg explicit even when two known deployments exist', () => {
    const entries = [
      posting('bank-1', 'Cash — Bank', BANK_1),
      posting('credit-sweep', 'Cash — Bank'),
      posting('bank-2', 'Cash — Bank', BANK_2)
    ]
    const books = assembleFromRawEntries(entries)
    const registry = books.accountRegistry
    const unresolved = registry.resolve('Cash — Bank')

    expect(unresolved).toMatchObject({
      id: 'cash-bank:unresolved',
      family: 'Cash — Bank',
      resolution: 'unresolved'
    })
    expect(unresolved.id).not.toBe(registry.resolve('Cash — Bank', BANK_1).id)
    expect(unresolved.id).not.toBe(registry.resolve('Cash — Bank', BANK_2).id)

    const sweep = books.journal.find((entry) => entry.id === 'credit-sweep')
    expect(sweep?.lines[0]).toMatchObject({
      account: 'Cash — Bank',
      accountId: 'cash-bank:unresolved',
      accountResolution: 'unresolved'
    })
  })

  it('keeps a non-deployment chart family as one concrete account', () => {
    const registry = buildAccountRegistry([])

    expect(registry.resolve('Service Revenue')).toMatchObject({
      id: 'service-revenue',
      family: 'Service Revenue',
      resolution: 'resolved'
    })
  })
})

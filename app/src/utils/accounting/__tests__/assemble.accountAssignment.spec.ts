import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import type { JournalAccountAssignmentRecord } from '@/types/journal-account-assignment'
import type { ContractType, TeamContract } from '@/types/teamContract'
import { buildAccountingSummary } from '@/utils/accounting/accountingSummary'
import type { CncAccountingInput } from '@/utils/accounting/assemble'
import { buildBalanceSheet } from '@/utils/accounting/balanceSheet'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import { buildIncomeStatement } from '@/utils/accounting/incomeStatement'
import type { UsdRateOfRecord } from '@/utils/accounting/toUsd'
import { ADDR, usd } from './fixtures'
import { assembleAccounting } from './assembleAccounting'

const TX = `0x${'f'.repeat(64)}`
const DEPLOYER = ADDR.founder as Address
const CONTRACTS: TeamContract[] = (
  [
    ['Bank', ADDR.bank],
    ['CashRemunerationEIP712', ADDR.payroll],
    ['ExpenseAccountEIP712', ADDR.expense],
    ['Safe', ADDR.safe]
  ] as [ContractType, string][]
).map(([type, address]) => ({ type, address: address as Address, deployer: DEPLOYER, admins: [] }))
const RATE: UsdRateOfRecord = (tokenId) => (tokenId === 'native' ? 2 : tokenId === 'sher' ? 0.5 : 1)
const BASE: CncAccountingInput = {
  contracts: CONTRACTS,
  safeAddress: ADDR.safe,
  rateOfRecord: RATE
}

function assignment(accountId: string, memo: string | null = null): JournalAccountAssignmentRecord {
  return {
    id: 1,
    teamId: 1,
    journalEntryId: TX,
    accountId,
    memo,
    assignedByAddress: ADDR.founder,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

function bankOutflow(fee = false): CncAccountingInput['bankEvents'] {
  return {
    bankDeposits: { items: [] },
    bankTokenDeposits: { items: [] },
    bankTransfers: { items: [] },
    bankTokenTransfers: {
      items: [
        {
          id: `${TX}-4`,
          contractAddress: ADDR.bank,
          to: ADDR.client,
          token: USDC_ADDRESS,
          amount: '100000000',
          timestamp: 100
        }
      ]
    },
    bankDividendDistributionTriggereds: { items: [] },
    bankFeePaids: {
      items: fee
        ? [
            {
              id: `${TX}-5`,
              contractAddress: ADDR.bank,
              token: USDC_ADDRESS,
              amount: '1000000',
              timestamp: 100
            }
          ]
        : []
    },
    bankOwnershipTransferreds: { items: [] },
    rawContractTokenTransfers: { items: [] }
  }
}

describe('accounting assembly — JournalEntry account assignments', () => {
  it('applies and reverts a persisted account ID at the JournalEntry boundary', () => {
    const input: CncAccountingInput = {
      ...BASE,
      bankEvents: bankOutflow(),
      accountAssignments: [assignment('interest-expense', 'Pay loan interest')]
    }
    const saved = assembleAccounting(input)
    expect(assembleAccounting(input).journal).toEqual(saved.journal)
    expect(saved.journal[0]).toMatchObject({
      id: TX,
      accountAssignment: {
        editable: true,
        accountId: 'interest-expense',
        memo: 'Pay loan interest'
      }
    })
    expect(saved.journal[0]!.lines[0]).toMatchObject({
      account: { id: 'interest-expense', family: { name: 'Interest Expense' } },
      debit: usd(100)
    })

    const reverted = assembleAccounting({ ...input, accountAssignments: [] })
    expect(reverted.journal[0]!.accountAssignment).toEqual({ editable: true })
    expect(reverted.journal[0]!.lines[0]).toMatchObject({
      account: { id: 'operating-expense', family: { name: 'Operating Expense' } },
      debit: usd(100)
    })
    expect(buildGeneralLedger(reverted.journal).balanced).toBe(true)
  })

  it('keeps the fee line and gross cash credit unchanged when assigning the counter-account', () => {
    const books = assembleAccounting({
      ...BASE,
      bankEvents: bankOutflow(true),
      accountAssignments: [assignment('owner-capital')]
    })
    expect(books.journal[0]!.lines.map((line) => line.account.id)).toEqual([
      'owner-capital',
      'transaction-fee-expense',
      `cash-bank:${ADDR.bank}`
    ])
    expect(books.journal[0]!.lines.at(-1)?.credit).toBe(usd(101))
    expect(buildGeneralLedger(books.journal).balanced).toBe(true)
  })

  it('ignores unknown account IDs instead of mutating a journal line', () => {
    const books = assembleAccounting({
      ...BASE,
      bankEvents: bankOutflow(),
      accountAssignments: [assignment('cash-bank')]
    })
    expect(books.journal[0]!.lines[0]!.account.id).toBe('operating-expense')
    expect(books.journal[0]!.accountAssignment).toEqual({ editable: true })
  })

  it('does not expose assignments for direct deposits or internal movements', () => {
    const deposit = assembleAccounting({
      ...BASE,
      bankEvents: {
        ...bankOutflow(),
        bankTokenTransfers: { items: [] },
        bankTokenDeposits: {
          items: [
            {
              id: `${TX}-1`,
              contractAddress: ADDR.bank,
              depositor: ADDR.client,
              token: USDC_ADDRESS,
              amount: '100000000',
              timestamp: 100
            }
          ]
        }
      },
      accountAssignments: [assignment('owner-capital')]
    })
    expect(deposit.journal[0]!.accountAssignment).toBeUndefined()
    expect(buildAccountingSummary(deposit.journal).income).toBe(usd(100))
    expect(buildIncomeStatement(deposit.journal).revenue).toContainEqual({
      account: 'Service Revenue',
      amount: usd(100)
    })
    expect(buildBalanceSheet(deposit.journal).balanced).toBe(true)

    const internal = assembleAccounting({
      ...BASE,
      bankEvents: {
        ...bankOutflow(),
        bankTokenTransfers: {
          items: [
            {
              id: `${TX}-2`,
              contractAddress: ADDR.bank,
              to: ADDR.safe,
              token: USDC_ADDRESS,
              amount: '100000000',
              timestamp: 100
            }
          ]
        }
      },
      accountAssignments: [assignment('interest-expense')]
    })
    expect(internal.journal[0]!.internal).toBe(true)
    expect(internal.journal[0]!.accountAssignment).toBeUndefined()
  })

  it('keeps compound external withdrawals read-only and ignores a stored assignment', () => {
    const events = bankOutflow()!
    events.bankTokenTransfers!.items.push({
      id: `${TX}-6`,
      contractAddress: ADDR.bank,
      to: ADDR.member,
      token: USDC_ADDRESS,
      amount: '2000000',
      timestamp: 100
    })
    const books = assembleAccounting({
      ...BASE,
      bankEvents: events,
      accountAssignments: [assignment('payroll-expense')]
    })
    expect(books.journal[0]!.accountAssignment).toEqual({ editable: false })
    expect(books.journal[0]!.lines[0]!.account.id).toBe('operating-expense')
  })
})

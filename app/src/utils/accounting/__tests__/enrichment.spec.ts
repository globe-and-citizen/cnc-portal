import { describe, it, expect } from 'vitest'
import { enrichEntries } from '@/utils/accounting/enrichment'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { WeeklyClaim } from '@/types/cash-remuneration'
import type { ExpenseResponse } from '@/types/expense-account'
import { ADDR } from './fixtures'

const payrollEntry = (): LedgerEntry =>
  makeEntry({
    id: 'p1',
    timestamp: 1_700_000_100,
    useCase: 'UC-CASH-03',
    debit: 'Wage Payable',
    credit: 'Cash — Payroll',
    amountUsd: 2,
    token: 'native',
    rawAmount: '1',
    counterparty: ADDR.member,
    memo: 'Wage withdrawal — cash settlement',
    enrichment: 'needs-off-chain-data'
  })

const expenseEntry = (): LedgerEntry =>
  makeEntry({
    id: 'e1',
    timestamp: 1_700_000_100,
    useCase: 'UC-EXP-01',
    debit: 'Operating Expense',
    credit: 'Cash — Expense',
    amountUsd: 4,
    token: 'usdc',
    rawAmount: '4000000',
    counterparty: ADDR.member,
    memo: 'Approved expense payout',
    enrichment: 'needs-off-chain-data'
  })

const weeklyClaim = (): WeeklyClaim =>
  ({
    memberAddress: ADDR.member,
    weekStart: new Date(1_700_000_000 * 1000).toISOString(),
    minutesWorked: 120,
    wage: { ratePerHour: [{ type: 'usdc', amount: 15 }] },
    claims: [{ memo: 'Fixed the build' }]
  }) as unknown as WeeklyClaim

const expenseRecord = (): ExpenseResponse =>
  ({
    id: 42,
    userAddress: ADDR.member,
    createdAt: new Date(1_700_000_000 * 1000),
    data: { tokenAddress: ADDR.usdcToken }
  }) as unknown as ExpenseResponse

describe('enrichEntries', () => {
  it('attaches the Payroll category and rate/minutes/memo to a payroll entry', () => {
    const [entry] = enrichEntries([payrollEntry()], { weeklyClaims: [weeklyClaim()] })
    expect(entry.category).toBe('Payroll')
    expect(entry.enrichment).toBe('enriched')
    expect(entry.memo).toContain('15 usdc/h')
    expect(entry.memo).toContain('120 min')
    expect(entry.memo).toContain('Fixed the build')
  })

  it('attaches the Operating category to an expense entry', () => {
    const [entry] = enrichEntries([expenseEntry()], { expenses: [expenseRecord()] })
    expect(entry).toMatchObject({ category: 'Operating', enrichment: 'enriched' })
    expect(entry.memo).toContain('#42')
  })

  it('prefers the budget in the entry token over a nearer-dated one in another token', () => {
    const nearerNativeBudget = {
      ...expenseRecord(),
      id: 43,
      createdAt: new Date(1_700_000_100 * 1000), // closest by date, but wrong token
      data: { tokenAddress: null }
    } as unknown as ExpenseResponse
    const tokenIdOf = (address: string | null | undefined) =>
      address?.toLowerCase() === ADDR.usdcToken ? ('usdc' as const) : ('native' as const)
    const [entry] = enrichEntries(
      [expenseEntry()],
      { expenses: [nearerNativeBudget, expenseRecord()] },
      tokenIdOf
    )
    expect(entry.memo).toContain('#42')
  })

  it('keeps the needs-off-chain-data flag when no portal record matches', () => {
    const [entry] = enrichEntries([payrollEntry()], { weeklyClaims: [] })
    expect(entry.enrichment).toBe('needs-off-chain-data')
    expect(entry.category).toBeUndefined()
  })

  it('leaves entries that need no off-chain data untouched', () => {
    const internal = makeEntry({
      id: 'i1',
      timestamp: 1,
      useCase: 'INTERNAL',
      debit: 'Cash — Bank',
      credit: 'Cash — Safe',
      amountUsd: 1,
      token: 'native',
      rawAmount: '1',
      internal: true,
      memo: 'move'
    })
    const [entry] = enrichEntries([internal], { weeklyClaims: [weeklyClaim()] })
    expect(entry).toEqual(internal)
  })
})

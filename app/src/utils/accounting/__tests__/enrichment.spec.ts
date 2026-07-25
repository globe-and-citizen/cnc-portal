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

  it('pairs each settlement to the claim it actually paid (by amount), not the nearest week', () => {
    // Two claims settled on the same day: 5h and 10h at 10 usdc/h → 50 and 100 usdc.
    // Both withdrawals are dated in the later week, so "nearest week" would collapse
    // them onto the 10h claim; amount-matching must keep each on its own claim.
    const wage = { ratePerHour: [{ type: 'usdc', amount: 10 }], maximumHoursPerWeek: 40 }
    const fiveHours = {
      memberAddress: ADDR.member,
      weekStart: new Date(1_700_000_000 * 1000).toISOString(),
      minutesWorked: 300,
      wage,
      claims: []
    } as unknown as WeeklyClaim
    const tenHours = {
      memberAddress: ADDR.member,
      weekStart: new Date(1_700_600_000 * 1000).toISOString(),
      minutesWorked: 600,
      wage,
      claims: []
    } as unknown as WeeklyClaim

    const settle = (id: string, rawAmount: string): LedgerEntry =>
      makeEntry({
        id,
        timestamp: 1_700_650_000, // both near the 10h week
        useCase: 'UC-CASH-03',
        debit: 'Wage Payable',
        credit: 'Cash — Payroll',
        amountUsd: 0,
        token: 'usdc',
        rawAmount,
        counterparty: ADDR.member,
        memo: 'Wage withdrawal — cash settlement',
        enrichment: 'needs-off-chain-data'
      })

    const [fivePaid, tenPaid] = enrichEntries(
      [settle('s5', '50000000'), settle('s10', '100000000')],
      { weeklyClaims: [fiveHours, tenHours] }
    )
    expect(fivePaid.minutesWorked).toBe(300)
    expect(tenPaid.minutesWorked).toBe(600)
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

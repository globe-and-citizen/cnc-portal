import { describe, it, expect } from 'vitest'
import { enrichEntries } from '@/utils/accounting/enrichment'
import { makeJournalEntryDraft, type JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import type { WeeklyClaim } from '@/types/cash-remuneration'
import type { ExpenseResponse } from '@/types/expense-account'
import { ADDR } from './fixtures'

const payrollEntry = (): JournalEntryDraft =>
  makeJournalEntryDraft({
    id: 'p1',
    timestamp: 1_700_000_100,
    useCase: 'UC-CASH-03',
    debit: 'Wage Payable',
    credit: 'Cash — Payroll',
    token: 'native',
    rawAmount: '1',
    counterparty: ADDR.member,
    memo: 'Wage withdrawal — cash settlement',
    enrichment: 'needs-off-chain-data'
  })

const expenseEntry = (): JournalEntryDraft =>
  makeJournalEntryDraft({
    id: 'e1',
    timestamp: 1_700_000_100,
    useCase: 'UC-EXP-01',
    debit: 'Operating Expense',
    credit: 'Cash — Expense',
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

    const settle = (id: string, rawAmount: string): JournalEntryDraft =>
      makeJournalEntryDraft({
        id,
        timestamp: 1_700_650_000, // both near the 10h week
        useCase: 'UC-CASH-03',
        debit: 'Wage Payable',
        credit: 'Cash — Payroll',
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

  it('[AC-US-ACCT-002-19] pairs an overtime settlement by the amount the contract paid, below the exact total', () => {
    // 36h20 at 1 SHER/h up to 35h, then 7 SHER/h → exactly 44.333333 SHER. The claim
    // is signed with the blended rate 1.220183 SHER/h (truncated), so the contract
    // pays 2180 min × 1.220183 / 60 = 44.333315 SHER. The nearer 16h50 claim must
    // not win the fallback.
    const wage = {
      ratePerHour: [{ type: 'sher', amount: 1 }],
      overtimeRatePerHour: [{ type: 'sher', amount: 7 }],
      maximumHoursPerWeek: 35
    }
    const overtimeWeek = {
      memberAddress: ADDR.member,
      weekStart: new Date(1_700_000_000 * 1000).toISOString(),
      minutesWorked: 2180,
      wage,
      claims: []
    } as unknown as WeeklyClaim
    const nearerWeek = {
      memberAddress: ADDR.member,
      weekStart: new Date(1_700_600_000 * 1000).toISOString(),
      minutesWorked: 1010,
      wage,
      claims: []
    } as unknown as WeeklyClaim
    const sherSettlement = makeJournalEntryDraft({
      id: 'sher-paid',
      timestamp: 1_700_650_000,
      useCase: 'UC-CASH-03',
      debit: 'SHERS To Be Issued',
      credit: 'Investor Equity',
      token: 'sher',
      rawAmount: '44333315',
      counterparty: ADDR.member,
      memo: 'Wage paid in shares (SHER mint)',
      enrichment: 'needs-off-chain-data'
    })

    const [entry] = enrichEntries([sherSettlement], { weeklyClaims: [nearerWeek, overtimeWeek] })

    expect(entry.minutesWorked).toBe(2180)
  })

  it('[AC-US-ACCT-002-19] pairs the cash and SHER legs of one withdrawal to a single claim', () => {
    const wage = {
      ratePerHour: [
        { type: 'usdc', amount: 10 },
        { type: 'sher', amount: 10 }
      ],
      maximumHoursPerWeek: 40
    }
    const claimFor = (weekSeconds: number, minutesWorked: number) =>
      ({
        memberAddress: ADDR.member,
        weekStart: new Date(weekSeconds * 1000).toISOString(),
        minutesWorked,
        wage,
        claims: []
      }) as unknown as WeeklyClaim
    const settlement = (id: string, token: 'usdc' | 'sher', rawAmount: string) =>
      makeJournalEntryDraft({
        id,
        timestamp: 1_701_000_000,
        useCase: 'UC-CASH-03',
        debit: token === 'sher' ? 'SHERS To Be Issued' : 'Wage Payable',
        credit: token === 'sher' ? 'Investor Equity' : 'Cash — Payroll',
        token,
        rawAmount,
        counterparty: ADDR.member,
        memo: 'Wage withdrawal',
        enrichment: 'needs-off-chain-data'
      })
    const firstTx = `0x${'a'.repeat(64)}`
    const secondTx = `0x${'b'.repeat(64)}`

    const entries = enrichEntries(
      [
        settlement(`${firstTx}-1`, 'usdc', '50000000'),
        settlement(`${firstTx}-2`, 'sher', '50000000'),
        settlement(`${secondTx}-1`, 'usdc', '100000000')
      ],
      { weeklyClaims: [claimFor(1_700_000_000, 300), claimFor(1_700_600_000, 600)] }
    )

    expect(entries.map((entry) => entry.minutesWorked)).toEqual([300, 300, 600])
  })

  it('keeps the needs-off-chain-data flag when no portal record matches', () => {
    const [entry] = enrichEntries([payrollEntry()], { weeklyClaims: [] })
    expect(entry.enrichment).toBe('needs-off-chain-data')
    expect(entry.category).toBeUndefined()
  })

  it('leaves entries that need no off-chain data untouched', () => {
    const internal = makeJournalEntryDraft({
      id: 'i1',
      timestamp: 1,
      useCase: 'INTERNAL',
      debit: 'Cash — Bank',
      credit: 'Cash — Safe',
      token: 'native',
      rawAmount: '1',
      internal: true,
      memo: 'move'
    })
    const [entry] = enrichEntries([internal], { weeklyClaims: [weeklyClaim()] })
    expect(entry).toEqual(internal)
  })
})

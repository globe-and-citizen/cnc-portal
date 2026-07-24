import { describe, it, expect } from 'vitest'
import { ledgerRows } from '@/utils/accounting/ledgerPresenter'
import { money } from '@/utils/accounting/presenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { TokenId } from '@/constant'

const MEMBER = '0x1111111111111111111111111111111111111111'
const WEEK_END = 1_000

// Per-token USD amounts / whole quantities used across the cases.
const AMT = { usdc: 40, pol: 0.8, sher: 10 } as const
const QTY = { usdc: '40000000', pol: '10000000000000000000', sher: '10000000' } as const

/** One accrual leg (Dr expense · Cr payable) for the member's weekly claim. */
function accrual(token: TokenId, debit: string, credit: string): LedgerEntry {
  return {
    id: `accrual-17-${token}`,
    timestamp: WEEK_END,
    useCase: 'UC-CASH-02',
    debit: debit as LedgerEntry['debit'],
    credit: credit as LedgerEntry['credit'],
    amountUsd: AMT[token as keyof typeof AMT],
    token,
    rawAmount: QTY[token as keyof typeof QTY],
    rate: token === 'pol' ? 0.08 : 1,
    counterparty: MEMBER,
    internal: false,
    minutesWorked: 300,
    periodEnd: WEEK_END,
    ...(token === 'sher' ? { shares: 10 } : {}),
    memo: 'Wage earned',
    enrichment: 'enriched'
  }
}

/** One settlement leg; all legs of a withdraw share the tx hash `0xwd`. */
function settle(
  token: TokenId,
  debit: string,
  credit: string,
  useCase: LedgerEntry['useCase'],
  log: number
): LedgerEntry {
  return {
    id: `0xwd-${log}`,
    timestamp: WEEK_END,
    useCase,
    debit: debit as LedgerEntry['debit'],
    credit: credit as LedgerEntry['credit'],
    amountUsd: AMT[token as keyof typeof AMT],
    token,
    rawAmount: QTY[token as keyof typeof QTY],
    rate: token === 'pol' ? 0.08 : 1,
    counterparty: MEMBER,
    internal: false,
    minutesWorked: 300,
    ...(token === 'sher' ? { shares: 10 } : {}),
    memo: 'Wage settlement',
    enrichment: 'needs-off-chain-data'
  }
}

// ── accrual legs ──
const accUsdc = accrual('usdc', 'Payroll Expense', 'Wage Payable')
const accPol = accrual('pol', 'Payroll Expense', 'Wage Payable')
const accSher = accrual('sher', 'Share-based Compensation', 'Shares to be issued')
// ── settlement legs (SHER issuance minted in the same tx → DEFAULT-D) ──
const setUsdc = settle('usdc', 'Wage Payable', 'Cash — Payroll', 'UC-CASH-03', 0)
const setPol = settle('pol', 'Wage Payable', 'Cash — Payroll', 'UC-CASH-03', 1)
const setSher = settle('sher', 'Shares to be issued', 'Investor Equity', 'DEFAULT-D', 2)

/** Debit/credit strings of the rows, for compact assertions. */
const drs = (rows: { dr: string }[]) => rows.map((r) => r.dr).filter(Boolean)
const crs = (rows: { cr: string }[]) => rows.map((r) => r.cr).filter(Boolean)

describe('payroll grouping — compound postings', () => {
  it('Cas 7 (USDC+POL+SHER) accrual: 1 head, itemized debits, aggregated credits', () => {
    const rows = ledgerRows([accUsdc, accPol, accSher])
    expect(rows).toHaveLength(5)
    expect(rows.filter((r) => r.isFirst)).toHaveLength(1)

    // Debits itemized per token, each with its currency + quantity + rate.
    expect(drs(rows)).toEqual([money(40), money(0.8), money(10)])
    expect(rows[0].currency).not.toBe('') // USDC leg carries movement
    expect(rows[1].currency).not.toBe('') // POL leg carries movement

    // Credits aggregated: one Wage Payable ($40.80), one Shares to be issued ($10).
    expect(crs(rows)).toEqual([money(40.8), money(10)])
    const wagePayable = rows.find((r) => r.account === 'Wage Payable' && r.cr)
    expect(wagePayable?.currency).toBe('') // aggregated line has no single currency

    // Head Activity enriched with the SHER part.
    expect(rows[0].activity).toMatchObject({ kind: 'actor' })
    expect((rows[0].activity as { text: string }).text).toMatch(/\+ 10 SHER/)
    expect(rows[0].label).toBe('Wage accrual')
  })

  it('Cas 7 (USDC+POL+SHER) settlement groups cash + DEFAULT-D share leg by tx', () => {
    const rows = ledgerRows([setUsdc, setPol, setSher])
    expect(rows).toHaveLength(5)
    expect(rows.filter((r) => r.isFirst)).toHaveLength(1)
    expect(drs(rows)).toEqual([money(40), money(0.8), money(10)])
    expect(crs(rows)).toEqual([money(40.8), money(10)])
    expect(rows[0].label).toBe('Wage settlement')
    expect((rows[0].activity as { text: string }).text).toMatch(/\+ 10 SHER/)
  })

  it('Cas 4 (USDC+POL, cash only): 3 lines, no SHER tail', () => {
    const rows = ledgerRows([accUsdc, accPol])
    expect(rows).toHaveLength(3)
    expect(drs(rows)).toEqual([money(40), money(0.8)])
    expect(crs(rows)).toEqual([money(40.8)])
    expect((rows[0].activity as { text: string }).text).not.toMatch(/SHER/)
  })

  it('Cas 5 (USDC+SHER) settlement: two pairs, each credit standalone', () => {
    const rows = ledgerRows([setUsdc, setSher])
    expect(rows).toHaveLength(4)
    expect(drs(rows)).toEqual([money(40), money(10)])
    expect(crs(rows)).toEqual([money(40), money(10)])
  })

  it('mono-token cases stay a plain 2-line posting (no aggregation)', () => {
    for (const leg of [accUsdc, accSher, setUsdc, setSher]) {
      const rows = ledgerRows([leg])
      expect(rows).toHaveLength(2)
      expect(rows.filter((r) => r.isFirst)).toHaveLength(1)
    }
  })

  it('a standalone direct mint (DEFAULT-D, own tx) is not grouped', () => {
    const mint: LedgerEntry = {
      id: '0xmint-0',
      timestamp: 2_000,
      useCase: 'DEFAULT-D',
      debit: 'Shares to be issued',
      credit: 'Investor Equity',
      amountUsd: 25,
      token: 'sher',
      rawAmount: '25000000',
      rate: 1,
      counterparty: MEMBER,
      internal: false,
      shares: 25,
      memo: 'Direct SHER mint',
      enrichment: 'not-applicable'
    }
    const rows = ledgerRows([setUsdc, mint])
    // Two distinct events (different tx) → two heads.
    expect(rows.filter((r) => r.isFirst)).toHaveLength(2)
  })
})

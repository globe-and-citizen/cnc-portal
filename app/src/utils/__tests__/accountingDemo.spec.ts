import { describe, it, expect } from 'vitest'
import {
  money,
  fmtDate,
  buildLedger,
  trialRows,
  trialTotal,
  totalRevenue,
  totalExpenses,
  netIncome,
  totalAssets,
  totalEquity,
  dateMin,
  dateMax
} from '../accountingDemo'

describe('accountingDemo formatters', () => {
  it('money() formats to two decimals with a dollar sign', () => {
    expect(money(142.2)).toBe('$142.20')
    expect(money(0)).toBe('$0.00')
    expect(money(1234.5)).toBe('$1,234.50')
  })

  it('fmtDate() renders an ISO date as "MMM D, YYYY"', () => {
    expect(fmtDate('2026-01-08')).toBe('Jan 8, 2026')
    expect(fmtDate('2026-06-10')).toBe('Jun 10, 2026')
  })
})

describe('derived statement totals match the balanced book', () => {
  it('income statement nets to the demo profit', () => {
    expect(totalRevenue).toBe('$115.00')
    expect(totalExpenses).toBe('$110.80')
    expect(netIncome).toBe('$4.20')
  })

  it('balance sheet keeps assets = equity', () => {
    expect(totalAssets).toBe('$142.20')
    expect(totalEquity).toBe('$142.20')
  })

  it('trial balance has equal debit and credit totals', () => {
    expect(trialTotal).toBe('$253.00')
    expect(trialRows).toHaveLength(11)
  })
})

describe('buildLedger()', () => {
  it('returns balanced debit/credit totals over the full range', () => {
    const { rows, total, entryCount } = buildLedger('All', dateMin, dateMax)
    expect(entryCount).toBe(18)
    // every journal line becomes a row
    expect(rows.length).toBeGreaterThan(18)
    // sum of debits equals sum of credits in a balanced book
    expect(total).toBe('$678.10')
  })

  it('filters by category', () => {
    const { entryCount } = buildLedger('Investment', dateMin, dateMax)
    expect(entryCount).toBe(4)
  })

  it('filters to the quarter window (Q2 Apr–Jun)', () => {
    const { entryCount } = buildLedger('All', '2026-04-01', '2026-06-30')
    // entries 12–18 fall in Q2
    expect(entryCount).toBe(7)
  })

  it('filters to the month window (June)', () => {
    const { entryCount } = buildLedger('All', '2026-06-01', '2026-06-30')
    // entries 17 (Jun 2) and 18 (Jun 10) fall in June
    expect(entryCount).toBe(2)
  })

  it('marks only the first line of an entry with date/label metadata', () => {
    const { rows } = buildLedger('Revenue', dateMin, dateMax)
    expect(rows[0].isFirst).toBe(true)
    expect(rows[0].label).toBe('Client pays $100 for service')
    expect(rows[1].isFirst).toBe(false)
    expect(rows[1].label).toBe('')
  })
})

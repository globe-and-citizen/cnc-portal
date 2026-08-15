import { describe, it, expect } from 'vitest'
import { buildIncomeStatement } from '@/utils/accounting/incomeStatement'
import { catalogueLedger } from './catalogueLedger'

describe('buildIncomeStatement — catalogue §6.5', () => {
  const is = buildIncomeStatement(catalogueLedger)
  const lineFor = (account: string): number =>
    [...is.revenue, ...is.expenses].find((l) => l.account === account)?.amount ?? 0

  it('totals revenue, expenses and net income', () => {
    expect(is.totalRevenue).toBeCloseTo(115, 2)
    // 100.80, not 110.80: the $10 SHER leg of the wage stays in equity.
    expect(is.totalExpenses).toBeCloseTo(100.8, 2)
    expect(is.netIncome).toBeCloseTo(14.2, 2)
  })

  it('breaks revenue and expenses into their account lines', () => {
    expect(lineFor('Service Revenue')).toBeCloseTo(100, 2)
    expect(lineFor('Trading Gain')).toBeCloseTo(15, 2)
    expect(lineFor('Payroll Expense')).toBeCloseTo(40.8, 2) // cash legs only
    expect(lineFor('Operating Expense')).toBeCloseTo(20, 2)
    expect(lineFor('Trading Loss')).toBeCloseTo(20, 2)
    expect(lineFor('Dividend Expense')).toBeCloseTo(20, 2)
  })

  it('keeps SHER-based compensation off the income statement entirely', () => {
    // Issue #2458: a wage paid in shares is booked Dr Deferred SHER Compensation
    // (contra-equity) · Cr SHERS To Be Issued (equity) — no revenue, no expense,
    // no effect on net income.
    const accounts = [...is.revenue, ...is.expenses].map((l) => l.account)
    expect(accounts).not.toContain('Deferred SHER Compensation')
    expect(accounts).not.toContain('SHERS To Be Issued')

    // And dropping every SHER posting leaves the result untouched.
    const withoutSher = catalogueLedger.filter((e) => e.token !== 'sher')
    expect(buildIncomeStatement(withoutSher).netIncome).toBeCloseTo(is.netIncome, 2)
  })

  it('ignores internal cash-to-cash moves (no income/expense impact)', () => {
    const internalOnly = catalogueLedger.filter((e) => e.internal)
    const is = buildIncomeStatement(internalOnly)
    expect(is.revenue).toHaveLength(0)
    expect(is.expenses).toHaveLength(0)
    expect(is.netIncome).toBe(0)
  })
})

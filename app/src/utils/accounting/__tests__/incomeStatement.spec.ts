import { describe, it, expect } from 'vitest'
import { buildJournal } from '@/utils/accounting/generalLedger'
import { buildIncomeStatement } from '@/utils/accounting/incomeStatement'
import { catalogueLedger } from './catalogueLedger'

describe('buildIncomeStatement — catalogue §6.5', () => {
  const is = buildIncomeStatement(buildJournal(catalogueLedger))
  const lineFor = (account: string): number =>
    [...is.revenue, ...is.expenses].find((l) => l.account === account)?.amount ?? 0

  it('totals revenue, expenses and net income', () => {
    expect(is.totalRevenue).toBeCloseTo(115, 2)
    expect(is.totalExpenses).toBeCloseTo(100.8, 2) // no SHER compensation (was 110.8)
    expect(is.netIncome).toBeCloseTo(14.2, 2) // was 4.2; the $10 SHER is off the IS
  })

  it('breaks revenue and expenses into their account lines', () => {
    expect(lineFor('Service Revenue')).toBeCloseTo(100, 2)
    expect(lineFor('Trading Gain')).toBeCloseTo(15, 2)
    expect(lineFor('Payroll Expense')).toBeCloseTo(40.8, 2) // cash legs only
    expect(lineFor('Operating Expense')).toBeCloseTo(20, 2)
    expect(lineFor('Trading Loss')).toBeCloseTo(20, 2)
    expect(lineFor('Dividend Expense')).toBeCloseTo(20, 2)
  })

  it('keeps SHER compensation off the income statement entirely', () => {
    expect(lineFor('Deferred SHER Compensation')).toBe(0)
    expect(lineFor('SHERS To Be Issued')).toBe(0)
  })

  it('ignores internal cash-to-cash moves (no income/expense impact)', () => {
    const internalOnly = catalogueLedger.filter((e) => e.internal)
    const is = buildIncomeStatement(buildJournal(internalOnly))
    expect(is.revenue).toHaveLength(0)
    expect(is.expenses).toHaveLength(0)
    expect(is.netIncome).toBe(0)
  })
})

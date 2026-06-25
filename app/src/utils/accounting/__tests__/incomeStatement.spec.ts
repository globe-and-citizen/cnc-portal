import { describe, it, expect } from 'vitest'
import { buildIncomeStatement } from '@/utils/accounting/incomeStatement'
import { catalogueLedger } from './catalogueLedger'

describe('buildIncomeStatement — catalogue §6.5', () => {
  const is = buildIncomeStatement(catalogueLedger)
  const lineFor = (account: string): number =>
    [...is.revenue, ...is.expenses].find((l) => l.account === account)?.amount ?? 0

  it('totals revenue, expenses and net income', () => {
    expect(is.totalRevenue).toBeCloseTo(115, 2)
    expect(is.totalExpenses).toBeCloseTo(110.8, 2)
    expect(is.netIncome).toBeCloseTo(4.2, 2)
  })

  it('breaks revenue and expenses into their account lines', () => {
    expect(lineFor('Service Revenue')).toBeCloseTo(100, 2)
    expect(lineFor('Trading Gain')).toBeCloseTo(15, 2)
    expect(lineFor('Payroll Expense')).toBeCloseTo(50.8, 2)
    expect(lineFor('Operating Expense')).toBeCloseTo(20, 2)
    expect(lineFor('Trading Loss')).toBeCloseTo(20, 2)
    expect(lineFor('Dividend Expense')).toBeCloseTo(20, 2)
  })

  it('ignores internal cash-to-cash moves (no income/expense impact)', () => {
    const internalOnly = catalogueLedger.filter((e) => e.internal)
    const is = buildIncomeStatement(internalOnly)
    expect(is.revenue).toHaveLength(0)
    expect(is.expenses).toHaveLength(0)
    expect(is.netIncome).toBe(0)
  })
})

/**
 * Income statement (issue #2117, catalogue §6.5).
 *
 * Groups the income and expense accounts of the canonical journal into revenue
 * and expense lines and derives the net result:
 *
 *     Net income = Σ revenue − Σ expenses
 *
 * Internal moves (cash-to-cash) and equity / balance-sheet postings never touch
 * an income or expense account, so they are naturally excluded. In the worked
 * example: revenue 115 (Service 100 + Trading Gain 15), expenses 110.80
 * (Payroll 50.80 + Operating 20 + Trading Loss 20 + Dividend 20) → net +4.20.
 */
import { ACCOUNT_NAMES, classOf, type AccountName } from './chartOfAccounts'
import { journalFamilyBalances } from './journalBalances'
import type { JournalEntry } from './journalEntry'
import { ZERO_USD_AMOUNT, type UsdAmount } from './monetaryAmount'

export interface StatementLine {
  account: AccountName
  amount: UsdAmount
}

export interface IncomeStatement {
  /** Income accounts with non-zero activity (revenue + gains). */
  revenue: StatementLine[]
  /** Expense accounts with non-zero activity (costs + losses). */
  expenses: StatementLine[]
  totalRevenue: UsdAmount
  totalExpenses: UsdAmount
  /** totalRevenue − totalExpenses. */
  netIncome: UsdAmount
}

/** Build the income statement from canonical JournalEntry lines. */
export function buildIncomeStatement(entries: readonly JournalEntry[]): IncomeStatement {
  const net = journalFamilyBalances(entries)

  const revenue: StatementLine[] = []
  const expenses: StatementLine[] = []
  let totalRevenue = ZERO_USD_AMOUNT
  let totalExpenses = ZERO_USD_AMOUNT

  // Walk the chart in declared order so lines read top-down and stay stable.
  for (const account of ACCOUNT_NAMES) {
    const amount = net.get(account) ?? ZERO_USD_AMOUNT
    if (amount === ZERO_USD_AMOUNT) continue
    const cls = classOf(account)
    if (cls === 'INCOME') {
      revenue.push({ account, amount })
      totalRevenue += amount
    } else if (cls === 'EXPENSE') {
      expenses.push({ account, amount })
      totalExpenses += amount
    }
  }

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses
  }
}

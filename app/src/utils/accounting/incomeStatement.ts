/**
 * Income statement (issue #2117, catalogue §6.5).
 *
 * Groups the income and expense accounts of the consolidated feed into revenue
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
import { netBalanceByAccount } from './generalLedger'
import type { LedgerEntry } from './ledgerEntry'

export interface StatementLine {
  account: AccountName
  amount: number
}

export interface IncomeStatement {
  /** Income accounts with non-zero activity (revenue + gains). */
  revenue: StatementLine[]
  /** Expense accounts with non-zero activity (costs + losses). */
  expenses: StatementLine[]
  totalRevenue: number
  totalExpenses: number
  /** totalRevenue − totalExpenses. */
  netIncome: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Build the income statement from the consolidated ledger feed. */
export function buildIncomeStatement(entries: readonly LedgerEntry[]): IncomeStatement {
  const net = netBalanceByAccount(entries)

  const revenue: StatementLine[] = []
  const expenses: StatementLine[] = []
  let totalRevenue = 0
  let totalExpenses = 0

  // Walk the chart in declared order so lines read top-down and stay stable.
  for (const account of ACCOUNT_NAMES) {
    const amount = net.get(account) ?? 0
    if (amount === 0) continue
    const cls = classOf(account)
    if (cls === 'INCOME') {
      revenue.push({ account, amount })
      totalRevenue += amount
    } else if (cls === 'EXPENSE') {
      expenses.push({ account, amount })
      totalExpenses += amount
    }
  }

  totalRevenue = round2(totalRevenue)
  totalExpenses = round2(totalExpenses)
  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome: round2(totalRevenue - totalExpenses)
  }
}

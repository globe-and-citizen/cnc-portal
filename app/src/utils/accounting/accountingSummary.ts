/** Summary metrics projected from canonical JournalEntry lines. */
import { classOf, type AccountName } from './chartOfAccounts'
import { journalFamilyBalancesUnrounded } from './journalBalances'
import type { JournalEntry } from './journalEntry'

const CASH_ACCOUNTS: ReadonlySet<AccountName> = new Set<AccountName>([
  'Cash — Bank',
  'Cash — Safe',
  'Cash — Payroll',
  'Cash — Expense',
  'Cash — Credit',
  'Cash — FeeCollector'
])

const CONTRIBUTED_EQUITY: ReadonlySet<AccountName> = new Set<AccountName>([
  'Owner Capital',
  'Investor Equity'
])

const DEBT_REPAYMENT_ACCOUNTS: ReadonlySet<AccountName> = new Set([
  'Loan Payable',
  'Interest Payable'
])

export interface AccountingSummary {
  /** Net cash across every company cash pocket. */
  cash: number
  /** Income-account total. */
  income: number
  /** Expense-account total. */
  expense: number
  /** Transaction Fee Expense, a subset of expense. */
  transactionFees: number
  /** Principal and interest returned to Community Credit lenders. */
  debtRepaid: number
  /** Contributed owner and investor capital, excluding retained earnings. */
  equity: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Build the Summary metrics from the assembled journal. */
export function buildAccountingSummary(entries: readonly JournalEntry[]): AccountingSummary {
  const balances = journalFamilyBalancesUnrounded(entries)
  let cash = 0
  let income = 0
  let expense = 0
  let equity = 0

  for (const [account, amount] of balances) {
    if (CASH_ACCOUNTS.has(account)) cash += amount
    if (classOf(account) === 'INCOME') income += amount
    if (classOf(account) === 'EXPENSE') expense += amount
    if (CONTRIBUTED_EQUITY.has(account)) equity += amount
  }

  const transactionFees = balances.get('Transaction Fee Expense') ?? 0
  const debtRepaid = entries
    .filter((entry) => entry.useCase === 'UC-CREDIT-03')
    .flatMap((entry) => entry.lines)
    .filter((line) => DEBT_REPAYMENT_ACCOUNTS.has(line.account.family.name))
    .reduce((sum, line) => sum + (line.debit ?? 0), 0)

  return {
    cash: round2(cash),
    income: round2(income),
    expense: round2(expense),
    transactionFees: round2(transactionFees),
    debtRepaid: round2(debtRepaid),
    equity: round2(equity)
  }
}

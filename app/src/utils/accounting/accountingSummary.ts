/** Summary metrics projected from canonical JournalEntry lines. */
import { classOf, type AccountName } from './chartOfAccounts'
import { journalFamilyBalances } from './journalBalances'
import { ZERO_USD_AMOUNT } from './monetaryAmount'
import type { AccountingSummary, JournalEntry } from './types'

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

/** Build the Summary metrics from the assembled journal. */
export function buildAccountingSummary(entries: readonly JournalEntry[]): AccountingSummary {
  const balances = journalFamilyBalances(entries)
  let cash = ZERO_USD_AMOUNT
  let income = ZERO_USD_AMOUNT
  let expense = ZERO_USD_AMOUNT
  let equity = ZERO_USD_AMOUNT

  for (const [account, amount] of balances) {
    if (CASH_ACCOUNTS.has(account)) cash += amount
    if (classOf(account) === 'INCOME') income += amount
    if (classOf(account) === 'EXPENSE') expense += amount
    if (CONTRIBUTED_EQUITY.has(account)) equity += amount
  }

  const transactionFees = balances.get('Transaction Fee Expense') ?? ZERO_USD_AMOUNT
  const debtRepaid = entries
    .filter((entry) => entry.useCase === 'UC-CREDIT-03')
    .flatMap((entry) => entry.lines)
    .filter((line) => DEBT_REPAYMENT_ACCOUNTS.has(line.account.family.name))
    .reduce((sum, line) => sum + (line.debit ?? ZERO_USD_AMOUNT), ZERO_USD_AMOUNT)

  return {
    cash,
    income,
    expense,
    transactionFees,
    debtRepaid,
    equity
  }
}

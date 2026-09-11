/** Action labels and colours derived from the accounts on a complete JournalEntry. */
import type { JournalEntry } from './types'

type LedgerCategory =
  | 'Investment'
  | 'Credit'
  | 'Revenue'
  | 'Trading'
  | 'Transfer'
  | 'Payroll'
  | 'Expense'
  | 'Dividend'
  | 'Memo'

const CATEGORY_BADGE: Record<LedgerCategory, string> = {
  Investment: 'bg-secondary/10 text-secondary',
  Credit: 'bg-accent/10 text-accent',
  Revenue: 'bg-success/10 text-success',
  Trading: 'bg-info/10 text-info',
  Transfer: 'bg-neutral/10 text-neutral',
  Payroll: 'bg-warning/10 text-warning',
  Expense: 'bg-error/10 text-error',
  Dividend: 'bg-primary/10 text-primary',
  Memo: 'bg-muted text-dimmed'
}

const CREDIT_ACCOUNTS = new Set([
  'cash-credit',
  'loan-payable',
  'interest-payable',
  'interest-expense'
])
const INVESTMENT_ACCOUNTS = new Set([
  'owner-capital',
  'investor-equity',
  'deferred-sher-compensation',
  'shers-to-be-issued'
])
const TRADING_ACCOUNTS = new Set(['trading-account', 'trading-gain', 'trading-loss'])

/** Derive the reporting/action family from journal-line accounts, never a category field. */
function categoryOf(entry: JournalEntry): LedgerCategory {
  if (entry.kind === 'memo') {
    return entry.useCase === 'DEFAULT-D' || entry.useCase.startsWith('UC-VEST-')
      ? 'Investment'
      : 'Memo'
  }
  if (entry.internal) return 'Transfer'

  const accounts = new Set(entry.lines.map((line) => line.account.family.id))
  const classes = new Set(entry.lines.map((line) => line.account.family.accountClass))
  if ([...accounts].some((account) => TRADING_ACCOUNTS.has(account))) return 'Trading'
  if (accounts.has('dividend-expense')) return 'Dividend'
  if (accounts.has('payroll-expense') || accounts.has('wage-payable')) return 'Payroll'
  if ([...accounts].some((account) => CREDIT_ACCOUNTS.has(account))) return 'Credit'
  if ([...accounts].some((account) => INVESTMENT_ACCOUNTS.has(account))) return 'Investment'
  if (classes.has('INCOME')) return 'Revenue'
  if (classes.has('EXPENSE')) return 'Expense'
  return 'Transfer'
}

/** Spell out payroll lifecycle phases while retaining their account-derived family. */
export function categoryLabelOf(entry: JournalEntry): string {
  if (entry.useCase === 'UC-CASH-02') return 'Payroll: Claim'
  if (entry.useCase === 'UC-CASH-03') return 'Payroll: Withdraw'
  return categoryOf(entry)
}

const CREDIT_BADGE: Partial<Record<JournalEntry['useCase'], string>> = {
  'UC-CREDIT-03': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  'UC-CREDIT-05':
    'text-violet-600 ring-1 ring-violet-500/40 dark:text-violet-400 dark:ring-violet-400/40',
  'UC-CREDIT-04': 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
}

/** Badge style for an account-derived JournalEntry category. */
export function badgeClassOf(entry: JournalEntry): string {
  if (entry.useCase === 'UC-CASH-03') return 'bg-accent/10 text-accent'
  return CREDIT_BADGE[entry.useCase] ?? CATEGORY_BADGE[categoryOf(entry)]
}

/**
 * CNC chart of accounts — the shared vocabulary every statement reads from.
 *
 * Names and classes are aligned 1:1 with the money-flow catalogue §4
 * (`docs/features/accounting/money-flow-catalogue.md`). Every ledger entry,
 * trial balance, income statement and balance sheet in the accounting pipeline
 * keys off the {@link AccountName} union and {@link AccountClass} declared here.
 *
 * Scope notes (spec §5–§6):
 * - `Infrastructure Expense` / `Interest Expense` are intentionally **absent** —
 *   they are Phase 2 gaps with no data feed yet.
 * - Fees are an **internal move** (Bank → `Cash — FeeCollector`), not an income
 *   or expense account. `Cash — FeeCollector` is a cash pocket; there is no
 *   separate "Fee" account.
 */

/** The five fundamental account classes of double-entry bookkeeping. */
export type AccountClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'

/**
 * Every account the CNC books touch. Cash is split per on-chain pocket
 * (Bank / Safe / Payroll / Expense / FeeCollector) — each is its own account
 * that rolls up into total Cash.
 */
export const ACCOUNT_NAMES = [
  'Cash — Bank',
  'Cash — Safe',
  'Cash — Payroll',
  'Cash — Expense',
  'Cash — FeeCollector',
  'Trading account',
  'Wage Payable',
  'Shares to be issued',
  'Owner Capital',
  'Investor Equity',
  'Retained Earnings',
  'Service Revenue',
  'Trading Gain',
  'Payroll Expense',
  'Operating Expense',
  'Dividend Expense',
  'Trading Loss'
] as const

export type AccountName = (typeof ACCOUNT_NAMES)[number]

export interface Account {
  readonly name: AccountName
  readonly class: AccountClass
}

/** The class of every account in the chart. */
export const CHART_OF_ACCOUNTS: Readonly<Record<AccountName, AccountClass>> = {
  'Cash — Bank': 'ASSET',
  'Cash — Safe': 'ASSET',
  'Cash — Payroll': 'ASSET',
  'Cash — Expense': 'ASSET',
  'Cash — FeeCollector': 'ASSET',
  'Trading account': 'ASSET',
  'Wage Payable': 'LIABILITY',
  'Shares to be issued': 'LIABILITY',
  'Owner Capital': 'EQUITY',
  'Investor Equity': 'EQUITY',
  'Retained Earnings': 'EQUITY',
  'Service Revenue': 'INCOME',
  'Trading Gain': 'INCOME',
  'Payroll Expense': 'EXPENSE',
  'Operating Expense': 'EXPENSE',
  'Dividend Expense': 'EXPENSE',
  'Trading Loss': 'EXPENSE'
}

/** The chart as an ordered list of `{ name, class }` records. */
export const ACCOUNTS: readonly Account[] = ACCOUNT_NAMES.map((name) => ({
  name,
  class: CHART_OF_ACCOUNTS[name]
}))

/** The class of a given account. */
export function classOf(account: AccountName): AccountClass {
  return CHART_OF_ACCOUNTS[account]
}

/** Classes whose normal balance sits on the debit side. */
const DEBIT_NORMAL_CLASSES: ReadonlySet<AccountClass> = new Set<AccountClass>(['ASSET', 'EXPENSE'])

/** Whether a class's normal balance is a debit (ASSET / EXPENSE) vs a credit. */
export function isDebitNormalClass(accountClass: AccountClass): boolean {
  return DEBIT_NORMAL_CLASSES.has(accountClass)
}

/**
 * Whether an account's normal balance is on the **debit** side.
 * ASSET and EXPENSE accounts are debit-normal; LIABILITY, EQUITY and INCOME
 * accounts are credit-normal.
 */
export function isDebitNormal(account: AccountName): boolean {
  return isDebitNormalClass(classOf(account))
}

/** The normal-balance side of an account, as a literal. */
export function normalBalance(account: AccountName): 'debit' | 'credit' {
  return isDebitNormal(account) ? 'debit' : 'credit'
}

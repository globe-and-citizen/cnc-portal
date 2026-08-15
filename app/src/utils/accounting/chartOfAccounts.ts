/**
 * CNC chart of accounts — the shared vocabulary every statement reads from.
 *
 * Names and classes are aligned 1:1 with the money-flow catalogue §4
 * (`docs/features/accounting/money-flow-catalogue.md`). Every ledger entry,
 * trial balance, income statement and balance sheet in the accounting pipeline
 * keys off the {@link AccountName} union and {@link AccountClass} declared here.
 *
 * Scope notes (spec §5–§6):
 * - `Infrastructure Expense` is intentionally **absent** — a Phase 2 gap with no
 *   data feed yet.
 * - `Interest Expense` **is** booked: the FixedReturn (Community Credit) feed
 *   supplies it, as the fixed return paid to lenders above their principal. The
 *   contract fixes that fee when the round funds and never prorates it, so it is
 *   recognised in full there — not when the cash leaves — and sits in
 *   `Interest Payable` until it is paid.
 * - `Network Fee Expense` (gas paid to validators) is likewise **absent**: gas is
 *   not indexed by any feed yet, so there is nothing to post.
 * - The Bank protocol fee (`FeePaid`) *is* booked, as a real cost leaving the
 *   treasury: `Transaction Fee Expense`. The fee is skimmed to the protocol-wide
 *   FeeCollector (not a team pocket), so it is an expense, not an internal move.
 * - SHER paid as wages is **not** an expense: it runs entirely through equity
 *   (`Deferred SHER Compensation` / `SHERS To Be Issued`) — see
 *   {@link CONTRA_ACCOUNTS} and issue #2458.
 */

/** The five fundamental account classes of double-entry bookkeeping. */
export type AccountClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'

/**
 * Every account the CNC books touch. Cash is split per on-chain pocket
 * (Bank / Safe / Payroll / Expense / Credit / FeeCollector) — each is its own
 * account that rolls up into total Cash.
 */
export const ACCOUNT_NAMES = [
  'Cash — Bank',
  'Cash — Safe',
  'Cash — Payroll',
  'Cash — Expense',
  'Cash — Credit',
  'Cash — FeeCollector',
  'Trading account',
  'Wage Payable',
  'Loan Payable',
  'Interest Payable',
  'Owner Capital',
  'Investor Equity',
  'SHERS To Be Issued',
  'Deferred SHER Compensation',
  'Retained Earnings',
  'Service Revenue',
  'Trading Gain',
  'Payroll Expense',
  'Operating Expense',
  'Interest Expense',
  'Dividend Expense',
  'Trading Loss',
  'Transaction Fee Expense'
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
  'Cash — Credit': 'ASSET',
  'Cash — FeeCollector': 'ASSET',
  'Trading account': 'ASSET',
  'Wage Payable': 'LIABILITY',
  'Loan Payable': 'LIABILITY',
  'Interest Payable': 'LIABILITY',
  'Owner Capital': 'EQUITY',
  'Investor Equity': 'EQUITY',
  'SHERS To Be Issued': 'EQUITY',
  'Deferred SHER Compensation': 'EQUITY',
  'Retained Earnings': 'EQUITY',
  'Service Revenue': 'INCOME',
  'Trading Gain': 'INCOME',
  'Payroll Expense': 'EXPENSE',
  'Operating Expense': 'EXPENSE',
  'Interest Expense': 'EXPENSE',
  'Dividend Expense': 'EXPENSE',
  'Trading Loss': 'EXPENSE',
  'Transaction Fee Expense': 'EXPENSE'
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
 * **Contra accounts** — accounts that sit in a class but carry the *opposite*
 * normal balance, reducing their class instead of adding to it.
 *
 * `Deferred SHER Compensation` is the book's only one: SHER earned by a member is
 * booked straight into equity (Dr `Deferred SHER Compensation` · Cr
 * `SHERS To Be Issued`) rather than expensed, so the debit side has to live in
 * equity as a contra — the same device US GAAP uses for unearned/deferred
 * compensation at a restricted-stock grant. The pair nets to zero, which is the
 * whole point: share-based pay never reaches the income statement (issue #2458).
 *
 * A contra account flips every sign the books derive from an account's normal
 * side — trial-balance column, net balance, running balance in the drill-down —
 * so {@link isDebitNormal} is the single place that resolves it.
 */
export const CONTRA_ACCOUNTS: ReadonlySet<AccountName> = new Set<AccountName>([
  'Deferred SHER Compensation'
])

/** Whether an account reduces its own class rather than adding to it. */
export function isContraAccount(account: AccountName): boolean {
  return CONTRA_ACCOUNTS.has(account)
}

/**
 * Whether an account's normal balance is on the **debit** side.
 * ASSET and EXPENSE accounts are debit-normal; LIABILITY, EQUITY and INCOME
 * accounts are credit-normal — except a {@link CONTRA_ACCOUNTS} account, which
 * carries the opposite side of its own class.
 */
export function isDebitNormal(account: AccountName): boolean {
  const byClass = isDebitNormalClass(classOf(account))
  return isContraAccount(account) ? !byClass : byClass
}

/** The normal-balance side of an account, as a literal. */
export function normalBalance(account: AccountName): 'debit' | 'credit' {
  return isDebitNormal(account) ? 'debit' : 'credit'
}

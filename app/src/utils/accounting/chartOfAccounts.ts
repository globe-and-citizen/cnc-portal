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
 *
 * SHER compensation treatment (issue #2458):
 * - SHER wages are **not** an expense — they are a non-cash equity transaction.
 *   The accrual debits `Deferred SHER Compensation` (contra-equity, debit-normal)
 *   and credits `SHERS To Be Issued` (equity). When the shares are minted /
 *   withdrawn, `SHERS To Be Issued` is debited and `Investor Equity` credited.
 *   This keeps SHER off the income statement entirely.
 */

/**
 * The account classes of double-entry bookkeeping, extended with
 * `CONTRA_EQUITY` — a debit-normal equity class that reduces total equity
 * (e.g. treasury shares, deferred compensation). It appears on the equity
 * section of the balance sheet as a negative, never on the income statement.
 */
export type AccountClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'CONTRA_EQUITY' | 'INCOME' | 'EXPENSE'

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
  'Deferred SHER Compensation',
  'SHERS To Be Issued',
  'Owner Capital',
  'Investor Equity',
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
  'Deferred SHER Compensation': 'CONTRA_EQUITY',
  'SHERS To Be Issued': 'EQUITY',
  'Owner Capital': 'EQUITY',
  'Investor Equity': 'EQUITY',
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

/**
 * Cash pockets that split into **per-contract sub-accounts** when a team redeploys,
 * so the trial balance shows each deployment's balance on its own line (`Cash — Bank`
 * / `Cash — Bank #2`), each carrying only its own contract's events.
 *
 * `Cash — Safe` is **excluded**: the Gnosis Safe's address survives redeploys (it is
 * governed by no Officer — see `useCNCAccounting`), so there is only ever one Safe
 * instance to show. `Cash — FeeCollector` is the protocol-wide collector (a single
 * shared instance) and `Trading account` is a derived position, so neither splits.
 */
const INSTANCED_POCKETS: ReadonlySet<AccountName> = new Set<AccountName>([
  'Cash — Bank',
  'Cash — Payroll',
  'Cash — Expense',
  'Cash — Credit'
])

/** Whether an account is a cash pocket whose trial-balance line splits per contract instance (redeploy). */
export function isInstancedPocket(account: AccountName): boolean {
  return INSTANCED_POCKETS.has(account)
}

/**
 * Classes whose normal balance sits on the debit side.
 * CONTRA_EQUITY is debit-normal: it increases with debits and reduces equity.
 */
const DEBIT_NORMAL_CLASSES: ReadonlySet<AccountClass> = new Set<AccountClass>([
  'ASSET',
  'EXPENSE',
  'CONTRA_EQUITY'
])

/** Whether a class's normal balance is a debit (ASSET / EXPENSE / CONTRA_EQUITY) vs a credit. */
export function isDebitNormalClass(accountClass: AccountClass): boolean {
  return DEBIT_NORMAL_CLASSES.has(accountClass)
}

/**
 * Whether an account's normal balance is on the **debit** side.
 * ASSET, EXPENSE and CONTRA_EQUITY accounts are debit-normal; LIABILITY,
 * EQUITY and INCOME accounts are credit-normal.
 */
export function isDebitNormal(account: AccountName): boolean {
  return isDebitNormalClass(classOf(account))
}

/** The normal-balance side of an account, as a literal. */
export function normalBalance(account: AccountName): 'debit' | 'credit' {
  return isDebitNormal(account) ? 'debit' : 'credit'
}

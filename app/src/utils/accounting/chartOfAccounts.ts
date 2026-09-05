/**
 * CNC chart of accounts — the shared vocabulary every statement reads from.
 *
 * Names and classes are aligned 1:1 with the money-flow catalogue §4
 * (`docs/features/accounting/money-flow-catalogue.md`). Every raw ledger entry
 * identifies an account family by name; the journal resolves that family to a
 * concrete account in `accountRegistry.ts`.
 *
 * Scope notes (spec §5–§6):
 * - `Infrastructure Expense` and `Network Fee Expense` are intentionally absent:
 *   no accounting data feed exists for either yet.
 * - The Bank protocol fee (`FeePaid`) is booked as `Transaction Fee Expense`.
 * - SHER wages are a non-cash equity transaction: `Deferred SHER Compensation`
 *   (contra-equity) and `SHERS To Be Issued` (equity), not an expense.
 */

/** The classes of double-entry bookkeeping used by the CNC chart. */
export type AccountClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'CONTRA_EQUITY' | 'INCOME' | 'EXPENSE'

/** The side on which an account normally carries its balance. */
export type NormalBalance = 'debit' | 'credit'

/** One reusable family in the chart of accounts. */
export interface AccountFamilyDefinition {
  /** Stable machine key; never use the display name as an identity. */
  readonly id: string
  /** Human-readable chart name used by the legacy posting feed. */
  readonly name: string
  readonly accountClass: AccountClass
  readonly normalBalance: NormalBalance
  /** Whether each source contract deployment is a separate concrete account. */
  readonly deploymentScoped: boolean
}

/**
 * The canonical account-family registry. A family owns every attribute shared by
 * its concrete accounts; only a concrete account's contract address and
 * resolution vary at journal time.
 */
export const ACCOUNT_FAMILIES = [
  {
    id: 'cash-bank',
    name: 'Cash — Bank',
    accountClass: 'ASSET',
    normalBalance: 'debit',
    deploymentScoped: true
  },
  {
    id: 'cash-safe',
    name: 'Cash — Safe',
    accountClass: 'ASSET',
    normalBalance: 'debit',
    deploymentScoped: false
  },
  {
    id: 'cash-payroll',
    name: 'Cash — Payroll',
    accountClass: 'ASSET',
    normalBalance: 'debit',
    deploymentScoped: true
  },
  {
    id: 'cash-expense',
    name: 'Cash — Expense',
    accountClass: 'ASSET',
    normalBalance: 'debit',
    deploymentScoped: true
  },
  {
    id: 'cash-credit',
    name: 'Cash — Credit',
    accountClass: 'ASSET',
    normalBalance: 'debit',
    deploymentScoped: true
  },
  {
    id: 'cash-fee-collector',
    name: 'Cash — FeeCollector',
    accountClass: 'ASSET',
    normalBalance: 'debit',
    deploymentScoped: false
  },
  {
    id: 'trading-account',
    name: 'Trading account',
    accountClass: 'ASSET',
    normalBalance: 'debit',
    deploymentScoped: false
  },
  {
    id: 'wage-payable',
    name: 'Wage Payable',
    accountClass: 'LIABILITY',
    normalBalance: 'credit',
    deploymentScoped: false
  },
  {
    id: 'loan-payable',
    name: 'Loan Payable',
    accountClass: 'LIABILITY',
    normalBalance: 'credit',
    deploymentScoped: false
  },
  {
    id: 'interest-payable',
    name: 'Interest Payable',
    accountClass: 'LIABILITY',
    normalBalance: 'credit',
    deploymentScoped: false
  },
  {
    id: 'deferred-sher-compensation',
    name: 'Deferred SHER Compensation',
    accountClass: 'CONTRA_EQUITY',
    normalBalance: 'debit',
    deploymentScoped: false
  },
  {
    id: 'shers-to-be-issued',
    name: 'SHERS To Be Issued',
    accountClass: 'EQUITY',
    normalBalance: 'credit',
    deploymentScoped: false
  },
  {
    id: 'owner-capital',
    name: 'Owner Capital',
    accountClass: 'EQUITY',
    normalBalance: 'credit',
    deploymentScoped: false
  },
  {
    id: 'investor-equity',
    name: 'Investor Equity',
    accountClass: 'EQUITY',
    normalBalance: 'credit',
    deploymentScoped: false
  },
  {
    id: 'retained-earnings',
    name: 'Retained Earnings',
    accountClass: 'EQUITY',
    normalBalance: 'credit',
    deploymentScoped: false
  },
  {
    id: 'service-revenue',
    name: 'Service Revenue',
    accountClass: 'INCOME',
    normalBalance: 'credit',
    deploymentScoped: false
  },
  {
    id: 'trading-gain',
    name: 'Trading Gain',
    accountClass: 'INCOME',
    normalBalance: 'credit',
    deploymentScoped: false
  },
  {
    id: 'payroll-expense',
    name: 'Payroll Expense',
    accountClass: 'EXPENSE',
    normalBalance: 'debit',
    deploymentScoped: false
  },
  {
    id: 'operating-expense',
    name: 'Operating Expense',
    accountClass: 'EXPENSE',
    normalBalance: 'debit',
    deploymentScoped: false
  },
  {
    id: 'interest-expense',
    name: 'Interest Expense',
    accountClass: 'EXPENSE',
    normalBalance: 'debit',
    deploymentScoped: false
  },
  {
    id: 'dividend-expense',
    name: 'Dividend Expense',
    accountClass: 'EXPENSE',
    normalBalance: 'debit',
    deploymentScoped: false
  },
  {
    id: 'trading-loss',
    name: 'Trading Loss',
    accountClass: 'EXPENSE',
    normalBalance: 'debit',
    deploymentScoped: false
  },
  {
    id: 'transaction-fee-expense',
    name: 'Transaction Fee Expense',
    accountClass: 'EXPENSE',
    normalBalance: 'debit',
    deploymentScoped: false
  }
] as const satisfies readonly AccountFamilyDefinition[]

/** A reusable account-family object from the canonical registry. */
export type AccountFamily = (typeof ACCOUNT_FAMILIES)[number]

/** Stable machine key of an account family. */
export type AccountFamilyId = AccountFamily['id']

/** Human-readable chart name carried by the legacy ledger-entry boundary. */
export type AccountName = AccountFamily['name']

/** Ordered chart names retained for raw ledger compatibility. */
export const ACCOUNT_NAMES: readonly AccountName[] = ACCOUNT_FAMILIES.map((family) => family.name)

const FAMILIES_BY_NAME: Readonly<Record<AccountName, AccountFamily>> = Object.fromEntries(
  ACCOUNT_FAMILIES.map((family) => [family.name, family])
) as Readonly<Record<AccountName, AccountFamily>>

/** Read a reusable account family by its legacy chart name. */
export function accountFamilyOf(account: AccountName): AccountFamily {
  return FAMILIES_BY_NAME[account]
}

/** The class of a given legacy chart name. */
export function classOf(account: AccountName): AccountClass {
  return accountFamilyOf(account).accountClass
}

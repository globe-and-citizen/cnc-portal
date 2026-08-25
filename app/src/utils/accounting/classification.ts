/**
 * Manual Bank/Safe transaction classification — the deterministic account mapping
 * (issue #2457).
 *
 * A team owner can override the address-inference fallback of the Bank/Safe mappers
 * by classifying a deposit or withdrawal into one accounting category. This module is
 * the pure core of that feature: given a direction, the cash pocket the money moved
 * through and a category, it resolves the balanced debit and credit accounts.
 *
 * Guaranteed-internal invariant: a movement whose counterparty is one of the team's
 * own pockets is provably an internal transfer, so it can never be reclassified as
 * external income, expense, capital or a loan. Passing that `pocket` is what asserts
 * the movement is internal, so the guard cannot be bypassed by forgetting a flag.
 */
import type { AccountName } from './chartOfAccounts'

/** Deposit (cash into a pocket) vs withdrawal (cash out of a pocket). */
export type ClassificationDirection = 'in' | 'out'

/**
 * The accounting categories a Bank/Safe movement can be classified into. Mirrors the
 * backend Prisma `TransactionClassificationCategory` enum.
 */
export const CLASSIFICATION_CATEGORIES = [
  'REVENUE',
  'EXPENSE',
  'SHAREHOLDER_LOAN',
  'OWNER_CAPITAL',
  'INTERNAL_TRANSFER',
  'PAYROLL_EXPENSE',
  'INTEREST_EXPENSE',
  'DIVIDEND_EXPENSE'
] as const

export type ClassificationCategory = (typeof CLASSIFICATION_CATEGORIES)[number]

/** A manual classification an owner attached to one transaction. */
export interface ClassificationOverride {
  category: ClassificationCategory
  memo?: string | null
}

/** Human-readable label for each category, shared by the classification UI. */
export const CATEGORY_LABEL: Record<ClassificationCategory, string> = {
  REVENUE: 'Revenue',
  EXPENSE: 'Expense',
  SHAREHOLDER_LOAN: 'Shareholder Loan',
  OWNER_CAPITAL: 'Owner Capital',
  INTERNAL_TRANSFER: 'Internal Transfer',
  PAYROLL_EXPENSE: 'Payroll',
  INTEREST_EXPENSE: 'Interest',
  DIVIDEND_EXPENSE: 'Dividend'
}

/** The non-cash leg for each external category (INTERNAL_TRANSFER books to a pocket). */
const COUNTER_ACCOUNT: Record<Exclude<ClassificationCategory, 'INTERNAL_TRANSFER'>, AccountName> = {
  REVENUE: 'Service Revenue',
  EXPENSE: 'Operating Expense',
  SHAREHOLDER_LOAN: 'Loan Payable',
  OWNER_CAPITAL: 'Owner Capital',
  PAYROLL_EXPENSE: 'Payroll Expense',
  INTEREST_EXPENSE: 'Interest Expense',
  DIVIDEND_EXPENSE: 'Dividend Expense'
}

/**
 * Which categories a user may pick for each direction, and the menu the UI offers.
 * Revenue only makes sense on an inflow and an expense only on an outflow; capital, a
 * shareholder loan and an internal transfer are meaningful both ways.
 */
export const ALLOWED_BY_DIRECTION: Record<
  ClassificationDirection,
  readonly ClassificationCategory[]
> = {
  in: ['REVENUE', 'OWNER_CAPITAL', 'SHAREHOLDER_LOAN', 'INTERNAL_TRANSFER'],
  out: [
    'EXPENSE',
    'PAYROLL_EXPENSE',
    'INTEREST_EXPENSE',
    'DIVIDEND_EXPENSE',
    'OWNER_CAPITAL',
    'SHAREHOLDER_LOAN',
    'INTERNAL_TRANSFER'
  ]
}

/** A balanced pair of accounts a classification books to, plus whether it is internal. */
export interface ClassifiedAccounts {
  debit: AccountName
  credit: AccountName
  /** True only for `INTERNAL_TRANSFER` (both legs are CNC-owned pockets). */
  internal: boolean
}

export interface ResolveClassifiedAccountsInput {
  direction: ClassificationDirection
  /** The Bank/Safe cash pocket the money moved through (e.g. `'Cash — Bank'`). */
  cashAccount: AccountName
  category: ClassificationCategory
  /**
   * The team pocket the counterparty resolves to. Its presence both proves the
   * movement is internal and supplies the transfer's other leg, so an internal
   * movement admits `INTERNAL_TRANSFER` and nothing else.
   */
  pocket?: AccountName | null
}

/**
 * Resolve the balanced debit/credit accounts a classification books to, or `null` when
 * the classification is not permitted — a category the direction disallows, an
 * `INTERNAL_TRANSFER` with no pocket to move against, or an external category on a
 * provably internal movement. A `null` return means "keep the inference": the caller
 * falls back to the address-inferred entry rather than applying an invalid override.
 *
 * Deposits debit the cash pocket and credit the category account; withdrawals do the
 * reverse — so every result is a single balanced pair by construction.
 */
export function resolveClassifiedAccounts(
  input: ResolveClassifiedAccountsInput
): ClassifiedAccounts | null {
  const { direction, cashAccount, category, pocket } = input

  if (category === 'INTERNAL_TRANSFER') {
    if (!pocket) return null
    return direction === 'in'
      ? { debit: cashAccount, credit: pocket, internal: true }
      : { debit: pocket, credit: cashAccount, internal: true }
  }

  if (pocket) return null
  if (!ALLOWED_BY_DIRECTION[direction].includes(category)) return null

  const counter = COUNTER_ACCOUNT[category]
  return direction === 'in'
    ? { debit: cashAccount, credit: counter, internal: false }
    : { debit: counter, credit: cashAccount, internal: false }
}

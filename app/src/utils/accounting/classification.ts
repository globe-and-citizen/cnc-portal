/**
 * Manual Bank/Safe transaction classification — the deterministic account mapping
 * (issue #2457).
 *
 * A team owner can override the address-inference fallback of the Bank/Safe mappers
 * by classifying a deposit or withdrawal into one accounting category. This module
 * is the **pure** core of that feature: given a direction (deposit vs withdrawal),
 * the cash pocket the money moved through, and a category, it resolves the balanced
 * debit and credit accounts. No Vue, no network — the persistence (backend) and the
 * pipeline wiring live elsewhere; this only owns the category → accounts rule so it
 * is one deterministic, unit-tested table.
 *
 * The **guaranteed-internal invariant**: a movement between two CNC-owned pockets is
 * provably an internal transfer (both sides are the team's own cash), so it can never
 * be reclassified as external income, expense, capital or a loan. Only
 * `INTERNAL_TRANSFER` survives that guard — which is what the inference already books
 * — so the override is a no-op there rather than a way to misstate the books.
 */
import type { AccountName } from './chartOfAccounts'

/** Deposit (cash into a pocket) vs withdrawal (cash out of a pocket). */
export type ClassificationDirection = 'in' | 'out'

/**
 * The constrained accounting categories a Bank/Safe movement can be classified into.
 * Mirrors the backend Prisma `TransactionClassificationCategory` enum (issue #2457).
 */
export type ClassificationCategory =
  | 'REVENUE'
  | 'EXPENSE'
  | 'SHAREHOLDER_LOAN'
  | 'OWNER_CAPITAL'
  | 'INTERNAL_TRANSFER'
  | 'PAYROLL_EXPENSE'
  | 'INTEREST_EXPENSE'
  | 'DIVIDEND_EXPENSE'

/**
 * A manual classification an owner attached to one transaction — the category plus
 * an optional free-text note. This is the override the pipeline threads through the
 * mapper context and applies on top of the address inference.
 */
export interface ClassificationOverride {
  category: ClassificationCategory
  memo?: string | null
}

/** Every category, as a value tuple for iteration / validation. */
export const CLASSIFICATION_CATEGORIES = [
  'REVENUE',
  'EXPENSE',
  'SHAREHOLDER_LOAN',
  'OWNER_CAPITAL',
  'INTERNAL_TRANSFER',
  'PAYROLL_EXPENSE',
  'INTEREST_EXPENSE',
  'DIVIDEND_EXPENSE'
] as const satisfies readonly ClassificationCategory[]

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

/** The non-cash leg's account for each external category (INTERNAL_TRANSFER books to a pocket). */
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
 * Which categories a user may pick for each direction. Revenue only makes sense on
 * an inflow and an expense only on an outflow; capital, a shareholder loan and an
 * internal transfer are meaningful both ways (contribution/draw, borrow/repay).
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

export interface ClassificationConstraints {
  /**
   * The movement is provably internal (its counterparty is a known CNC pocket). When
   * true, only `INTERNAL_TRANSFER` is permitted — the guaranteed-internal invariant.
   */
  guaranteedInternal?: boolean
}

/**
 * Whether `category` is a valid manual classification for a movement in `direction`.
 * A guaranteed-internal movement admits only `INTERNAL_TRANSFER`; any external
 * category (revenue, expense, capital, loan) is rejected there.
 */
export function isClassificationAllowed(
  direction: ClassificationDirection,
  category: ClassificationCategory,
  { guaranteedInternal = false }: ClassificationConstraints = {}
): boolean {
  if (guaranteedInternal) return category === 'INTERNAL_TRANSFER'
  return ALLOWED_BY_DIRECTION[direction].includes(category)
}

/**
 * The categories to offer for a movement — the direction's set, narrowed to just
 * `INTERNAL_TRANSFER` when the movement is guaranteed internal. Drives the UI menu.
 */
export function allowedCategories(
  direction: ClassificationDirection,
  constraints: ClassificationConstraints = {}
): ClassificationCategory[] {
  return ALLOWED_BY_DIRECTION[direction].filter((category) =>
    isClassificationAllowed(direction, category, constraints)
  )
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
   * The internal pocket the counterparty resolves to, required to book an
   * `INTERNAL_TRANSFER` (the transfer's other leg). Absent for external categories.
   */
  pocket?: AccountName | null
  /** The guaranteed-internal guard — see {@link isClassificationAllowed}. */
  guaranteedInternal?: boolean
}

/**
 * Resolve the balanced debit/credit accounts a classification books to, or `null`
 * when the (direction, category) pair is not permitted — including the
 * guaranteed-internal guard, and an `INTERNAL_TRANSFER` with no known pocket to move
 * against. A `null` return means "keep the inference": the caller falls back to the
 * address-inferred entry rather than applying an invalid override.
 *
 * Deposits debit the cash pocket and credit the category account; withdrawals do the
 * reverse — so every result is a single balanced pair by construction.
 */
export function resolveClassifiedAccounts(
  input: ResolveClassifiedAccountsInput
): ClassifiedAccounts | null {
  const { direction, cashAccount, category, pocket, guaranteedInternal } = input

  if (!isClassificationAllowed(direction, category, { guaranteedInternal })) return null

  if (category === 'INTERNAL_TRANSFER') {
    if (!pocket) return null
    return direction === 'in'
      ? { debit: cashAccount, credit: pocket, internal: true }
      : { debit: pocket, credit: cashAccount, internal: true }
  }

  const counter = COUNTER_ACCOUNT[category]
  return direction === 'in'
    ? { debit: cashAccount, credit: counter, internal: false }
    : { debit: counter, credit: cashAccount, internal: false }
}

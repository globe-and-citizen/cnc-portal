/**
 * The ledger's category vocabulary — the "Action" badge and the filter pills.
 *
 * Split from {@link ./ledgerPresenter} (which turns entries into table rows) the
 * same way {@link ./ledgerCurrency} was, so each module stays focused; the
 * presenter re-exports everything here, and callers can keep importing from it.
 * Pure and unit-testable.
 */
import type { LedgerEntry, UseCase } from './ledgerEntry'

/** Exact chart-of-accounts label for a protocol-fee leg; drives badge + filter. */
export const FEE_ACCOUNT = 'Transaction Fee Expense'

export type LedgerCategory =
  | 'Investment'
  | 'Credit'
  | 'Revenue'
  | 'Trading'
  | 'Transfer'
  | 'Payroll'
  | 'Expense'
  | 'Dividend'
  | 'Memo'

/**
 * Soft badge classes per ledger category — one distinct theme colour each, so
 * the "Action" column reads at a glance (static strings so Tailwind keeps them).
 * Colours come from the project palette (see `assets/main.css`).
 */
export const CATEGORY_BADGE: Record<LedgerCategory, string> = {
  Investment: 'bg-secondary/10 text-secondary', // capital in — blue
  Credit: 'bg-accent/10 text-accent', // borrowed money — teal
  Revenue: 'bg-success/10 text-success', // income earned — green
  Trading: 'bg-info/10 text-info', // market activity — cyan
  Transfer: 'bg-neutral/10 text-neutral', // internal move — neutral
  Payroll: 'bg-warning/10 text-warning', // wage accrued / owed — amber
  Expense: 'bg-error/10 text-error', // cost out — red
  Dividend: 'bg-primary/10 text-primary', // profit distribution — green
  Memo: 'bg-muted text-dimmed' // share-count note — grey
}

/**
 * The pseudo-category the Fee pill filters on — not a {@link LedgerCategory} (a
 * fee is a leg of a Transfer/Expense entry), so it's handled specially by
 * `filterLedgerEntries` / `presentLedger` rather than via {@link categoryOf}.
 */
export const FEE_FILTER = 'Fee'

/** Ledger filter categories shown as pills (in design order). */
export const ledgerCategories: Array<LedgerCategory | 'All' | typeof FEE_FILTER> = [
  'All',
  'Investment',
  'Credit',
  'Revenue',
  'Trading',
  'Transfer',
  'Payroll',
  'Expense',
  'Dividend',
  FEE_FILTER
]

/**
 * The label shown on the "Action" badge (and carried into the ledger exports).
 * Usually the plain {@link categoryOf} name, but the two payroll phases spell out
 * which one it is — `"Payroll: Claim"` for a wage submitted / accrued
 * (`UC-CASH-02`) and `"Payroll: Withdraw"` for one actually paid out
 * (`UC-CASH-03`) — so the journal reads clearly instead of a bare "Payroll" for
 * both. The filter pills and badge colour still key off {@link categoryOf}, so the
 * "Payroll" filter keeps gathering both phases.
 */
export function categoryLabelOf(entry: LedgerEntry): string {
  if (entry.useCase === 'UC-CASH-02') return 'Payroll: Claim'
  if (entry.useCase === 'UC-CASH-03') return 'Payroll: Withdraw'
  return categoryOf(entry)
}

/** The display category a ledger entry falls under, from its use case. */
export function categoryOf(entry: LedgerEntry): LedgerCategory {
  const byUseCase: Partial<Record<UseCase, LedgerCategory>> = {
    'UC-BANK-01': 'Investment',
    'UC-SDR-01': 'Investment',
    'UC-MEMBER-01': 'Investment',
    'UC-CREDIT-01': 'Credit',
    'UC-CREDIT-03': 'Credit',
    'UC-CREDIT-04': 'Credit',
    'UC-CREDIT-05': 'Credit',
    'UC-BANK-02': 'Revenue',
    'CASH-IN': 'Revenue',
    'UC-CASH-02': 'Payroll',
    'UC-CASH-03': 'Payroll',
    'UC-EXP-01': 'Expense',
    'CASH-OUT': 'Expense',
    'UC-INV-01': 'Dividend',
    'DEFAULT-D': 'Investment',
    'UC-VEST-01': 'Investment',
    'UC-VEST-02': 'Investment',
    'UC-VEST-03': 'Investment',
    FEE: 'Expense',
    INTERNAL: 'Transfer',
    'UC-BANK-03': 'Transfer',
    // The funded-offer sweep is Credit → Bank: an internal move, not a credit event.
    'UC-CREDIT-02': 'Transfer'
  }
  return byUseCase[entry.useCase] ?? 'Transfer'
}

/**
 * Credit is the one category whose entries move money in **opposite directions** —
 * a loan comes in, a repayment goes out — so each phase of the borrowing lifecycle
 * gets its own badge colour instead of all three sharing the category teal. The
 * "Credit" filter pill still gathers them all; only the colour differs, and the
 * "Transaction" column already spells the phase out in words, so nothing is
 * conveyed by colour alone.
 *
 * (`UC-CREDIT-02`, the funded-offer sweep to Bank, is a Transfer — not here.)
 */
const CREDIT_BADGE: Partial<Record<UseCase, string>> = {
  // Money borrowed in, liability created — the category's teal.
  'UC-CREDIT-01': 'bg-accent/10 text-accent',
  // Debt settled, cash out (principal and fixed return alike) — violet, so a
  // repayment can never be mistaken for a fresh loan on a busy journal page.
  'UC-CREDIT-03': 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  // The fixed return owed to the lenders but not yet paid: the same violet as the
  // repayment it anticipates, outlined instead of filled because no cash moved.
  'UC-CREDIT-05':
    'text-violet-600 ring-1 ring-violet-500/40 dark:text-violet-400 dark:ring-violet-400/40',
  // The offer missed its target and the deposit went straight back — slate, an
  // unwind rather than a real borrowing event.
  'UC-CREDIT-04': 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
}

/**
 * Badge classes for a ledger entry's "Action" pill. Normally one colour per
 * category, but two categories split by lifecycle phase: the payroll use cases,
 * so the journal shows at a glance whether a wage was merely **accrued**
 * (submitted, still owed — amber) or **settled** (withdrawn, actually paid out),
 * and the credit ones (see {@link CREDIT_BADGE}).
 */
export function badgeClassOf(entry: LedgerEntry): string {
  // A settled wage (UC-CASH-03 — withdrawn / actually paid out) reads as cyan,
  // distinct from a wage merely accrued (UC-CASH-02 — submitted, still owed),
  // which keeps the category's amber. Every other entry takes its category colour.
  if (entry.useCase === 'UC-CASH-03') return 'bg-accent/10 text-accent'
  return CREDIT_BADGE[entry.useCase] ?? CATEGORY_BADGE[categoryOf(entry)]
}

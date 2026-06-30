/**
 * General-ledger (journal) presentation — maps the consolidated {@link LedgerEntry}
 * feed into the rows the ledger table renders, with category badges and a
 * category/date filter. Split from {@link ./presenter} (which handles the
 * statement-level views) to keep each module focused. Pure and unit-testable.
 */
import { money, fmtDateTime, filterByPeriod } from './presenter'
import { describeEntry, entryLabel, type NameResolver } from './describeEntry'
import type { LedgerEntry, UseCase } from './ledgerEntry'

export type LedgerCategory =
  | 'Investment'
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
  Revenue: 'bg-success/10 text-success', // income earned — green
  Trading: 'bg-info/10 text-info', // market activity — cyan
  Transfer: 'bg-neutral/10 text-neutral', // internal move — neutral
  Payroll: 'bg-warning/10 text-warning', // wage accrued / owed — amber
  Expense: 'bg-error/10 text-error', // cost out — red
  Dividend: 'bg-primary/10 text-primary', // profit distribution — green
  Memo: 'bg-muted text-dimmed' // share-count note — grey
}

/** Ledger filter categories shown as pills (in design order). */
export const ledgerCategories: Array<LedgerCategory | 'All'> = [
  'All',
  'Investment',
  'Revenue',
  'Trading',
  'Transfer',
  'Payroll',
  'Expense',
  'Dividend'
]

export interface LedgerRow {
  isFirst: boolean
  date: string
  /** The generic accounting-entry label (the "Transaction" column), e.g. "Wage accrual". */
  label: string
  /** The human-readable narration (the "Activity" column), e.g. "Georges submitted 16h". */
  activity: string
  cat: LedgerCategory | ''
  catClass: string
  account: string
  accountMuted: boolean
  accountDimmed: boolean
  dr: string
  cr: string
}

export interface LedgerView {
  rows: LedgerRow[]
  total: string
  entryCount: number
}

/**
 * Badge classes for a ledger entry's "Action" pill. Normally one colour per
 * category, but the two payroll use cases are split so the journal shows at a
 * glance whether a wage was merely **accrued** (submitted, still owed — amber)
 * or **settled** (withdrawn, actually paid out — green).
 */
export function badgeClassOf(entry: LedgerEntry): string {
  // A settled wage (UC-CASH-03 — withdrawn / actually paid out) reads as cyan,
  // distinct from a wage merely accrued (UC-CASH-02 — submitted, still owed),
  // which keeps the category's amber. Every other entry takes its category colour.
  if (entry.useCase === 'UC-CASH-03') return 'bg-accent/10 text-accent'
  return CATEGORY_BADGE[categoryOf(entry)]
}

/** The display category a ledger entry falls under, from its use case. */
export function categoryOf(entry: LedgerEntry): LedgerCategory {
  const byUseCase: Partial<Record<UseCase, LedgerCategory>> = {
    'UC-BANK-01': 'Investment',
    'UC-SDR-01': 'Investment',
    'UC-MEMBER-01': 'Investment',
    'UC-BANK-02': 'Revenue',
    'CASH-IN': 'Revenue',
    'UC-CASH-02': 'Payroll',
    'UC-CASH-03': 'Payroll',
    'UC-EXP-01': 'Expense',
    'CASH-OUT': 'Expense',
    'UC-INV-01': 'Dividend',
    'DEFAULT-D': 'Memo',
    FEE: 'Transfer',
    INTERNAL: 'Transfer',
    'UC-BANK-03': 'Transfer'
  }
  return byUseCase[entry.useCase] ?? 'Transfer'
}

/** The two journal-line rows (debit then credit) a posting renders as. */
function rowsOf(entry: LedgerEntry, nameOf?: NameResolver): LedgerRow[] {
  const cat = categoryOf(entry)
  const head = {
    isFirst: true,
    date: fmtDateTime(entry.timestamp),
    label: entryLabel(entry),
    activity: nameOf ? describeEntry(entry, nameOf) : '',
    cat,
    catClass: badgeClassOf(entry)
  }
  // Memo-only posting (Default-D): a single dimmed share-count line, no money.
  if (!entry.debit && !entry.credit) {
    const account = entry.shares ? `+${entry.shares} SHER (memo)` : 'Memo'
    return [{ ...head, account, accountMuted: false, accountDimmed: true, dr: '', cr: '' }]
  }
  const rows: LedgerRow[] = []
  if (entry.debit) {
    rows.push({
      ...head,
      account: entry.debit,
      accountMuted: false,
      accountDimmed: false,
      dr: money(entry.amountUsd),
      cr: ''
    })
  }
  if (entry.credit) {
    const lead = rows.length === 0
    rows.push({
      isFirst: lead,
      date: lead ? head.date : '',
      label: lead ? head.label : '',
      activity: lead ? head.activity : '',
      cat: lead ? cat : '',
      catClass: lead ? head.catClass : '',
      account: entry.credit,
      accountMuted: true,
      accountDimmed: false,
      dr: '',
      cr: money(entry.amountUsd)
    })
  }
  return rows
}

/**
 * The ledger entries narrowed by category + inclusive date window, sorted
 * chronologically. Split out so a paginated view can slice by **entry** (not by
 * row — a posting spans two rows) before flattening into table rows.
 */
export function filterLedgerEntries(
  entries: readonly LedgerEntry[],
  filter: string,
  from?: Date | null,
  to?: Date | null
): LedgerEntry[] {
  return filterByPeriod(entries, from, to)
    .filter((e) => filter === 'All' || categoryOf(e) === filter)
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp) // most recent first
}

/** Flatten postings into the table's two-rows-per-entry shape. */
export function ledgerRows(entries: readonly LedgerEntry[], nameOf?: NameResolver): LedgerRow[] {
  return entries.flatMap((entry) => rowsOf(entry, nameOf))
}

/** Σ of the debit legs — the "Total movements" figure, formatted as USD. */
export function ledgerTotal(entries: readonly LedgerEntry[]): string {
  return money(entries.reduce((sum, e) => sum + (e.debit ? e.amountUsd : 0), 0))
}

/** General-ledger rows narrowed by category + inclusive date window. */
export function presentLedger(
  entries: readonly LedgerEntry[],
  filter: string,
  from?: Date | null,
  to?: Date | null,
  nameOf?: NameResolver
): LedgerView {
  const shown = filterLedgerEntries(entries, filter, from, to)
  return { rows: ledgerRows(shown, nameOf), total: ledgerTotal(shown), entryCount: shown.length }
}

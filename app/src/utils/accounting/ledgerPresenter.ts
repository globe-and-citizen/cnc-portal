/**
 * General-ledger (journal) presentation — maps the consolidated {@link LedgerEntry}
 * feed into the rows the ledger table renders, with category badges and a
 * category/date filter. Split from {@link ./presenter} (which handles the
 * statement-level views) to keep each module focused. Pure and unit-testable.
 */
import { money, fmtDateTime, filterByPeriod, periodLabel, currencySymbol } from './presenter'
import { wholeTokenAmount } from './toUsd'
import { activityOf, entryLabel, type ActivityCell } from './describeEntry'
import type { LedgerEntry, UseCase } from './ledgerEntry'

/** The empty activity carried by a posting's continuation (credit) and total rows. */
const NO_ACTIVITY: ActivityCell = { kind: 'plain', text: '' }

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

/** The toggleable ledger table columns (keys match the table's cell slots). */
export type LedgerColumnKey =
  | 'date'
  | 'action'
  | 'transaction'
  | 'activity'
  | 'account'
  | 'dr'
  | 'cr'
  | 'currency'
  | 'quantity'
  | 'rate'

/** A ledger column as rendered in the selector and the exports. */
export type LedgerColumn = { value: LedgerColumnKey; label: string }

/**
 * Ledger columns as `{ value, label }`, for the show/hide-columns selector.
 * Devise / Quantité / Taux (spec §2) trail the USD debit/credit so each posting
 * reads "$ moved · native currency · quantity · rate of record".
 */
export const LEDGER_COLUMNS: ReadonlyArray<LedgerColumn> = [
  { value: 'date', label: 'Date' },
  { value: 'action', label: 'Action' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'activity', label: 'Activity' },
  { value: 'account', label: 'Account' },
  { value: 'dr', label: 'Debit' },
  { value: 'cr', label: 'Credit' },
  { value: 'currency', label: 'Currency' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'rate', label: 'Rate' }
]

/**
 * The visible ledger columns for an export, in canonical order — an empty or
 * absent selection means "all columns". Shared by the PDF and Excel exporters so
 * both honour the same order regardless of the order columns were toggled.
 */
export function resolveLedgerColumns(columns?: readonly LedgerColumnKey[]): LedgerColumn[] {
  const visible = columns && columns.length ? columns : LEDGER_COLUMNS.map((c) => c.value)
  return LEDGER_COLUMNS.filter((c) => visible.includes(c.value))
}

/**
 * The trailing "Total movements" row for an exported ledger, mirroring the
 * on-screen footer: the grand total in the Debit and Credit columns — as the
 * caller's already-rendered `amount` (a `$`-string for the PDF, a number for
 * Excel) — with the label in the Transaction column, or the first non-amount
 * column when Transaction is hidden.
 */
export function ledgerTotalRow(
  cols: readonly LedgerColumn[],
  amount: string | number
): (string | number)[] {
  const labelKey = cols.some((c) => c.value === 'transaction')
    ? 'transaction'
    : cols.find((c) => c.value !== 'dr' && c.value !== 'cr')?.value
  return cols.map((c) => {
    if (c.value === 'dr' || c.value === 'cr') return amount
    if (c.value === labelKey) return 'Total movements'
    return ''
  })
}

export interface LedgerRow {
  isFirst: boolean
  date: string
  /** The generic accounting-entry label (the "Transaction" column), e.g. "Wage accrual". */
  label: string
  /** The structured narration (the "Activity" column) — avatar(s) + predicate. */
  activity: ActivityCell
  cat: LedgerCategory | ''
  catClass: string
  account: string
  accountMuted: boolean
  accountDimmed: boolean
  dr: string
  cr: string
  /** The posting's currency (spec §2 "Devise"), e.g. `POL` / `USDC`. */
  currency: string
  /** Whole-token quantity moved (spec §2 "Quantité"), 6-dp, e.g. `0.070352`. */
  quantity: string
  /** USD rate of record (spec §2 "Taux"), 6-dp, e.g. `$0.080000` / `$1.000000`. */
  rate: string
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
    // The Bank protocol fee is a real cost leaving the treasury (booked as
    // Transaction Fee Expense), so it reads as an Expense — red badge, filterable
    // under the Expense pill — not a neutral internal Transfer.
    FEE: 'Expense',
    INTERNAL: 'Transfer',
    'UC-BANK-03': 'Transfer'
  }
  return byUseCase[entry.useCase] ?? 'Transfer'
}

/** Safe base-unit → whole-token parse (tolerates a malformed raw amount). */
function safeWholeAmount(entry: LedgerEntry): number {
  try {
    return wholeTokenAmount(BigInt(entry.rawAmount), entry.token)
  } catch {
    return 0
  }
}

/** The posting's Quantité — whole-token amount at 6-dp, e.g. `0.070352`. */
function quantityLabel(entry: LedgerEntry): string {
  return safeWholeAmount(entry).toLocaleString('en-US', { maximumFractionDigits: 6 })
}

/** The posting's Taux — USD rate of record at 6-dp, e.g. `$0.080000`; blank if unset. */
function rateLabel(entry: LedgerEntry): string {
  if (entry.rate == null) return ''
  return (
    '$' + entry.rate.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })
  )
}

/** The two journal-line rows (debit then credit) a posting renders as. */
function rowsOf(entry: LedgerEntry): LedgerRow[] {
  const cat = categoryOf(entry)
  const head = {
    isFirst: true,
    date: fmtDateTime(entry.timestamp),
    label: entryLabel(entry),
    activity: activityOf(entry),
    cat,
    catClass: badgeClassOf(entry),
    // Devise / Quantité / Taux — the same token move backs both legs of a posting,
    // so they are shown once on the lead row (blank on the credit continuation).
    currency: currencySymbol(entry.token),
    quantity: quantityLabel(entry),
    rate: rateLabel(entry)
  }
  const blankMovement = { currency: '', quantity: '', rate: '' }
  // Memo-only posting (Default-D): a single dimmed share-count line, no money.
  if (!entry.debit && !entry.credit) {
    const account = entry.shares ? `+${entry.shares} SHER (memo)` : 'Memo'
    return [
      {
        ...head,
        ...blankMovement,
        account,
        accountMuted: false,
        accountDimmed: true,
        dr: '',
        cr: ''
      }
    ]
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
      activity: lead ? head.activity : NO_ACTIVITY,
      cat: lead ? cat : '',
      catClass: lead ? head.catClass : '',
      account: entry.credit,
      accountMuted: true,
      accountDimmed: false,
      dr: '',
      cr: money(entry.amountUsd),
      // Movement details lead the posting; the credit continuation leaves them blank.
      ...(lead
        ? { currency: head.currency, quantity: head.quantity, rate: head.rate }
        : blankMovement)
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
export function ledgerRows(entries: readonly LedgerEntry[]): LedgerRow[] {
  return entries.flatMap((entry) => rowsOf(entry))
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
  to?: Date | null
): LedgerView {
  const shown = filterLedgerEntries(entries, filter, from, to)
  return { rows: ledgerRows(shown), total: ledgerTotal(shown), entryCount: shown.length }
}

/**
 * The heading a ledger export prints, spelling out the active scope so the file
 * is self-describing: the category (when narrowed from "All") and the reporting
 * period (when a date range is set). Plain `"General Ledger"` for the whole book.
 */
export function ledgerExportTitle(filter?: string, from?: Date | null, to?: Date | null): string {
  const parts = ['General Ledger']
  if (filter && filter !== 'All') parts.push(filter)
  if (from || to) parts.push(periodLabel(from, to))
  return parts.join(' — ')
}

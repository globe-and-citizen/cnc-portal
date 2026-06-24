/**
 * General-ledger (journal) presentation — maps the consolidated {@link LedgerEntry}
 * feed into the rows the ledger table renders, with category badges and a
 * category/date filter. Split from {@link ./presenter} (which handles the
 * statement-level views) to keep each module focused. Pure and unit-testable.
 */
import { money, fmtDate, filterByPeriod } from './presenter'
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

/** Soft badge classes per ledger category (static strings so Tailwind keeps them). */
export const CATEGORY_BADGE: Record<LedgerCategory, string> = {
  Investment: 'bg-primary/10 text-primary',
  Revenue: 'bg-success/10 text-success',
  Trading: 'bg-info/10 text-info',
  Transfer: 'bg-muted text-muted',
  Payroll: 'bg-warning/10 text-warning',
  Expense: 'bg-error/10 text-error',
  Dividend: 'bg-warning/10 text-warning',
  Memo: 'bg-muted text-dimmed'
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
  label: string
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
 * Normalized accounting-entry label per use case — shown in the ledger's
 * "Transaction" column instead of the raw event memo, so each row reads as the
 * journal entry it realises (catalogue §5 / spec §4).
 */
const ENTRY_LABEL: Record<UseCase, string> = {
  'UC-BANK-01': 'Owner capital contribution',
  'UC-BANK-02': 'Service revenue',
  'UC-BANK-03': 'Treasury funding',
  'UC-SDR-01': 'Investor contribution',
  'UC-CASH-03': 'Wage settlement',
  'UC-EXP-01': 'Operating expense',
  'UC-INV-01': 'Dividend paid',
  'DEFAULT-D': 'Share issuance',
  FEE: 'Protocol fee',
  INTERNAL: 'Internal transfer',
  'CASH-IN': 'Cash receipt',
  'CASH-OUT': 'Cash payment'
}

/** The accounting-entry label a ledger row shows (falls back to the memo). */
export function entryLabel(entry: LedgerEntry): string {
  return ENTRY_LABEL[entry.useCase] ?? entry.memo
}

/** The display category a ledger entry falls under, from its use case. */
export function categoryOf(entry: LedgerEntry): LedgerCategory {
  const byUseCase: Partial<Record<UseCase, LedgerCategory>> = {
    'UC-BANK-01': 'Investment',
    'UC-SDR-01': 'Investment',
    'UC-BANK-02': 'Revenue',
    'CASH-IN': 'Revenue',
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
function rowsOf(entry: LedgerEntry): LedgerRow[] {
  const cat = categoryOf(entry)
  const head = {
    isFirst: true,
    date: fmtDate(entry.timestamp),
    label: entryLabel(entry),
    cat,
    catClass: CATEGORY_BADGE[cat]
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
    .sort((a, b) => a.timestamp - b.timestamp)
}

/** Flatten postings into the table's two-rows-per-entry shape. */
export function ledgerRows(entries: readonly LedgerEntry[]): LedgerRow[] {
  return entries.flatMap(rowsOf)
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

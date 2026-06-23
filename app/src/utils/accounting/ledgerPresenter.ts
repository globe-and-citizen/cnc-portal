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
    label: entry.memo,
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

/** General-ledger rows narrowed by category + inclusive date window. */
export function presentLedger(
  entries: readonly LedgerEntry[],
  filter: string,
  from?: Date | null,
  to?: Date | null
): LedgerView {
  const shown = filterByPeriod(entries, from, to)
    .filter((e) => filter === 'All' || categoryOf(e) === filter)
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
  const rows = shown.flatMap(rowsOf)
  const total = shown.reduce((sum, e) => sum + (e.debit ? e.amountUsd : 0), 0)
  return { rows, total: money(total), entryCount: shown.length }
}

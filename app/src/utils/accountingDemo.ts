/**
 * Pure derivations for the Accounting view: formatters, badge tone maps, and
 * the income-statement / balance-sheet / trial-balance / ledger figures
 * derived from the static journal in {@link ./accountingEntries}.
 */
import dayjs from 'dayjs'
import {
  entries,
  trial,
  type JournalEntry,
  type LedgerCategory,
  type TrialNature
} from './accountingEntries'

export type {
  AccountingTone,
  LedgerCategory,
  JournalLine,
  JournalEntry,
  TrialNature,
  TrialAccount
} from './accountingEntries'

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

/** Soft badge classes per trial-balance account nature. */
export const NATURE_BADGE: Record<TrialNature, string> = {
  Asset: 'bg-info/10 text-info',
  Equity: 'bg-primary/10 text-primary',
  Income: 'bg-success/10 text-success',
  Liability: 'bg-muted text-muted',
  Expense: 'bg-error/10 text-error'
}

/** `142.2` → `$142.20`. */
export function money(n: number): string {
  return (
    '$' +
    Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  )
}

/** `2026-01-08` → `Jan 8, 2026` (matches the dashboard ledger date style). */
export function fmtDate(iso: string): string {
  return dayjs(iso).format('MMM D, YYYY')
}

interface StatementLine {
  label: string
  value: string
}

export const revLines: StatementLine[] = [
  { label: 'Service Revenue', value: money(100) },
  { label: 'Trading Gain', value: money(15) }
]
export const expLines: StatementLine[] = [
  { label: 'Payroll Expense', value: money(50.8) },
  { label: 'Operating Expense', value: money(20) },
  { label: 'Trading Loss', value: money(20) },
  { label: 'Dividend Expense', value: money(20) }
]
export const totalRevenue = money(115)
export const totalExpenses = money(110.8)
export const netIncome = money(4.2)

export const assetLines: StatementLine[] = [
  { label: 'Cash (USDC + POL)', value: money(142.2) },
  { label: 'Trading account (at cost)', value: money(0) }
]
export const liabLines: StatementLine[] = [{ label: 'None (no debt)', value: money(0) }]
export const equityLines: StatementLine[] = [
  { label: 'Owner capital', value: money(0) },
  { label: 'Investor equity (SHER)', value: money(138) },
  { label: 'Retained earnings (net profit)', value: money(4.2) }
]
export const totalAssets = money(142.2)
export const totalEquity = money(142.2)

export interface SummaryCard {
  label: string
  value: string
  valueClass: string
  sub: string
  icon: string
  chipClass: string
  accent: boolean
  trend?: string
}

export const summaryCards: SummaryCard[] = [
  {
    label: 'Net income',
    value: netIncome,
    valueClass: 'text-primary',
    sub: 'Profit · revenue − expenses',
    icon: 'i-heroicons-sparkles',
    chipClass: 'bg-primary/10 text-primary',
    accent: true,
    trend: 'Profit'
  },
  {
    label: 'Total revenue',
    value: totalRevenue,
    valueClass: 'text-highlighted',
    sub: 'Service + trading gain',
    icon: 'i-heroicons-arrow-trending-up',
    chipClass: 'bg-success/10 text-success',
    accent: false
  },
  {
    label: 'Total expenses',
    value: totalExpenses,
    valueClass: 'text-highlighted',
    sub: 'Payroll · ops · trading · dividend',
    icon: 'i-heroicons-arrow-trending-down',
    chipClass: 'bg-warning/10 text-warning',
    accent: false
  },
  {
    label: 'Total assets',
    value: totalAssets,
    valueClass: 'text-highlighted',
    sub: 'Cash + trading account',
    icon: 'i-heroicons-wallet',
    chipClass: 'bg-info/10 text-info',
    accent: false
  },
  {
    label: 'Total equity',
    value: totalEquity,
    valueClass: 'text-highlighted',
    sub: 'Investors + retained earnings',
    icon: 'i-heroicons-user-group',
    chipClass: 'bg-primary/10 text-primary',
    accent: false
  }
]

export interface TrialRow {
  account: string
  nature: TrialNature
  natureClass: string
  dr: string
  cr: string
  drMuted: boolean
  crMuted: boolean
}

export const trialRows: TrialRow[] = trial.map((t) => ({
  account: t.account,
  nature: t.nature,
  natureClass: NATURE_BADGE[t.nature],
  dr: t.dr !== undefined ? money(t.dr) : '—',
  cr: t.cr !== undefined ? money(t.cr) : '—',
  drMuted: !(t.dr !== undefined && t.dr > 0),
  crMuted: !(t.cr !== undefined && t.cr > 0)
}))

export const trialTotal = money(253)

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

const allDates = entries.map((e) => e.date).sort()
export const dateMin = allDates[0] ?? '2026-01-01'
export const dateMax = allDates[allDates.length - 1] ?? '2026-12-31'

/** Entries narrowed by category + inclusive date window. */
function shownEntries(filter: string, from: string, to: string): JournalEntry[] {
  return entries
    .filter((e) => filter === 'All' || e.cat === filter)
    .filter((e) => e.date >= from && e.date <= to)
}

/** Flatten filtered entries into one ledger row per journal line. */
export function buildLedger(
  filter: string,
  from: string,
  to: string
): { rows: LedgerRow[]; total: string; entryCount: number } {
  const shown = shownEntries(filter, from || dateMin, to || dateMax)
  const rows: LedgerRow[] = []
  shown.forEach((e) => {
    e.lines.forEach((ln, i) => {
      const first = i === 0
      rows.push({
        isFirst: first,
        date: first ? fmtDate(e.date) : '',
        label: first ? e.label : '',
        cat: first ? e.cat : '',
        catClass: CATEGORY_BADGE[e.cat],
        account: ln.a,
        accountMuted: ln.cr !== undefined && !ln.memo,
        accountDimmed: !!ln.memo,
        dr: ln.dr !== undefined ? money(ln.dr) : '',
        cr: ln.cr !== undefined ? money(ln.cr) : ''
      })
    })
  })
  const total = money(shown.reduce((s, e) => s + e.lines.reduce((a, l) => a + (l.dr || 0), 0), 0))
  return { rows, total, entryCount: shown.length }
}

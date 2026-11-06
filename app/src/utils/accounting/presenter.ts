import type { AccountClass, AccountName } from './chartOfAccounts'
import { buildGeneralLedger } from './generalLedger'
import { buildIncomeStatement } from './incomeStatement'
import { buildBalanceSheet } from './balanceSheet'
import { NETWORK } from '@/constant'
import type { AssetId, AssetMetadata } from '@/utils/tokens/assets'
import { formatDate, formatDateTime, formatUsd, fromUnix } from '@/utils/format'
import { usdAmountToNumber, ZERO_USD_AMOUNT } from './monetaryAmount'
import type { Account, BalanceSheet, JournalEntry, UsdAmount } from './types'

import { buildSummaryView, type SummaryView } from './summaryCards'

// The summary display model lives in its own module — see ./summaryCards.
export { type SummaryBanner, type SummaryCard, type SummaryView } from './summaryCards'

type TrialNature = 'Asset' | 'Equity' | 'Contra-equity' | 'Income' | 'Liability' | 'Expense'

/** Soft badge classes per trial-balance account nature. */
const NATURE_BADGE: Record<TrialNature, string> = {
  Asset: 'bg-info/10 text-info',
  Equity: 'bg-primary/10 text-primary',
  'Contra-equity': 'bg-primary/10 text-primary',
  Income: 'bg-success/10 text-success',
  Liability: 'bg-muted text-muted',
  Expense: 'bg-error/10 text-error'
}

/**
 * `142.2` → `$142.20`. A sub-cent residue that rounds to zero (e.g. `−0.004`, or
 * JS negative zero) is collapsed to a clean `$0.00` — never the misleading
 * `$-0.00` that a hand-rolled currency formatter can emit for `−0`.
 */
export function money(amountUsd: number | UsdAmount): string {
  return formatUsd(typeof amountUsd === 'bigint' ? usdAmountToNumber(amountUsd) : amountUsd)
}

/** Unix-seconds → `Jan 8, 2026` (matches the dashboard ledger date style). */
export function formatUnixDate(timestamp: number): string {
  return formatDate(fromUnix(timestamp))
}

/**
 * Unix-seconds → `Jan 8, 2026, 14:05:32` — date **with time of day**, so the
 * ledger retains per-second event precision (events in the same day stay
 * distinguishable and read in true chronological order).
 */
export function formatUnixDateTime(timestamp: number): string {
  return formatDateTime(fromUnix(timestamp))
}

// ── Display shapes ──────────────────────────────────────────────────────────

export interface StatementLineView {
  label: string
  value: string
  account?: Account | AccountName
  accounts?: AccountName[]
}

interface TrialRow {
  /** Canonical concrete account for drill-down and reconciliation. */
  account: Account
  /** Display name — the account, suffixed ` #2` / ` #3` for a redeployed pocket's later instances. */
  label: string
  /** True when this account is split across several instances (a redeploy) — drives the redeploy hint. */
  split: boolean
  /** True on the earliest resolved deployment row, used only for display. */
  isPrimaryInstance: boolean
  nature: TrialNature
  natureClass: string
  dr: string
  cr: string
  drMuted: boolean
  crMuted: boolean
}

interface IncomeView {
  revenueLines: StatementLineView[]
  expenseLines: StatementLineView[]
  totalRevenue: string
  totalExpenses: string
  netIncome: string
  netNegative: boolean
}

interface BalanceView {
  assetLines: BalanceLineView[]
  liabilityLines: BalanceLineView[]
  equityLines: BalanceLineView[]
  earningsLines: BalanceLineView[]
  totalAssets: string
  totalLiabilities: string
  earningsToDate: string
  totalEquity: string
  liabilitiesPlusEquity: string
}

export interface BalanceLineView extends StatementLineView {
  nature: TrialNature
  natureClass: string
}

/** The trial-balance "nature" label for an account class. */
function natureOf(account: Account): TrialNature {
  const byClass: Record<AccountClass, TrialNature> = {
    ASSET: 'Asset',
    LIABILITY: 'Liability',
    EQUITY: 'Equity',
    CONTRA_EQUITY: 'Contra-equity',
    INCOME: 'Income',
    EXPENSE: 'Expense'
  }
  return byClass[account.family.accountClass]
}

/**
 * Human label for a reporting period, e.g. `"All time"`, `"Jan 1, 2026 – Feb 1,
 * 2026"`, `"From Jan 1, 2026"`. Used in the ledger export context line.
 */
export function periodLabel(from?: Date | null, to?: Date | null): string {
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`
  if (from) return `From ${formatDate(from)}`
  if (to) return `Until ${formatDate(to)}`
  return 'All time'
}

/**
 * The span of activity a set of books records, e.g. `"Activity Dec 21, 2025 – Oct 4, 2026"`,
 * so an unfiltered export still says which period it covers. Empty books have none.
 */
export function activityCoverageLabel(entries: readonly { timestamp: number }[]): string | null {
  if (!entries.length) return null
  const timestamps = entries.map((entry) => entry.timestamp)
  const first = fromUnix(Math.min(...timestamps)).toDate()
  const last = fromUnix(Math.max(...timestamps)).toDate()
  return `Activity ${periodLabel(first, last)}`
}

/** A single calendar day at day granularity, e.g. `"Jul 8, 2026"`. */
export function dayLabel(date: Date): string {
  return formatDate(date)
}

/**
 * The headings the statement exports (PDF page / Excel title row) print, spelling
 * out the active reporting scope so a printed page is self-describing — mirroring
 * the General Ledger export title. The plain base name alone for the whole book, with
 * the selected period / "as of" date appended when the page has one set.
 */
export function incomeExportTitle(from?: Date | null, to?: Date | null): string {
  return from || to ? `Income Statement — ${periodLabel(from, to)}` : 'Income Statement'
}

export function summaryExportTitle(from?: Date | null, to?: Date | null): string {
  return from || to ? `Summary — ${periodLabel(from, to)}` : 'Summary'
}

export function balanceExportTitle(asOf?: Date | null): string {
  return asOf ? `Balance Sheet — As of ${dayLabel(asOf)}` : 'Balance Sheet'
}

export function trialExportTitle(asOf?: Date | null): string {
  return asOf ? `Trial Balance — As of ${dayLabel(asOf)}` : 'Trial Balance'
}

/** Keep entries inside an inclusive `[from, to]` window (nullish bound = open). */
export function filterByPeriod<T extends { timestamp: number }>(
  entries: readonly T[],
  from?: Date | null,
  to?: Date | null
): T[] {
  const fromS = from ? Math.floor(from.getTime() / 1000) : -Infinity
  const toS = to ? Math.floor(to.getTime() / 1000) : Infinity
  return entries.filter((entry) => entry.timestamp >= fromS && entry.timestamp <= toS)
}

// ── Presenters ──────────────────────────────────────────────────────────────

/** Summary figures: flows inside `[from, to]`, balances accumulated up to `to`. */
export function presentSummary(
  entries: readonly JournalEntry[],
  from?: Date | null,
  to?: Date | null
): SummaryView {
  return buildSummaryView(filterByPeriod(entries, from, to), filterByPeriod(entries, null, to))
}

/** Income-statement lines for a reporting period. */
export function presentIncome(
  entries: readonly JournalEntry[],
  from?: Date | null,
  to?: Date | null
): IncomeView {
  const income = buildIncomeStatement(filterByPeriod(entries, from, to))
  return {
    revenueLines: income.revenue.map((line) => ({
      label: line.account,
      value: money(line.amount),
      account: line.account
    })),
    expenseLines: income.expenses.map((line) => ({
      label: line.account,
      value: money(line.amount),
      account: line.account
    })),
    totalRevenue: money(income.totalRevenue),
    totalExpenses: money(income.totalExpenses),
    netIncome: money(income.netIncome),
    netNegative: income.netIncome < 0n
  }
}

/** Ledger token id → display symbol (native uses the chain's currency symbol). */
export function currencySymbol(token: AssetId, asset?: AssetMetadata): string {
  if (token.startsWith('erc20:')) return asset?.symbol ?? token
  if (token === 'native') return NETWORK.currencySymbol || 'POL'
  if (token === 'usdc.e') return 'USDC.e'
  return token.toUpperCase() // usdc → USDC, usdt → USDT, sher → SHER
}

/** Balance-sheet lines as of a point in time. */
export function presentBalance(entries: readonly JournalEntry[], asOf?: Date | null): BalanceView {
  const scoped = filterByPeriod(entries, null, asOf)
  const balance = buildBalanceSheet(scoped)
  const presentLine = (line: BalanceSheet['assets'][number]): BalanceLineView => {
    const nature = natureOf(line.account)
    return {
      label: line.accountLabel,
      value: money(line.contribution),
      account: line.account,
      nature,
      natureClass: NATURE_BADGE[nature]
    }
  }
  const earningsAccounts = [...new Set(balance.earnings.map((line) => line.account.family.name))]
  const equityLines: BalanceLineView[] = [
    ...balance.equity.map(presentLine),
    {
      label: 'Earnings to date',
      value: money(balance.earningsToDate),
      accounts: earningsAccounts,
      nature: 'Equity',
      natureClass: NATURE_BADGE.Equity
    }
  ]
  return {
    assetLines: balance.assets.map(presentLine),
    liabilityLines: balance.liabilities.map(presentLine),
    equityLines,
    earningsLines: balance.earnings.map(presentLine),
    totalAssets: money(balance.totalAssets),
    totalLiabilities: money(balance.totalLiabilities),
    earningsToDate: money(balance.earningsToDate),
    totalEquity: money(balance.totalEquity),
    liabilitiesPlusEquity: money(balance.totalLiabilitiesAndEquity)
  }
}

export type BalanceExportRowKind = 'section' | 'columns' | 'line' | 'total' | 'gap' | 'grandTotal'

export interface BalanceExportRow {
  kind: BalanceExportRowKind
  account: string
  nature: string
  value: string
}

function balanceExportSection(
  title: string,
  lines: readonly BalanceLineView[],
  total: Pick<BalanceExportRow, 'account' | 'value'>,
  valueLabel = 'Balance'
): BalanceExportRow[] {
  return [
    { kind: 'section', account: title, nature: '', value: '' },
    { kind: 'columns', account: 'Account', nature: 'Nature', value: valueLabel },
    ...lines.map(
      (line): BalanceExportRow => ({
        kind: 'line',
        account: line.label,
        nature: line.nature,
        value: line.value
      })
    ),
    { kind: 'total', nature: '', ...total },
    { kind: 'gap', account: '', nature: '', value: '' }
  ]
}

/** The Balance Sheet laid out as on screen, shared by the PDF and Excel exports. */
export function balanceExportRows(balance: BalanceView): BalanceExportRow[] {
  return [
    ...balanceExportSection('Assets', balance.assetLines, {
      account: 'Total assets',
      value: balance.totalAssets
    }),
    ...balanceExportSection('Liabilities', balance.liabilityLines, {
      account: 'Total liabilities',
      value: balance.totalLiabilities
    }),
    ...balanceExportSection('Equity', balance.equityLines, {
      account: 'Total equity',
      value: balance.totalEquity
    }),
    ...balanceExportSection(
      'Earnings to date calculation',
      balance.earningsLines,
      { account: 'Earnings to date', value: balance.earningsToDate },
      'Contribution'
    ),
    {
      kind: 'grandTotal',
      account: 'Liabilities + Equity',
      nature: '',
      value: balance.liabilitiesPlusEquity
    }
  ]
}

/**
 * Build and present the Trial Balance directly from the canonical journal. Each balance sits
 * on the side its debits and credits net to, so it never reads negative: a Swap P&L gain is a
 * credit and a loss a debit. A settled account reads "—" on both sides. Each total adds its
 * own column, so an unbalanced trial shows two different totals.
 */
export function presentTrial(
  entries: readonly JournalEntry[],
  asOf?: Date | null
): {
  rows: TrialRow[]
  totalDebit: string
  totalCredit: string
  balanced: boolean
} {
  const scopedEntries = filterByPeriod(entries, null, asOf)
  const ledger = buildGeneralLedger(scopedEntries)
  const rows: TrialRow[] = ledger.trialBalance.map((row) => {
    const net = row.totalDebit - row.totalCredit
    const debitSide = net > ZERO_USD_AMOUNT
    const creditSide = net < ZERO_USD_AMOUNT
    return {
      account: row.account,
      label: row.accountLabel,
      split: row.split,
      // The primary row is the earliest resolved deployment, for display only.
      isPrimaryInstance: row.isPrimaryInstance,
      nature: natureOf(row.account),
      natureClass: NATURE_BADGE[natureOf(row.account)],
      dr: debitSide ? money(net) : '—',
      cr: creditSide ? money(-net) : '—',
      drMuted: !debitSide,
      crMuted: !creditSide
    }
  })
  return {
    rows,
    totalDebit: money(ledger.debitBalanceTotal),
    totalCredit: money(ledger.creditBalanceTotal),
    balanced: ledger.balanced
  }
}

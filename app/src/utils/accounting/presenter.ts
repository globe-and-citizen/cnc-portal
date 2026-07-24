import dayjs from 'dayjs'
import { classOf, type AccountClass, type AccountName } from './chartOfAccounts'
import type { GeneralLedger } from './generalLedger'
import { buildIncomeStatement, type IncomeStatement } from './incomeStatement'
import { buildBalanceSheet, type BalanceSheet, type CashCurrencyLine } from './balanceSheet'
import type { AccountingSummary } from './buildLedger'
import type { LedgerEntry } from './ledgerEntry'
import { NETWORK, type TokenId } from '@/constant'

/** The breakdown-line fields the display helpers read (subset of {@link CashCurrencyLine}). */
type CashLineData = Pick<CashCurrencyLine, 'token' | 'amountUsd' | 'tokenAmount'>

export type TrialNature = 'Asset' | 'Equity' | 'Income' | 'Liability' | 'Expense'

/** Soft badge classes per trial-balance account nature. */
export const NATURE_BADGE: Record<TrialNature, string> = {
  Asset: 'bg-info/10 text-info',
  Equity: 'bg-primary/10 text-primary',
  Income: 'bg-success/10 text-success',
  Liability: 'bg-muted text-muted',
  Expense: 'bg-error/10 text-error'
}

/**
 * `142.2` → `$142.20`. A sub-cent residue that rounds to zero (e.g. `−0.004`, or
 * JS negative zero) is collapsed to a clean `$0.00` — never the misleading
 * `$-0.00` that `toLocaleString` emits for `−0`.
 */
export function money(n: number): string {
  const cents = Math.round(Number(n) * 100)
  const value = cents === 0 ? 0 : cents / 100
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Unix-seconds → `Jan 8, 2026` (matches the dashboard ledger date style). */
export function fmtDate(timestamp: number): string {
  return dayjs(timestamp * 1000).format('MMM D, YYYY')
}

/**
 * Unix-seconds → `Jan 8, 2026, 14:05:32` — date **with time of day**, so the
 * ledger keeps Ponder's per-second precision (events in the same day stay
 * distinguishable and read in true chronological order).
 */
export function fmtDateTime(timestamp: number): string {
  return dayjs(timestamp * 1000).format('MMM D, YYYY, HH:mm:ss')
}

// ── Display shapes ──────────────────────────────────────────────────────────

export interface StatementLineView {
  label: string
  value: string
  account?: AccountName
  accounts?: AccountName[]
}

export interface SummaryCard {
  label: string
  value: string
  valueClass: string
  sub: string
  icon: string
  chipClass: string
  accent: boolean
  accentClass?: string
  trend?: string
}

export interface SummaryBanner {
  balanced: boolean
  identity: string
  trial: string
}

export interface TrialRow {
  account: string
  nature: TrialNature
  natureClass: string
  dr: string
  cr: string
  drMuted: boolean
  crMuted: boolean
}

export interface IncomeView {
  revLines: StatementLineView[]
  expLines: StatementLineView[]
  totalRevenue: string
  totalExpenses: string
  netIncome: string
  netNegative: boolean
}

export interface BalanceView {
  assetLines: StatementLineView[]
  liabLines: StatementLineView[]
  equityLines: StatementLineView[]
  totalAssets: string
  totalEquity: string
  liabilitiesPlusEquity: string
}

/** The trial-balance "nature" label for an account class. */
function natureOf(account: AccountName): TrialNature {
  const byClass: Record<AccountClass, TrialNature> = {
    ASSET: 'Asset',
    LIABILITY: 'Liability',
    EQUITY: 'Equity',
    INCOME: 'Income',
    EXPENSE: 'Expense'
  }
  return byClass[classOf(account)]
}

/**
 * Human label for a reporting period, e.g. `"All time"`, `"Jan 1, 2026 – Feb 1,
 * 2026"`, `"From Jan 1, 2026"`. Used in the ledger export context line.
 */
export function periodLabel(from?: Date | null, to?: Date | null): string {
  const fmt = (d: Date) => dayjs(d).format('MMM D, YYYY')
  if (from && to) return `${fmt(from)} – ${fmt(to)}`
  if (from) return `From ${fmt(from)}`
  if (to) return `Until ${fmt(to)}`
  return 'All time'
}

/** A single calendar day at day granularity, e.g. `"Jul 8, 2026"`. */
export function dayLabel(date: Date): string {
  return dayjs(date).format('MMM D, YYYY')
}

/**
 * The headings the statement exports (PDF page / Excel title row) print, spelling
 * out the active reporting scope so a printed page is self-describing — mirroring
 * {@link ledgerExportTitle}. The plain base name alone for the whole book, with
 * the selected period / "as of" date appended when the page has one set.
 */
export function incomeExportTitle(from?: Date | null, to?: Date | null): string {
  return from || to ? `Income Statement — ${periodLabel(from, to)}` : 'Income Statement'
}

export function balanceExportTitle(asOf?: Date | null): string {
  return asOf ? `Balance Sheet — As of ${dayLabel(asOf)}` : 'Balance Sheet'
}

export function trialExportTitle(asOf?: Date | null): string {
  return asOf ? `Trial Balance — As of ${dayLabel(asOf)}` : 'Trial Balance'
}

/** Keep entries inside an inclusive `[from, to]` window (nullish bound = open). */
export function filterByPeriod(
  entries: readonly LedgerEntry[],
  from?: Date | null,
  to?: Date | null
): LedgerEntry[] {
  const fromS = from ? Math.floor(from.getTime() / 1000) : -Infinity
  const toS = to ? Math.floor(to.getTime() / 1000) : Infinity
  return entries.filter((e) => e.timestamp >= fromS && e.timestamp <= toS)
}

// ── Presenters ──────────────────────────────────────────────────────────────

/** A secondary metric card (highlighted value, no accent border). */
function metric(
  label: string,
  value: string,
  sub: string,
  icon: string,
  chip: string
): SummaryCard {
  return { label, value, sub, icon, chipClass: chip, valueClass: 'text-highlighted', accent: false }
}

/** The summary metric cards from the live roll-up + statements. */
export function presentSummaryCards(
  summary: AccountingSummary,
  income: IncomeStatement,
  balance: BalanceSheet
): SummaryCard[] {
  const profitable = income.netIncome >= 0
  return [
    {
      label: 'Net income',
      value: money(income.netIncome),
      valueClass: profitable ? 'text-primary' : 'text-error',
      sub: 'Profit · revenue − expenses',
      icon: 'i-heroicons-sparkles',
      chipClass: profitable ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error',
      accent: true,
      accentClass: profitable ? 'border-t-primary' : 'border-t-error',
      ...(profitable ? { trend: 'Profit' } : {})
    },
    metric(
      'Total revenue',
      money(income.totalRevenue),
      'Service + trading gain',
      'i-heroicons-arrow-trending-up',
      'bg-success/10 text-success'
    ),
    metric(
      'Total expenses',
      money(income.totalExpenses),
      'Payroll · ops · trading · dividend',
      'i-heroicons-arrow-trending-down',
      'bg-warning/10 text-warning'
    ),
    metric(
      'Total transaction fees',
      money(summary.transactionFees),
      'Bank protocol fee skimmed on transfers',
      'i-heroicons-receipt-percent',
      'bg-warning/10 text-warning'
    ),
    metric(
      'Total assets',
      money(balance.totalAssets),
      'Cash + trading account',
      'i-heroicons-wallet',
      'bg-info/10 text-info'
    ),
    metric(
      'Total equity',
      money(balance.totalEquity),
      'Investors + retained earnings',
      'i-heroicons-user-group',
      'bg-primary/10 text-primary'
    )
  ]
}

/** The "books are balanced" banner copy from the live statements. */
export function presentBanner(balance: BalanceSheet, ledger: GeneralLedger): SummaryBanner {
  // `totalEquity` is the balancing residual, so the three figures foot exactly.
  return {
    balanced: balance.balanced && ledger.balanced,
    identity: `${money(balance.totalAssets)} = ${money(balance.totalLiabilities)} + ${money(balance.totalEquity)}`,
    trial: `Trial balance Dr ${money(ledger.debitBalanceTotal)} = Cr ${money(ledger.creditBalanceTotal)}`
  }
}

/** Income-statement lines for a reporting period. */
export function presentIncome(
  entries: readonly LedgerEntry[],
  from?: Date | null,
  to?: Date | null
): IncomeView {
  const is = buildIncomeStatement(filterByPeriod(entries, from, to))
  return {
    revLines: is.revenue.map((l) => ({
      label: l.account,
      value: money(l.amount),
      account: l.account
    })),
    expLines: is.expenses.map((l) => ({
      label: l.account,
      value: money(l.amount),
      account: l.account
    })),
    totalRevenue: money(is.totalRevenue),
    totalExpenses: money(is.totalExpenses),
    netIncome: money(is.netIncome),
    netNegative: is.netIncome < 0
  }
}

/** Ledger token id → display symbol (native uses the chain's currency symbol). */
export function currencySymbol(token: TokenId): string {
  if (token === 'native') return NETWORK.currencySymbol || 'POL'
  if (token === 'usdc.e') return 'USDC.e'
  return token.toUpperCase() // usdc → USDC, usdt → USDT, sher → SHER
}

/** Drop the `Cash — ` chart prefix for the compact breakdown label. */
function pocketShortName(account: AccountName): string {
  return account.replace(/^Cash — /, '')
}

/** `12.5` → `12.5 POL`; trims to at most 6 decimals so dust reads cleanly. */
function tokenQuantity(amount: number, token: TokenId): string {
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${currencySymbol(token)}`
}

/**
 * One breakdown line's display value. A stablecoin shows its USD value directly;
 * native (POL/ETH) shows its quantity *and* USD equivalent at the closing rate of
 * record — `0.023953 POL ≈ $0.00` (spec §5) — so a holding worth a few cents is
 * still legible as a POL balance.
 */
function cashCurrencyValue(line: CashLineData): string {
  if (line.token !== 'native') return money(line.amountUsd)
  return `${tokenQuantity(line.tokenAmount, line.token)} ≈ ${money(line.amountUsd)}`
}

/** Balance-sheet lines as of a point in time. */
export function presentBalance(entries: readonly LedgerEntry[], asOf?: Date | null): BalanceView {
  const scoped = filterByPeriod(entries, null, asOf)
  const bs = buildBalanceSheet(scoped)
  const is = buildIncomeStatement(scoped)
  const retainedAccounts = [...is.revenue, ...is.expenses].map((l) => l.account)
  const assetLines: StatementLineView[] = [
    { label: 'Cash (all pockets)', value: money(bs.cash) },
    ...bs.cashByPocketCurrency.map((l) => ({
      label: `• ${pocketShortName(l.account)} · ${currencySymbol(l.token)}`,
      value: cashCurrencyValue(l),
      account: l.account
    })),
    ...bs.otherAssets.map((a) => ({ label: a.account, value: money(a.amount), account: a.account }))
  ]
  const liabLines: StatementLineView[] = bs.liabilities.length
    ? bs.liabilities.map((l) => ({ label: l.account, value: money(l.amount), account: l.account }))
    : [{ label: 'None (no debt)', value: money(0) }]
  const equityLines: StatementLineView[] = [
    { label: 'Owner capital', value: money(bs.ownerCapital), account: 'Owner Capital' },
    {
      label: 'Investor equity (SHER)',
      value: money(bs.investorEquity),
      account: 'Investor Equity'
    },
    {
      label: 'Retained earnings (net profit)',
      value: money(bs.retainedEarnings),
      accounts: retainedAccounts
    }
  ]
  return {
    assetLines,
    liabLines,
    equityLines,
    totalAssets: money(bs.totalAssets),
    totalEquity: money(bs.totalEquity),
    liabilitiesPlusEquity: money(bs.totalLiabilitiesAndEquity)
  }
}

/** Trial-balance rows + balanced total from the live general ledger. */
export function presentTrial(ledger: GeneralLedger): {
  rows: TrialRow[]
  total: string
  balanced: boolean
} {
  const rows: TrialRow[] = ledger.trialBalance.map((r) => {
    const debitSide = r.accountClass === 'ASSET' || r.accountClass === 'EXPENSE'
    return {
      account: r.account,
      nature: natureOf(r.account),
      natureClass: NATURE_BADGE[natureOf(r.account)],
      dr: debitSide ? money(r.balance) : '—',
      cr: debitSide ? '—' : money(r.balance),
      drMuted: !debitSide,
      crMuted: debitSide
    }
  })
  return { rows, total: money(ledger.debitBalanceTotal), balanced: ledger.balanced }
}

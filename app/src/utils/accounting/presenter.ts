import type { AccountClass, AccountName } from './chartOfAccounts'
import type { Account } from './accountRegistry'
import { buildGeneralLedger, type GeneralLedger } from './generalLedger'
import { buildIncomeStatement } from './incomeStatement'
import { buildBalanceSheet, type BalanceSheet, type CashCurrencyLine } from './balanceSheet'
import type { JournalEntry } from './journalEntry'
import { NETWORK, type TokenId } from '@/constant'
import { formatDate, formatDateTime, formatToken, formatUsd, fromUnix } from '@/utils/format'

// The summary metric cards live in their own module — see ./summaryCards.
export { presentSummaryCards, type SummaryCard } from './summaryCards'

/** The breakdown-line fields the display helpers read (subset of {@link CashCurrencyLine}). */
type CashLineData = Pick<CashCurrencyLine, 'token' | 'amountUsd' | 'tokenAmount'>

export type TrialNature = 'Asset' | 'Equity' | 'Contra-equity' | 'Income' | 'Liability' | 'Expense'

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
export function money(amountUsd: number): string {
  return formatUsd(amountUsd)
}

/** Unix-seconds → `Jan 8, 2026` (matches the dashboard ledger date style). */
export function formatUnixDate(timestamp: number): string {
  return formatDate(fromUnix(timestamp))
}

/**
 * Unix-seconds → `Jan 8, 2026, 14:05:32` — date **with time of day**, so the
 * ledger keeps Ponder's per-second precision (events in the same day stay
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

export interface SummaryBanner {
  balanced: boolean
  identity: string
  trial: string
}

export interface TrialRow {
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

export interface IncomeView {
  revenueLines: StatementLineView[]
  expenseLines: StatementLineView[]
  totalRevenue: string
  totalExpenses: string
  netIncome: string
  netNegative: boolean
}

export interface BalanceView {
  assetLines: StatementLineView[]
  liabilityLines: StatementLineView[]
  equityLines: StatementLineView[]
  totalAssets: string
  totalEquity: string
  liabilitiesPlusEquity: string
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
    netNegative: income.netIncome < 0
  }
}

/** Ledger token id → display symbol (native uses the chain's currency symbol). */
export function currencySymbol(token: TokenId): string {
  if (token === 'native') return NETWORK.currencySymbol || 'POL'
  if (token === 'usdc.e') return 'USDC.e'
  return token.toUpperCase() // usdc → USDC, usdt → USDT, sher → SHER
}

/** Drop the `Cash — ` chart prefix for the compact breakdown label. */
function pocketShortName(label: string): string {
  return label.replace(/^Cash — /, '')
}

/** `12.5` → `12.5 POL`; trims to at most 6 decimals so dust reads cleanly. */
function tokenQuantity(amount: number, token: TokenId): string {
  return formatToken(amount, currencySymbol(token), { maxDecimals: 6 })
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
export function presentBalance(entries: readonly JournalEntry[], asOf?: Date | null): BalanceView {
  const scoped = filterByPeriod(entries, null, asOf)
  const balance = buildBalanceSheet(scoped)
  const income = buildIncomeStatement(scoped)
  const retainedAccounts = [...income.revenue, ...income.expenses].map((line) => line.account)
  const accountLabels = new Map(
    buildGeneralLedger(scoped).trialBalance.map((line) => [line.account.id, line.accountLabel])
  )
  const accountLabel = (account: Account): string =>
    accountLabels.get(account.id) ?? account.family.name
  const assetLines: StatementLineView[] = [
    { label: 'Cash (all pockets)', value: money(balance.cash) },
    ...balance.cashByPocketCurrency.map((line) => ({
      label: `• ${pocketShortName(accountLabel(line.account))} · ${currencySymbol(line.token)}`,
      value: cashCurrencyValue(line),
      account: line.account
    })),
    ...balance.otherAssets.map((asset) => ({
      label: accountLabel(asset.account),
      value: money(asset.amount),
      account: asset.account
    }))
  ]
  const liabilityLines: StatementLineView[] = balance.liabilities.length
    ? balance.liabilities.map((line) => ({
        label: accountLabel(line.account),
        value: money(line.amount),
        account: line.account
      }))
    : [{ label: 'None (no debt)', value: money(0) }]
  const equityLines: StatementLineView[] = [
    {
      label: 'Owner capital',
      value: money(balance.ownerCapital.amount),
      account: balance.ownerCapital.account
    },
    {
      label: 'Investor equity (SHER)',
      value: money(balance.investorEquity.amount),
      account: balance.investorEquity.account
    },
    ...balance.contraEquity.map((line) => ({
      label: accountLabel(line.account),
      value: money(-line.amount),
      account: line.account
    })),
    {
      label: 'Retained earnings (net profit)',
      value: money(balance.retainedEarnings),
      accounts: retainedAccounts
    }
  ]
  return {
    assetLines,
    liabilityLines,
    equityLines,
    totalAssets: money(balance.totalAssets),
    totalEquity: money(balance.totalEquity),
    liabilitiesPlusEquity: money(balance.totalLiabilitiesAndEquity)
  }
}

/** Trial-balance rows + balanced total from the live general ledger. */
export function presentTrial(ledger: GeneralLedger): {
  rows: TrialRow[]
  total: string
  balanced: boolean
} {
  const rows: TrialRow[] = ledger.trialBalance.map((row) => {
    const debitSide = row.account.family.normalBalance === 'debit'
    return {
      account: row.account,
      label: row.accountLabel,
      split: row.split,
      // The primary row is the earliest resolved deployment, for display only.
      isPrimaryInstance: row.isPrimaryInstance,
      nature: natureOf(row.account),
      natureClass: NATURE_BADGE[natureOf(row.account)],
      dr: debitSide ? money(row.balance) : '—',
      cr: debitSide ? '—' : money(row.balance),
      drMuted: !debitSide,
      crMuted: debitSide
    }
  })
  return { rows, total: money(ledger.debitBalanceTotal), balanced: ledger.balanced }
}

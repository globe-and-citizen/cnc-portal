import type { PolygonTokenTransfer } from '~/api/polygonscan'
import type { PolymarketActivity, PolymarketPosition } from '~/types/polymarket'
import type { RealizedTrade } from '~/utils/incomeStatement'

/**
 * Polymarket accounting model.
 *
 * The Polymarket public API does not expose a portfolio/accounting endpoint
 * (that only exists on the US site). We reconstruct it from three feeds:
 *
 *  - Data API `/activity`  → trades, splits, merges, redeems, rewards
 *  - Data API `/positions` → cost basis + realized/unrealized P&L
 *  - Etherscan `/tokentx`  → on-chain USDC deposits & withdrawals
 *
 * Deposits/withdrawals are isolated from trade settlements by transaction
 * hash: any USDC transfer whose hash also appears in the `/activity` feed is
 * an internal Polymarket settlement and is skipped here (it is already
 * represented by the corresponding activity row). Everything else touching
 * the wallet is real cash in/out.
 */

export type LedgerCategory
  = | 'DEPOSIT'
    | 'WITHDRAWAL'
    | 'TRADE_BUY'
    | 'TRADE_SELL'
    | 'SPLIT'
    | 'MERGE'
    | 'REDEEM'
    | 'REWARD'
    | 'MAKER_REBATE'
    | 'REFERRAL_REWARD'
    | 'CONVERSION'
    | 'OTHER'

export interface LedgerEntry {
  id: string
  /** Unix seconds. */
  timestamp: number
  category: LedgerCategory
  /** Human label — market title for trades, "Deposit (USDC)" for transfers. */
  description: string
  /** Absolute USD amount of the event. */
  amount: number
  /** Signed change to the USDC cash balance (+ in, − out). */
  cashFlow: number
  txHash?: string
  source: 'polymarket' | 'polygonscan'
  counterparty?: string
  // --- Trade detail (present only on Polymarket activity rows) ---
  /** Outcome bet on, e.g. "Yes" / "No". */
  outcome?: string
  /** Price per outcome share, 0–1. */
  unitPrice?: number
  /** Outcome-share quantity. */
  quantity?: number
  /** Slug for the polymarket.com market link. */
  marketSlug?: string
  /** Market icon URL. */
  icon?: string
}

export interface AccountingSummary {
  totalDeposits: number
  totalWithdrawals: number
  /** Deposits − withdrawals: net capital committed to Polymarket. */
  netDeposits: number
  /**
   * Realized P&L from our own lot accounting (sells + redeems + merges +
   * resolution losses). Canonical figure — same source as the Income Statement,
   * so the two screens agree by construction.
   */
  realizedPnl: number
  /**
   * Polymarket's reported all-time realized P&L (sum of `positions.realizedPnl`).
   * Kept for audit only — drift between this and `realizedPnl` always equals
   * the cost basis of markets resolved-worthless without a redeem tx.
   */
  positionsRealizedPnl: number
  /** Unrealized P&L on open positions (from /positions). */
  unrealizedPnl: number
  /** Mark-to-market value of still-open positions. */
  openPositionsValue: number
  /** Rewards + maker rebates + referral rewards. */
  totalRewards: number
  /** Gross USD traded across all buys and sells. */
  tradingVolume: number
  tradeCount: number
  /** Exact free USDC balance held by the wallet (on-chain transfers, in − out). */
  currentCashBalance: number
  /** Free cash + open positions value: everything the wallet is worth now. */
  totalPortfolioValue: number
  /** totalPortfolioValue − netDeposits: the true bottom-line result. */
  totalReturn: number
  /**
   * Difference between the two independent profit measures —
   * (realized + unrealized + rewards) vs totalReturn. Near 0 means the books
   * reconcile; a large value flags incomplete data (truncation, missing market).
   */
  reconciliationGap: number
}

export interface AccountingLedger {
  entries: LedgerEntry[]
  summary: AccountingSummary
}

export interface BuildLedgerInput {
  proxyWallet: string
  activities: PolymarketActivity[]
  positions: PolymarketPosition[]
  transfers: PolygonTokenTransfer[]
  /**
   * Lot-accounting realized disposals (sells, redeems, merges, resolution losses).
   * When provided, `summary.realizedPnl` is sourced from these so that the
   * Summary tab and the Income Statement agree on the same realized figure.
   * If omitted, `summary.realizedPnl` falls back to Polymarket's reported
   * `positions.realizedPnl` (legacy behavior, kept for callers that don't
   * have access to the lot-accounting results).
   */
  realizedTrades?: RealizedTrade[]
}

const REWARD_CATEGORIES: ReadonlySet<LedgerCategory> = new Set<LedgerCategory>([
  'REWARD',
  'MAKER_REBATE',
  'REFERRAL_REWARD'
])

/** Maps a Polymarket activity row to a ledger category. */
function categorizeActivity(activity: PolymarketActivity): LedgerCategory {
  switch (activity.type) {
    case 'TRADE':
      return activity.side === 'SELL' ? 'TRADE_SELL' : 'TRADE_BUY'
    case 'SPLIT':
      return 'SPLIT'
    case 'MERGE':
      return 'MERGE'
    case 'REDEEM':
      return 'REDEEM'
    case 'REWARD':
      return 'REWARD'
    case 'MAKER_REBATE':
      return 'MAKER_REBATE'
    case 'REFERRAL_REWARD':
      return 'REFERRAL_REWARD'
    case 'CONVERSION':
      return 'CONVERSION'
    default:
      return 'OTHER'
  }
}

/**
 * Signed cash-balance impact of an activity. BUY/SPLIT lock USDC away,
 * SELL/MERGE/REDEEM/rewards release or add USDC, CONVERSION is neutral.
 */
function activityCashFlow(category: LedgerCategory, amount: number): number {
  switch (category) {
    case 'TRADE_BUY':
    case 'SPLIT':
      return -amount
    case 'TRADE_SELL':
    case 'MERGE':
    case 'REDEEM':
    case 'REWARD':
    case 'MAKER_REBATE':
    case 'REFERRAL_REWARD':
      return amount
    default:
      return 0
  }
}

function isStablecoin(transfer: PolygonTokenTransfer): boolean {
  return /usd/i.test(transfer.tokenSymbol)
}

function transferAmount(transfer: PolygonTokenTransfer): number {
  const decimals = Number(transfer.tokenDecimal) || 6
  const raw = Number(transfer.value) || 0
  return raw / 10 ** decimals
}

/**
 * Builds the full accounting ledger and summary for a Polymarket wallet.
 */
export function buildLedger(input: BuildLedgerInput): AccountingLedger {
  const wallet = input.proxyWallet.trim().toLowerCase()
  const entries: LedgerEntry[] = []

  // Hashes of every on-chain Polymarket activity — used to tell internal
  // trade settlements apart from genuine deposits/withdrawals.
  const activityHashes = new Set<string>()
  for (const activity of input.activities) {
    if (activity.transactionHash) {
      activityHashes.add(activity.transactionHash.toLowerCase())
    }
  }

  // --- Polymarket activity → ledger entries ---
  input.activities.forEach((activity, index) => {
    const category = categorizeActivity(activity)
    const amount = activity.usdcSize ?? 0
    entries.push({
      id: `pm-${activity.transactionHash ?? 'row'}-${activity.timestamp ?? index}-${index}`,
      timestamp: activity.timestamp ?? 0,
      category,
      description: activity.title ?? activity.type ?? 'Polymarket activity',
      amount,
      cashFlow: activityCashFlow(category, amount),
      txHash: activity.transactionHash,
      source: 'polymarket',
      outcome: activity.outcome,
      unitPrice: activity.price,
      quantity: activity.size,
      marketSlug: activity.eventSlug || activity.slug,
      icon: activity.icon
    })
  })

  // --- Etherscan USDC transfers → deposit/withdrawal entries ---
  input.transfers.forEach((transfer, index) => {
    if (!isStablecoin(transfer)) {
      return
    }
    // Already captured as a Polymarket activity row — skip to avoid double counting.
    if (activityHashes.has(transfer.hash.toLowerCase())) {
      return
    }

    const from = transfer.from.toLowerCase()
    const to = transfer.to.toLowerCase()
    const amount = transferAmount(transfer)
    if (amount <= 0) {
      return
    }

    let category: LedgerCategory
    let counterparty: string
    let cashFlow: number
    if (to === wallet && from !== wallet) {
      category = 'DEPOSIT'
      counterparty = transfer.from
      cashFlow = amount
    } else if (from === wallet && to !== wallet) {
      category = 'WITHDRAWAL'
      counterparty = transfer.to
      cashFlow = -amount
    } else {
      // Self-transfer or unrelated row — ignore.
      return
    }

    entries.push({
      id: `ps-${transfer.hash}-${index}`,
      timestamp: Number(transfer.timeStamp) || 0,
      category,
      description: category === 'DEPOSIT'
        ? `Deposit (${transfer.tokenSymbol})`
        : `Withdrawal (${transfer.tokenSymbol})`,
      amount,
      cashFlow,
      txHash: transfer.hash,
      source: 'polygonscan',
      counterparty
    })
  })

  entries.sort((a, b) => b.timestamp - a.timestamp)

  // --- Summary ---
  const summary: AccountingSummary = {
    totalDeposits: 0,
    totalWithdrawals: 0,
    netDeposits: 0,
    realizedPnl: 0,
    positionsRealizedPnl: 0,
    unrealizedPnl: 0,
    openPositionsValue: 0,
    totalRewards: 0,
    tradingVolume: 0,
    tradeCount: 0,
    currentCashBalance: 0,
    totalPortfolioValue: 0,
    totalReturn: 0,
    reconciliationGap: 0
  }

  for (const entry of entries) {
    if (entry.category === 'DEPOSIT') {
      summary.totalDeposits += entry.amount
    } else if (entry.category === 'WITHDRAWAL') {
      summary.totalWithdrawals += entry.amount
    } else if (entry.category === 'TRADE_BUY' || entry.category === 'TRADE_SELL') {
      summary.tradingVolume += entry.amount
      summary.tradeCount += 1
    } else if (REWARD_CATEGORIES.has(entry.category)) {
      summary.totalRewards += entry.amount
    }
  }
  summary.netDeposits = summary.totalDeposits - summary.totalWithdrawals

  for (const position of input.positions) {
    summary.positionsRealizedPnl += position.realizedPnl ?? 0
    summary.unrealizedPnl += position.cashPnl ?? 0
    summary.openPositionsValue += position.currentValue ?? 0
  }
  // Canonical realizedPnl comes from lot accounting (Income Statement source);
  // falls back to Polymarket's reported figure when no realizedTrades supplied.
  if (input.realizedTrades) {
    summary.realizedPnl = input.realizedTrades.reduce((sum, t) => sum + t.realizedPnl, 0)
  } else {
    summary.realizedPnl = summary.positionsRealizedPnl
  }

  // Exact free USDC balance: every stablecoin transfer in/out of the wallet,
  // including trade settlements (which the ledger skips). ERC-20 balances only
  // change via Transfer events, so in − out is the precise current balance.
  for (const transfer of input.transfers) {
    if (!isStablecoin(transfer)) {
      continue
    }
    const amount = transferAmount(transfer)
    if (transfer.to.toLowerCase() === wallet) {
      summary.currentCashBalance += amount
    }
    if (transfer.from.toLowerCase() === wallet) {
      summary.currentCashBalance -= amount
    }
  }

  summary.totalPortfolioValue = summary.currentCashBalance + summary.openPositionsValue
  summary.totalReturn = summary.totalPortfolioValue - summary.netDeposits
  // Two independent profit measures should agree; the gap is an audit signal.
  const pnlBasedReturn = summary.realizedPnl + summary.unrealizedPnl + summary.totalRewards
  summary.reconciliationGap = summary.totalReturn - pnlBasedReturn

  return { entries, summary }
}

// --- Presentation helpers (shared by the accounting components) ---

export type LedgerCategoryColor
  = | 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

/** Display label + badge color for each ledger category. */
export const CATEGORY_META: Record<LedgerCategory, { label: string, color: LedgerCategoryColor }> = {
  DEPOSIT: { label: 'Deposit', color: 'success' },
  WITHDRAWAL: { label: 'Withdrawal', color: 'error' },
  TRADE_BUY: { label: 'Buy', color: 'info' },
  TRADE_SELL: { label: 'Sell', color: 'warning' },
  SPLIT: { label: 'Split', color: 'neutral' },
  MERGE: { label: 'Merge', color: 'neutral' },
  REDEEM: { label: 'Redeem', color: 'primary' },
  REWARD: { label: 'Reward', color: 'success' },
  MAKER_REBATE: { label: 'Maker rebate', color: 'success' },
  REFERRAL_REWARD: { label: 'Referral', color: 'success' },
  CONVERSION: { label: 'Conversion', color: 'neutral' },
  OTHER: { label: 'Other', color: 'neutral' }
}

/** Formats a USD amount, e.g. 1234.5 → "$1,234.50". */
export function formatUsd(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Formats a USD amount with full USDC precision (6 decimals). */
export function formatUsd6(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`
}

/** Formats a signed USD amount, e.g. -12 → "−$12.00". */
export function formatSignedUsd(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatUsd(Math.abs(value))}`
}

/** Tailwind text-color class for a signed value (green / red / muted). */
export function signClass(value: number | undefined): string {
  if (value == null || value === 0) {
    return 'text-muted'
  }
  return value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
}

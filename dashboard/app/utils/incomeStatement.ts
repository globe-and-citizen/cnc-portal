import type { PolymarketActivity, PolymarketPosition } from '~/types/polymarket'

/**
 * Income Statement for Polymarket trading activity — issue #1882.
 *
 * The Polymarket `/positions` feed only exposes an all-time aggregate
 * `realizedPnl`; it cannot be split into wins vs losses and has no date.
 * An income statement is a *period* statement, so we reconstruct realized
 * results from the `/activity` feed with weighted-average-cost lot accounting:
 *
 *  - BUY / SPLIT  → add shares + cost basis to the outcome-token lot
 *  - SELL / REDEEM / MERGE → dispose shares, realize P&L = proceeds − cost basis
 *  - a losing position held to resolution never produces a redeem row, so its
 *    residual cost basis is booked as a realized loss at the market end date
 *
 * Each disposal becomes a dated RealizedTrade, which makes the statement
 * filterable by period and reusable by the General Ledger sub-task.
 */

export type RealizedTradeKind = 'SELL' | 'REDEEM' | 'MERGE' | 'RESOLUTION_LOSS'

export interface RealizedTrade {
  /** Unix seconds of the disposal. */
  timestamp: number
  market: string
  outcome?: string
  asset?: string
  conditionId?: string
  /** USDC received from the disposal (0 for an unredeemed losing position). */
  proceeds: number
  /** Weighted-average cost basis of the disposed shares. */
  costBasis: number
  /** proceeds − costBasis. Positive = win, negative = loss. */
  realizedPnl: number
  kind: RealizedTradeKind
}

export interface IncomeStatement {
  /** Period bounds (unix seconds); undefined = open-ended. */
  periodStart?: number
  periodEnd?: number
  /** Sum of positive realized results in the period. */
  wins: number
  winCount: number
  /** Sum of negative realized results in the period, as a positive number. */
  losses: number
  lossCount: number
  /** wins − losses. */
  netTradingResult: number
  /** Rewards, maker rebates and referral rewards earned in the period. */
  polyRewards: number
  /** Trading fees and other costs (Polymarket charges no trading fees → 0). */
  expenses: number
  /** netTradingResult + polyRewards − expenses. */
  netIncome: number
  /** Realized disposals within the period, newest first (detail rows). */
  realizedTrades: RealizedTrade[]
  /** All-time realized total from this lot accounting (audit). */
  allTimeRealized: number
  /** All-time realized total reported by Polymarket `/positions` (audit). */
  positionsRealizedPnl: number
  /** allTimeRealized − positionsRealizedPnl. */
  reconciliationGap: number
}

export interface BuildIncomeStatementInput {
  activities: PolymarketActivity[]
  positions: PolymarketPosition[]
  /** Inclusive period bounds, unix seconds. Omit for all-time. */
  periodStart?: number
  periodEnd?: number
}

/** Activity `type` values that are reward income rather than trading. */
const REWARD_TYPES: ReadonlySet<string> = new Set(['REWARD', 'MAKER_REBATE', 'REFERRAL_REWARD'])

/** Shares below this are treated as a fully-closed lot (floating-point dust). */
const DUST = 1e-6

interface Lot {
  shares: number
  cost: number
  title?: string
  outcome?: string
  conditionId?: string
}

/** Resolves a position's market end date to unix seconds, or null. */
function marketEndSeconds(position: PolymarketPosition): number | null {
  if (!position.endDate) {
    return null
  }
  const ms = Date.parse(position.endDate)
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000)
}

/**
 * Replays the activity feed with weighted-average-cost lot accounting and
 * returns every realized disposal (all-time, newest first).
 */
export function computeRealizedTrades(
  activities: PolymarketActivity[],
  positions: PolymarketPosition[]
): RealizedTrade[] {
  const sorted = [...activities].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
  const lots = new Map<string, Lot>()
  const realized: RealizedTrade[] = []

  for (const activity of sorted) {
    const asset = activity.asset
    if (!asset) {
      // Without an outcome-token id the lot cannot be tracked.
      continue
    }
    const size = activity.size ?? 0
    const usd = activity.usdcSize ?? 0
    const lot = lots.get(asset) ?? { shares: 0, cost: 0 }
    lot.title = activity.title ?? lot.title
    lot.outcome = activity.outcome ?? lot.outcome
    lot.conditionId = activity.conditionId ?? lot.conditionId
    lots.set(asset, lot)

    const isBuy = activity.type === 'TRADE' && activity.side === 'BUY'
    const isSell = activity.type === 'TRADE' && activity.side === 'SELL'

    if (isBuy || activity.type === 'SPLIT') {
      lot.shares += size
      lot.cost += usd
      continue
    }

    if (isSell || activity.type === 'REDEEM' || activity.type === 'MERGE') {
      // Clamp to held shares: incomplete history must not produce phantom basis.
      const disposed = lot.shares > 0 ? Math.min(size, lot.shares) : size
      const avgCost = lot.shares > 0 ? lot.cost / lot.shares : 0
      const costBasis = avgCost * disposed
      realized.push({
        timestamp: activity.timestamp ?? 0,
        market: activity.title ?? lot.title ?? '—',
        outcome: activity.outcome ?? lot.outcome,
        asset,
        conditionId: activity.conditionId ?? lot.conditionId,
        proceeds: usd,
        costBasis,
        realizedPnl: usd - costBasis,
        kind: activity.type === 'REDEEM' ? 'REDEEM' : activity.type === 'MERGE' ? 'MERGE' : 'SELL'
      })
      lot.shares -= disposed
      lot.cost -= costBasis
      if (lot.shares < DUST) {
        lot.shares = 0
        lot.cost = 0
      }
    }
    // CONVERSION and reward rows carry no trading P&L — skipped here.
  }

  // A losing position held to market resolution never produces a redeem row.
  // Its residual cost basis is a realized loss, dated at the market end.
  const positionByAsset = new Map<string, PolymarketPosition>()
  for (const position of positions) {
    if (position.asset) {
      positionByAsset.set(position.asset, position)
    }
  }
  const nowSeconds = Math.floor(Date.now() / 1000)
  for (const [asset, lot] of lots) {
    if (lot.shares <= DUST || lot.cost <= 0) {
      continue
    }
    const position = positionByAsset.get(asset)
    if (!position) {
      continue
    }
    const endSeconds = marketEndSeconds(position)
    const isResolved = endSeconds != null && endSeconds < nowSeconds
    const isWorthless = (position.curPrice ?? 0) <= 0.01
    if (isResolved && isWorthless) {
      realized.push({
        timestamp: endSeconds ?? nowSeconds,
        market: position.title ?? lot.title ?? '—',
        outcome: position.outcome ?? lot.outcome,
        asset,
        conditionId: position.conditionId ?? lot.conditionId,
        proceeds: 0,
        costBasis: lot.cost,
        realizedPnl: -lot.cost,
        kind: 'RESOLUTION_LOSS'
      })
    }
  }

  return realized.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Builds the Income Statement for the given period (Wins / Losses / Net,
 * Poly Rewards, Expenses).
 */
export function buildIncomeStatement(input: BuildIncomeStatementInput): IncomeStatement {
  const allRealized = computeRealizedTrades(input.activities, input.positions)

  const inPeriod = (ts: number): boolean =>
    (input.periodStart == null || ts >= input.periodStart)
    && (input.periodEnd == null || ts <= input.periodEnd)

  const realizedTrades = allRealized.filter(trade => inPeriod(trade.timestamp))

  let wins = 0
  let losses = 0
  let winCount = 0
  let lossCount = 0
  for (const trade of realizedTrades) {
    if (trade.realizedPnl >= 0) {
      wins += trade.realizedPnl
      winCount += 1
    } else {
      losses += -trade.realizedPnl
      lossCount += 1
    }
  }
  const netTradingResult = wins - losses

  let polyRewards = 0
  for (const activity of input.activities) {
    if (REWARD_TYPES.has(activity.type ?? '') && inPeriod(activity.timestamp ?? 0)) {
      polyRewards += activity.usdcSize ?? 0
    }
  }

  // Polymarket charges no trading fees; gas on trades is paid by the relayer.
  const expenses = 0
  const netIncome = netTradingResult + polyRewards - expenses

  const allTimeRealized = allRealized.reduce((sum, trade) => sum + trade.realizedPnl, 0)
  const positionsRealizedPnl = input.positions.reduce((sum, position) => sum + (position.realizedPnl ?? 0), 0)

  return {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    wins,
    winCount,
    losses,
    lossCount,
    netTradingResult,
    polyRewards,
    expenses,
    netIncome,
    realizedTrades,
    allTimeRealized,
    positionsRealizedPnl,
    reconciliationGap: allTimeRealized - positionsRealizedPnl
  }
}

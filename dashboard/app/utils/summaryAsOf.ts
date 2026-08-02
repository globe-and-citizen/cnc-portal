import type { AccountingSummary, LedgerCategory, LedgerEntry } from '~/utils/accounting'
import type { RealizedTrade } from '~/utils/incomeStatement'

/**
 * Point-in-time snapshot of the accounting Summary — issue #2103.
 *
 * The Summary is otherwise an all-time view. Bounding it by a date reuses the
 * same principle as the Balance Sheet (`~/utils/balanceSheet`): every figure is
 * rebuilt from the *dated* feeds (the ledger entries and the lot-accounting
 * disposals), keeping only what had already happened on the reporting date.
 *
 * Two families of figures live in the Summary:
 *
 *  - **Dated** — deposits, withdrawals, cash, rewards, fees, volume, realized
 *    P&L, cost of open contracts. All of them carry a timestamp, so they can be
 *    replayed for any date.
 *  - **Live** — open-position market value, unrealized P&L and the profile P&L
 *    figure. These come from the `/positions` and `user-pnl` feeds, which only
 *    ever describe *now*: Polymarket exposes no historical quote per market.
 *
 * A past snapshot therefore carries open contracts **at cost**, exactly like the
 * Balance Sheet does, and reports the live figures as unavailable rather than
 * pretending today's market prices applied back then. Under that convention the
 * accounting identity still closes to the cent:
 * `cash + contractsAtCost ≡ netDeposits + realizedPnl + rewards + settlements`.
 */

export interface SummarySnapshot {
  /** Summary bounded by {@link asOf}. */
  summary: AccountingSummary
  /** Reporting date (unix seconds). */
  asOf: number
  /**
   * True when the snapshot reaches the present, i.e. the live mark-to-market
   * figures are meaningful and the Summary renders exactly as it always has.
   */
  isCurrent: boolean
}

interface BuildSummarySnapshotInput {
  /** The live all-time summary — returned untouched for a current snapshot. */
  summary: AccountingSummary
  ledgerEntries: LedgerEntry[]
  realizedTrades: RealizedTrade[]
  /** Reporting date (unix seconds); omit for all-time / now. */
  asOf?: number
  /** Injectable clock, so the snapshot is deterministic under test. */
  now?: number
}

const REWARD_CATEGORIES: ReadonlySet<LedgerCategory> = new Set<LedgerCategory>([
  'REWARD',
  'MAKER_REBATE',
  'REFERRAL_REWARD'
])

/** Zeroed base — every field is filled in below, this only keeps the shape honest. */
function emptySummary(): AccountingSummary {
  return {
    totalDeposits: 0,
    totalWithdrawals: 0,
    netDeposits: 0,
    realizedPnl: 0,
    positionsRealizedPnl: 0,
    unrealizedPnl: 0,
    polymarketPnl: 0,
    openPositionsValue: 0,
    openContractsAtCost: 0,
    totalRewards: 0,
    tradingVolume: 0,
    tradeCount: 0,
    settlementAdjustments: 0,
    settlementAdjustmentCount: 0,
    totalFees: 0,
    feeTransactionCount: 0,
    positionBasisDrift: 0,
    currentCashBalance: 0,
    totalPortfolioValue: 0,
    totalReturn: 0,
    reconciliationGap: 0
  }
}

/**
 * Rebuilds the Summary as of the given date.
 *
 * When the date reaches the present the live summary is returned as-is — the
 * default "Today" selection must render precisely what the Summary rendered
 * before this option existed.
 */
export function buildSummarySnapshot(input: BuildSummarySnapshotInput): SummarySnapshot {
  const now = input.now ?? Math.floor(Date.now() / 1000)
  const asOf = input.asOf ?? Number.POSITIVE_INFINITY

  if (asOf >= now) {
    return { summary: input.summary, asOf: Number.isFinite(asOf) ? asOf : now, isCurrent: true }
  }

  const summary = emptySummary()
  let acquisitionCost = 0
  for (const entry of input.ledgerEntries) {
    if (entry.timestamp > asOf) {
      continue
    }
    summary.currentCashBalance += entry.cashFlow

    if (entry.category === 'DEPOSIT') {
      summary.totalDeposits += entry.amount
    } else if (entry.category === 'WITHDRAWAL') {
      summary.totalWithdrawals += entry.amount
    } else if (entry.category === 'TRADE_BUY' || entry.category === 'TRADE_SELL') {
      summary.tradingVolume += entry.amount
      summary.tradeCount += 1
      // Fees are baked into the fill price, so they are the gap between the
      // quoted value and what actually moved — same derivation as buildLedger().
      if (entry.unitPrice != null && entry.quantity != null) {
        const fee = Math.abs(entry.quantity * entry.unitPrice - entry.amount)
        summary.totalFees += fee
        if (fee > 1e-4) {
          summary.feeTransactionCount += 1
        }
      }
    } else if (REWARD_CATEGORIES.has(entry.category)) {
      summary.totalRewards += entry.amount
    } else if (entry.category === 'SETTLEMENT_ADJUSTMENT') {
      summary.settlementAdjustments += entry.cashFlow
      summary.settlementAdjustmentCount += 1
    }

    if (entry.category === 'TRADE_BUY' || entry.category === 'SPLIT') {
      acquisitionCost += entry.amount
    }
  }

  let disposedCost = 0
  for (const trade of input.realizedTrades) {
    if (trade.timestamp > asOf) {
      continue
    }
    disposedCost += trade.costBasis
    summary.realizedPnl += trade.realizedPnl
  }

  summary.netDeposits = summary.totalDeposits - summary.totalWithdrawals
  summary.openContractsAtCost = acquisitionCost - disposedCost
  // Contracts held on that date are carried at cost: no historical quote exists,
  // and at cost the balance-sheet identity holds exactly (see the module doc).
  summary.openPositionsValue = summary.openContractsAtCost
  summary.totalPortfolioValue = summary.currentCashBalance + summary.openPositionsValue
  summary.totalReturn = summary.totalPortfolioValue - summary.netDeposits
  summary.reconciliationGap = summary.totalReturn
    - (summary.realizedPnl + summary.totalRewards + summary.settlementAdjustments)

  return { summary, asOf, isCurrent: false }
}

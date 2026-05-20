import type { LedgerEntry, LedgerCategory } from '~/utils/accounting'
import type { RealizedTrade } from '~/utils/incomeStatement'
import type { PolymarketPosition } from '~/types/polymarket'

/**
 * Balance Sheet for Polymarket activity — issue #1883.
 *
 * Assets = Liabilities + Equity, as of a chosen date.
 *
 *  Assets       Cash + Open contracts (at cost basis)
 *  Liabilities  none — a Polymarket account carries no debt
 *  Equity       Owner capital (net deposits) + Retained earnings (realized P&L + rewards)
 *
 * Booked at cost basis, the identity holds *exactly* for any "as of" date:
 * cash and contract cost are reconstructed from the dated activity feed, and
 * algebraically  cash + contractsAtCost ≡ netDeposits + realizedPnl + rewards.
 *
 * Current market value and unrealized P&L are provided as a memo; they come
 * from the live `/positions` feed and are only meaningful when "as of" is now.
 */

export interface BalanceSheet {
  /** Reporting date (unix seconds). */
  asOf: number
  // Assets (at cost basis)
  cash: number
  openContractsAtCost: number
  totalAssets: number
  // Liabilities
  totalLiabilities: number
  // Equity
  ownerCapital: number
  retainedEarnings: number
  totalEquity: number
  /** totalAssets − (totalLiabilities + totalEquity); ~0 means it balances. */
  identityGap: number
  // Mark-to-market memo (live /positions data — meaningful only "as of" today)
  openContractsMarketValue: number
  unrealizedPnl: number
}

export interface BuildBalanceSheetInput {
  ledgerEntries: LedgerEntry[]
  realizedTrades: RealizedTrade[]
  positions: PolymarketPosition[]
  /** Reporting date (unix seconds); omit for all-time / now. */
  asOf?: number
}

const ACQUISITION_CATEGORIES: ReadonlySet<LedgerCategory> = new Set<LedgerCategory>(['TRADE_BUY', 'SPLIT'])
const REWARD_CATEGORIES: ReadonlySet<LedgerCategory> = new Set<LedgerCategory>([
  'REWARD',
  'MAKER_REBATE',
  'REFERRAL_REWARD'
])

/** Builds the Balance Sheet as of the given date. */
export function buildBalanceSheet(input: BuildBalanceSheetInput): BalanceSheet {
  const asOf = input.asOf ?? Number.POSITIVE_INFINITY

  let cash = 0
  let acquisitionCost = 0
  let ownerCapital = 0
  let rewards = 0
  for (const entry of input.ledgerEntries) {
    if (entry.timestamp > asOf) {
      continue
    }
    cash += entry.cashFlow
    if (ACQUISITION_CATEGORIES.has(entry.category)) {
      acquisitionCost += entry.amount
    } else if (entry.category === 'DEPOSIT') {
      ownerCapital += entry.amount
    } else if (entry.category === 'WITHDRAWAL') {
      ownerCapital -= entry.amount
    } else if (REWARD_CATEGORIES.has(entry.category)) {
      rewards += entry.amount
    }
  }

  let disposedCost = 0
  let realizedPnl = 0
  for (const trade of input.realizedTrades) {
    if (trade.timestamp > asOf) {
      continue
    }
    disposedCost += trade.costBasis
    realizedPnl += trade.realizedPnl
  }

  const openContractsAtCost = acquisitionCost - disposedCost
  const totalAssets = cash + openContractsAtCost
  const retainedEarnings = realizedPnl + rewards
  const totalEquity = ownerCapital + retainedEarnings
  const totalLiabilities = 0

  let openContractsMarketValue = 0
  let unrealizedPnl = 0
  for (const position of input.positions) {
    openContractsMarketValue += position.currentValue ?? 0
    unrealizedPnl += position.cashPnl ?? 0
  }

  return {
    asOf: Number.isFinite(asOf) ? asOf : Math.floor(Date.now() / 1000),
    cash,
    openContractsAtCost,
    totalAssets,
    totalLiabilities,
    ownerCapital,
    retainedEarnings,
    totalEquity,
    identityGap: totalAssets - (totalLiabilities + totalEquity),
    openContractsMarketValue,
    unrealizedPnl
  }
}

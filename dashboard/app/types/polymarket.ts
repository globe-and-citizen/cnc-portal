export type PolymarketActivityKind = 'TRADE' | 'SPLIT' | 'MERGE' | 'REDEEM' | 'REWARD' | 'CONVERSION' | 'MAKER_REBATE' | 'REFERRAL_REWARD'

/**
 * One row from Polymarket Data API GET /activity.
 * @see https://docs.polymarket.com/api-reference/core/get-user-activity
 */
export interface PolymarketActivity {
  proxyWallet?: `0x${string}`
  timestamp?: number
  conditionId?: `0x${string}`
  type?: PolymarketActivityKind | string
  size?: number
  usdcSize?: number
  transactionHash?: string
  price?: number
  asset?: string
  side?: 'BUY' | 'SELL' | string
  outcomeIndex?: number
  title?: string
  slug?: string
  icon?: string
  eventSlug?: string
  outcome?: string
  name?: string
  pseudonym?: string
  bio?: string
  profileImage?: string
  profileImageOptimized?: string
}

/**
 * One row from Polymarket Data API GET /positions.
 *
 * This is the source of cost basis and P&L data, which the /activity feed
 * does NOT provide. `realizedPnl` covers closed exposure, `cashPnl` is the
 * unrealized (mark-to-market) P&L on the still-open size.
 * @see https://docs.polymarket.com/api-reference/core/get-current-positions-for-a-user
 */
export interface PolymarketPosition {
  proxyWallet?: `0x${string}`
  asset?: string
  conditionId?: `0x${string}`
  /** Net outcome-token quantity still held */
  size?: number
  /** Average entry price paid for the open size */
  avgPrice?: number
  /** Current market price for the outcome */
  curPrice?: number
  /** Cumulative outcome tokens bought */
  totalBought?: number
  /** Cost basis of the open size (USD) */
  initialValue?: number
  /** Mark-to-market value of the open size (USD) */
  currentValue?: number
  /** Unrealized P&L on the open size (USD) */
  cashPnl?: number
  /** Unrealized return (%) */
  percentPnl?: number
  /** Realized P&L locked in by closed/sold exposure (USD) */
  realizedPnl?: number
  /** Realized return (%) */
  percentRealizedPnl?: number
  title?: string
  slug?: string
  eventSlug?: string
  outcome?: string
  outcomeIndex?: number
  icon?: string
  endDate?: string
  negativeRisk?: boolean
  redeemable?: boolean
  mergeable?: boolean
}

/** One point from Polymarket user-pnl-api — powers the profile Profit/Loss chart. */
export interface PolymarketUserPnlPoint {
  /** Unix seconds. */
  t: number
  /** Cumulative portfolio P&L (USD) at `t`. */
  p: number
}

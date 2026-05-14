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

import type { PolymarketActivity, PolymarketActivityKind, PolymarketPosition } from '~/types/polymarket'

/**
 * Raw shapes returned by the Polymarket Data API v2 and their mapping onto the
 * dashboard's own Polymarket types, so the accounting code never depends on the
 * provider's wire format. v2 rows are snake_case and report a missing number as
 * `null`, which the mappers turn into an absent field.
 * @see https://docs.polymarket.com/api-reference/data-api/overview
 */

/** Cursor-paginated v2 envelope: follow `next_cursor` until it is `null`. */
export interface PolymarketPage<Row> {
  data: Row[]
  pagination: { next_cursor: string | null }
}

export interface PolymarketActivityRow {
  proxy_wallet?: `0x${string}`
  timestamp?: number
  condition_id?: `0x${string}`
  type?: PolymarketActivityKind | string
  size?: number | null
  usdc_size?: number | null
  transaction_hash?: string
  price?: number | null
  token_id?: string
  side?: 'BUY' | 'SELL' | string
  outcome_index?: number | null
  title?: string
  slug?: string
  icon?: string
  event_slug?: string
  outcome?: string
  name?: string
  pseudonym?: string
  bio?: string
  profile_image?: string
  profile_image_optimized?: string
}

export interface PolymarketPositionRow {
  proxy_wallet?: `0x${string}`
  token_id?: string
  condition_id?: `0x${string}`
  current_size?: number | null
  avg_price?: number | null
  current_price?: number | null
  total_size?: number | null
  entry_cost_usdc?: number | null
  current_value?: number | null
  unrealized_pnl?: number | null
  percent_pnl?: number | null
  realized_pnl?: number | null
  percent_realized_pnl?: number | null
  title?: string
  slug?: string
  event_slug?: string
  outcome?: string
  outcome_index?: number | null
  icon?: string
  end_date?: string
  negative_risk?: boolean
  redeemable?: boolean
  mergeable?: boolean
}

/** One cumulative observation of the v2 `/user-pnl` series. */
export interface PolymarketUserPnlPoint {
  timestamp: number
  /** Realized + unrealized P&L on positions (USD), the profile Profit/Loss figure. */
  position_pnl: number | null
}

export interface PolymarketUserPnl {
  data: { points: PolymarketUserPnlPoint[] }
}

function definedNumber(value: number | null | undefined): number | undefined {
  return value ?? undefined
}

export function toPolymarketActivity(
  row: PolymarketActivityRow
): PolymarketActivity {
  return {
    proxyWallet: row.proxy_wallet,
    timestamp: row.timestamp,
    conditionId: row.condition_id,
    type: row.type,
    size: definedNumber(row.size),
    usdcSize: definedNumber(row.usdc_size),
    transactionHash: row.transaction_hash,
    price: definedNumber(row.price),
    asset: row.token_id,
    side: row.side,
    outcomeIndex: definedNumber(row.outcome_index),
    title: row.title,
    slug: row.slug,
    icon: row.icon,
    eventSlug: row.event_slug,
    outcome: row.outcome,
    name: row.name,
    pseudonym: row.pseudonym,
    bio: row.bio,
    profileImage: row.profile_image,
    profileImageOptimized: row.profile_image_optimized
  }
}

export function toPolymarketPosition(
  row: PolymarketPositionRow
): PolymarketPosition {
  return {
    proxyWallet: row.proxy_wallet,
    asset: row.token_id,
    conditionId: row.condition_id,
    size: definedNumber(row.current_size),
    avgPrice: definedNumber(row.avg_price),
    curPrice: definedNumber(row.current_price),
    totalBought: definedNumber(row.total_size),
    initialValue: definedNumber(row.entry_cost_usdc),
    currentValue: definedNumber(row.current_value),
    cashPnl: definedNumber(row.unrealized_pnl),
    percentPnl: definedNumber(row.percent_pnl),
    realizedPnl: definedNumber(row.realized_pnl),
    percentRealizedPnl: definedNumber(row.percent_realized_pnl),
    title: row.title,
    slug: row.slug,
    eventSlug: row.event_slug,
    outcome: row.outcome,
    outcomeIndex: definedNumber(row.outcome_index),
    icon: row.icon,
    endDate: row.end_date,
    negativeRisk: row.negative_risk,
    redeemable: row.redeemable,
    mergeable: row.mergeable
  }
}

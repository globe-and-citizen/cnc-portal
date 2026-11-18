import { isAddress } from 'viem'
import type { PolymarketActivity, PolymarketPosition } from '~/types/polymarket'
import {
  toPolymarketActivity,
  toPolymarketPosition,
  type PolymarketActivityRow,
  type PolymarketPage,
  type PolymarketPositionRow,
  type PolymarketUserPnl
} from '~/api/polymarketRows'

const POLYMARKET_DATA_API_URL = 'https://data-api.polymarket.com/v2'
const MAX_PAGE_SIZE = 1000

type PolymarketQuery = Record<string, string>

function toPolymarketUser(address: string): string {
  const user = address.trim()
  if (!isAddress(user as `0x${string}`)) {
    throw new Error(`Invalid Polymarket user address: ${address}`)
  }
  return user
}

/**
 * Walks a cursor-paginated Data API v2 route until `next_cursor` is `null`.
 * The filters are re-sent with every cursor, as v2 requires.
 */
async function fetchAllPages<Row>(path: string, query: PolymarketQuery): Promise<Row[]> {
  const rows: Row[] = []
  let cursor: string | null = null
  do {
    const page: PolymarketPage<Row> = await $fetch<PolymarketPage<Row>>(`${POLYMARKET_DATA_API_URL}/${path}`, {
      query: { ...query, limit: MAX_PAGE_SIZE, ...(cursor ? { cursor } : {}) }
    })
    rows.push(...page.data)
    cursor = page.pagination.next_cursor
  } while (cursor)
  return rows
}

/** Fetches the complete activity history, oldest first, for accounting. */
export async function fetchAllPolymarketActivity(address: string): Promise<PolymarketActivity[]> {
  const user = toPolymarketUser(address)
  const rows = await fetchAllPages<PolymarketActivityRow>('activity', { user, sortBy: 'TIMESTAMP', sortDirection: 'ASC' })
  return rows.map(toPolymarketActivity)
}

/**
 * Fetches every position for accounting. v2 returns open positions by default
 * and closed ones (needed for realized P&L) only with `status=CLOSED`.
 */
export async function fetchAllPolymarketPositions(address: string): Promise<PolymarketPosition[]> {
  const user = toPolymarketUser(address)
  const [openRows, closedRows] = await Promise.all([
    fetchAllPages<PolymarketPositionRow>('positions', { user }),
    fetchAllPages<PolymarketPositionRow>('positions', { user, status: 'CLOSED' })
  ])
  return [...openRows, ...closedRows].map(toPolymarketPosition)
}

/**
 * Latest all-time P&L, as the polymarket.com profile page reports it. Unlike
 * Σ `/positions` realizedPnl + cashPnl, it stays right once closed markets drop
 * off the positions feed. Daily points over the whole history keep the payload
 * small while still reaching wallets that have been idle for a long time.
 */
export async function fetchPolymarketLatestPnl(address: string): Promise<number> {
  const user = toPolymarketUser(address)
  const response = await $fetch<PolymarketUserPnl>(`${POLYMARKET_DATA_API_URL}/user-pnl`, {
    query: { user, interval: 'all', fidelity: '1d' }
  })
  const pricedPoints = response.data.points.filter(point => point.position_pnl != null)
  if (pricedPoints.length === 0) {
    return 0
  }
  const latest = pricedPoints.reduce((newest, point) => (point.timestamp > newest.timestamp ? point : newest))
  return latest.position_pnl ?? 0
}

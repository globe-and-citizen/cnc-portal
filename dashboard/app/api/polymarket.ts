import { isAddress } from 'viem'
import type { PolymarketActivity } from '~/types/polymarket'

const POLYMARKET_ACTIVITY_URL = 'https://data-api.polymarket.com/activity'

export type PolymarketActivitySortBy = 'TIMESTAMP' | 'TOKENS' | 'CASH'
export type PolymarketActivitySortDirection = 'ASC' | 'DESC'
export type PolymarketActivitySide = 'BUY' | 'SELL'

export interface FetchPolymarketActivityParams {
  user: string
  limit?: number
  offset?: number
  market?: string | string[]
  eventId?: number | number[]
  type?: string | string[]
  start?: number
  end?: number
  sortBy?: PolymarketActivitySortBy
  sortDirection?: PolymarketActivitySortDirection
  side?: PolymarketActivitySide
}

function serializeCsv(value: string | number | readonly string[] | readonly number[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (Array.isArray(value)) {
    return value.join(',')
  }
  return String(value)
}

function clampLimit(raw: number | undefined): number {
  if (raw == null || Number.isNaN(raw)) {
    return 100
  }
  return Math.min(500, Math.max(0, Math.floor(raw)))
}

function clampOffset(raw: number | undefined): number {
  if (raw == null || Number.isNaN(raw)) {
    return 0
  }
  return Math.min(10_000, Math.max(0, Math.floor(raw)))
}

function appendOptionalParams(url: URL, params: FetchPolymarketActivityParams): void {
  const entries: [string, string | undefined][] = [
    ['market', serializeCsv(params.market)],
    ['eventId', serializeCsv(params.eventId)],
    ['type', serializeCsv(params.type)],
    ['start', params.start != null ? String(params.start) : undefined],
    ['end', params.end != null ? String(params.end) : undefined],
    ['sortBy', params.sortBy],
    ['sortDirection', params.sortDirection],
    ['side', params.side]
  ]
  for (const [key, value] of entries) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, value)
    }
  }
}

/**
 * Fetches user activity from the Polymarket Data API (browser-side).
 * @see https://docs.polymarket.com/api-reference/core/get-user-activity
 */
export async function fetchPolymarketActivity(params: FetchPolymarketActivityParams): Promise<PolymarketActivity[]> {
  const user = params.user.trim()
  if (!isAddress(user as `0x${string}`)) {
    throw new Error('Invalid Polymarket user address')
  }

  const url = new URL(POLYMARKET_ACTIVITY_URL)
  url.searchParams.set('user', user)
  url.searchParams.set('limit', String(clampLimit(params.limit)))
  url.searchParams.set('offset', String(clampOffset(params.offset)))
  appendOptionalParams(url, params)

  return await $fetch<PolymarketActivity[]>(url.toString())
}

import type { PolymarketActivity } from '~/types/polymarket'

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

export async function fetchPolymarketActivity(params: FetchPolymarketActivityParams): Promise<PolymarketActivity[]> {
  const query: Record<string, string | number | undefined> = {
    user: params.user.trim(),
    limit: params.limit,
    offset: params.offset,
    market: serializeCsv(params.market),
    eventId: serializeCsv(params.eventId),
    type: serializeCsv(params.type),
    start: params.start,
    end: params.end,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
    side: params.side
  }

  return await $fetch<PolymarketActivity[]>('/api/polymarket/activity', { query })
}

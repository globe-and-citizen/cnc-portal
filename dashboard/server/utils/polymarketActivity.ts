import { isAddress } from 'viem'

const POLYMARKET_ACTIVITY_URL = 'https://data-api.polymarket.com/activity'

const FORWARD_QUERY_KEYS = [
  'market',
  'eventId',
  'type',
  'start',
  'end',
  'sortBy',
  'sortDirection',
  'side'
] as const

export class PolymarketUserQueryError extends Error {
  readonly code: 'missing_user' | 'invalid_user_address'

  constructor(code: 'missing_user' | 'invalid_user_address', message: string) {
    super(message)
    this.name = 'PolymarketUserQueryError'
    this.code = code
  }
}

export function parsePolymarketUserAddress(user: unknown): string {
  if (typeof user !== 'string' || user.trim() === '') {
    throw new PolymarketUserQueryError('missing_user', 'Query parameter "user" is required.')
  }
  const trimmed = user.trim()
  if (!isAddress(trimmed)) {
    throw new PolymarketUserQueryError('invalid_user_address', 'Query parameter "user" must be a valid Ethereum address.')
  }
  return trimmed
}

export function clampPolymarketLimit(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') {
    return 100
  }
  const n = typeof raw === 'number' ? raw : Number(String(raw))
  if (!Number.isFinite(n)) {
    return 100
  }
  return Math.min(500, Math.max(0, Math.floor(n)))
}

export function clampPolymarketOffset(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') {
    return 0
  }
  const n = typeof raw === 'number' ? raw : Number(String(raw))
  if (!Number.isFinite(n)) {
    return 0
  }
  return Math.min(10_000, Math.max(0, Math.floor(n)))
}

function appendForwardedParams(url: URL, query: Record<string, unknown>): void {
  for (const key of FORWARD_QUERY_KEYS) {
    const value = query[key]
    if (value === undefined || value === null || value === '') {
      continue
    }
    if (Array.isArray(value)) {
      url.searchParams.set(key, value.map(String).join(','))
    } else {
      url.searchParams.set(key, String(value))
    }
  }
}

/**
 * Builds the upstream Polymarket Data API URL for GET /activity.
 * @see https://docs.polymarket.com/api-reference/core/get-user-activity
 */
export function buildPolymarketActivityRequestUrl(query: Record<string, unknown>): string {
  const user = parsePolymarketUserAddress(query.user)
  const url = new URL(POLYMARKET_ACTIVITY_URL)
  url.searchParams.set('user', user)
  url.searchParams.set('limit', String(clampPolymarketLimit(query.limit)))
  url.searchParams.set('offset', String(clampPolymarketOffset(query.offset)))
  appendForwardedParams(url, query)
  return url.toString()
}

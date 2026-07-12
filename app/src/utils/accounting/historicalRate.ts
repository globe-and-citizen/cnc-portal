/**
 * Timestamped price-of-record plumbing (spec §2 "Taux", ÉTAPE 2).
 *
 * The ledger must value each entry at the token's USD price **on the day of the
 * transaction** (the block timestamp), not a live/deferred price. These are the
 * pure helpers: the transaction `Date` → day key a price is fetched and cached
 * under, the day set → fetch window, and the resolved price map → the synchronous
 * {@link UsdRateOfRecord} the pipeline consumes. The fetching and caching live in
 * the `useHistoricalTokenRates` composable, so all of this stays unit-testable
 * without Vue or the network.
 */
import type { TokenId } from '@/constant'
import type { UsdRateOfRecord } from './toUsd'

const DAY_SECONDS = 86_400

/** Zero-pad a number to two digits (`3` → `"03"`). */
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * The UTC calendar day of a transaction as `YYYY-MM-DD` — the granularity of the
 * daily rate of record, and the key a price is cached under. UTC (not local) so
 * the same block always maps to the same day regardless of the viewer's timezone.
 */
export function dayKey(at: Date): string {
  return `${at.getUTCFullYear()}-${pad2(at.getUTCMonth() + 1)}-${pad2(at.getUTCDate())}`
}

/**
 * The Unix-seconds window spanning every supplied day, from the first day's 00:00
 * UTC through the end of the last — the `from`/`to` of a single ranged price
 * query. `null` when there is no day to price.
 */
export function dayRangeSeconds(days: readonly string[]): { from: number; to: number } | null {
  if (days.length === 0) return null
  const sorted = [...days].sort()
  const from = Date.parse(`${sorted[0]}T00:00:00Z`) / 1000
  const to = Date.parse(`${sorted[sorted.length - 1]}T00:00:00Z`) / 1000 + DAY_SECONDS
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null
  return { from, to }
}

/** Compose the price-map key for a (token, day) pair. */
export function rateMapKey(tokenId: TokenId, day: string): string {
  return `${tokenId}|${day}`
}

/**
 * Wrap a resolved `${tokenId}|${day}` → USD price map into a synchronous
 * {@link UsdRateOfRecord}. A day still loading (or one the price feed has no point
 * for) falls through to `fallback` — the live price — so the UI shows a
 * best-effort value instead of `$0`; once the day's price lands it wins.
 */
export function makeHistoricalRateOfRecord(
  prices: ReadonlyMap<string, number>,
  fallback?: UsdRateOfRecord
): UsdRateOfRecord {
  return (tokenId, at) => {
    const historical = prices.get(rateMapKey(tokenId, dayKey(at)))
    if (typeof historical === 'number' && historical > 0) return historical
    return fallback ? fallback(tokenId, at) : 0
  }
}

/**
 * Timestamped price-of-record plumbing (spec §2 "Taux", ÉTAPE 2).
 *
 * The ledger must value each entry at the token's USD price **on the day of the
 * transaction** (the block timestamp), not a live/deferred price. These are the
 * pure helpers that turn a transaction `Date` into the day key we fetch and cache
 * a historical price under, and that wrap an already-resolved price map into the
 * synchronous {@link UsdRateOfRecord} the accounting pipeline consumes.
 *
 * The async fetching (CoinGecko `/coins/{id}/history`) and caching live in the
 * `useHistoricalTokenRates` composable; keeping the date math + resolver here
 * makes both unit-testable without Vue or the network.
 */
import type { TokenId } from '@/constant'
import type { UsdRateOfRecord } from './toUsd'

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
 * A `YYYY-MM-DD` day key formatted as CoinGecko's `/coins/{id}/history?date=`
 * expects it: `DD-MM-YYYY`.
 */
export function coingeckoHistoryDate(day: string): string {
  const [year, month, date] = day.split('-')
  return `${date}-${month}-${year}`
}

/** Compose the price-map key for a (token, day) pair. */
export function rateMapKey(tokenId: TokenId, day: string): string {
  return `${tokenId}|${day}`
}

/**
 * Wrap a resolved `${tokenId}|${day}` → USD price map into a synchronous
 * {@link UsdRateOfRecord}. A day still loading (or a token with no historical
 * feed) falls through to `fallback` — e.g. the live price — so the UI shows a
 * best-effort value instead of `$0` while the historical price is in flight;
 * once the day's price lands, the historical rate of record wins.
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

/**
 * `useHistoricalTokenRates` — the timestamped price-of-record source for the
 * accounting ledger (spec §2 "Taux", ÉTAPE 2).
 *
 * Given the set of UTC days a team transacted a non-pegged token on, this fetches
 * their **historical** USD prices from CoinGecko and exposes a
 * `${tokenId}|YYYY-MM-DD` → USD map, which {@link makeHistoricalRateOfRecord}
 * turns into the resolver the pipeline consumes.
 *
 * One request covers the whole day set: `/market_chart/range` returns every price
 * point between two instants, which we bucket by UTC day. Fetching each day
 * separately (`/coins/{id}/history`) would fire one request per transacting day
 * and trip CoinGecko's free-tier rate limit on any real team's history. A past
 * day's price never changes, so the result is cached indefinitely
 * (`staleTime: Infinity`); a failed fetch leaves the map empty and callers fall
 * back to the live price.
 */
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { TokenId } from '@/constant'
import { dayKey, dayRangeSeconds, rateMapKey } from '@/utils/accounting/historicalRate'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

/** CoinGecko ids that don't resolve to a real coin — skip fetching for these. */
const UNKNOWN_COINGECKO_ID = 'unknown'

/** A `/market_chart/range` payload: `[msTimestamp, usdPrice]` points, oldest first. */
interface MarketChartRange {
  prices?: [number, number][]
}

/**
 * Every UTC day in `[from, to)` that CoinGecko has a price point for, as
 * `YYYY-MM-DD` → USD. The API returns daily points beyond a 90-day span and
 * intraday ones below it, so a day is valued at its **first** point — the closest
 * thing to that day's 00:00 UTC open, and what `/coins/{id}/history` would report.
 */
async function fetchDailyUsd(
  coingeckoId: string,
  from: number,
  to: number
): Promise<Map<string, number>> {
  const res = await fetch(
    `${COINGECKO_BASE}/coins/${coingeckoId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`
  )
  if (!res.ok) throw new Error(`CoinGecko market_chart/range failed: ${res.status}`)
  const json = (await res.json()) as MarketChartRange

  const byDay = new Map<string, number>()
  for (const [ms, usd] of json.prices ?? []) {
    if (typeof usd !== 'number' || usd <= 0) continue
    const day = dayKey(new Date(ms))
    if (!byDay.has(day)) byDay.set(day, usd)
  }
  return byDay
}

/**
 * Reactive `${tokenId}|day` → USD price map for the supplied days. Empty while the
 * fetch is in flight, when the token has no CoinGecko id, or when there are no
 * days to price — callers overlay a live-price fallback for those cases.
 */
export function useHistoricalTokenRates(
  tokenId: TokenId,
  coingeckoId: string,
  days: MaybeRefOrGetter<readonly string[]>
): ComputedRef<Map<string, number>> {
  const range = computed(() => dayRangeSeconds(toValue(days)))
  const enabled = computed(
    () => Boolean(coingeckoId) && coingeckoId !== UNKNOWN_COINGECKO_ID && range.value !== null
  )

  const query = useQuery({
    // Keyed by the window, not the day list: two teams whose days span the same
    // range share one fetch, and a day set that only reorders never refetches.
    queryKey: computed(() => ['coingecko-range', coingeckoId, range.value?.from, range.value?.to]),
    queryFn: async () => {
      const window = range.value
      if (!window) return new Map<string, number>()
      const byDay = await fetchDailyUsd(coingeckoId, window.from, window.to)

      const prices = new Map<string, number>()
      for (const day of toValue(days)) {
        const usd = byDay.get(day)
        if (usd !== undefined) prices.set(rateMapKey(tokenId, day), usd)
      }
      return prices
    },
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24
  })

  return computed(() => query.data.value ?? new Map<string, number>())
}

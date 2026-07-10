/**
 * `useHistoricalTokenRates` — the timestamped price-of-record source for the
 * accounting ledger (spec §2 "Taux", ÉTAPE 2).
 *
 * Given the set of UTC days a team transacted a non-pegged token on, this fetches
 * each day's **historical** USD price from CoinGecko's `/coins/{id}/history`
 * endpoint (the price on the block's day, not a live/deferred price) and exposes
 * a `${tokenId}|YYYY-MM-DD` → USD map. The map feeds
 * {@link makeHistoricalRateOfRecord}, which the accounting pipeline consumes as a
 * synchronous {@link UsdRateOfRecord}.
 *
 * The days come from the raw ledger feed, so the query key stays stable once the
 * on-chain events have loaded; a past day's price never changes, so results are
 * cached indefinitely (`staleTime: Infinity`). One aggregated query fetches the
 * whole day set — CoinGecko's free tier is rate-limited, and the day set is small
 * and near-static in practice.
 */
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { TokenId } from '@/constant'
import { coingeckoHistoryDate, rateMapKey } from '@/utils/accounting/historicalRate'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

/** CoinGecko ids that don't resolve to a real coin — skip fetching for these. */
const UNKNOWN_COINGECKO_ID = 'unknown'

/** Fetch a token's USD price on a given UTC day (`YYYY-MM-DD`) from CoinGecko. */
async function fetchHistoricalUsd(coingeckoId: string, day: string): Promise<number | null> {
  const res = await fetch(
    `${COINGECKO_BASE}/coins/${coingeckoId}/history?date=${coingeckoHistoryDate(day)}&localization=false`
  )
  if (!res.ok) throw new Error(`CoinGecko history request failed: ${res.status}`)
  const json = (await res.json()) as { market_data?: { current_price?: { usd?: number } } }
  const usd = json.market_data?.current_price?.usd
  return typeof usd === 'number' ? usd : null
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
  const enabled = computed(
    () => Boolean(coingeckoId) && coingeckoId !== UNKNOWN_COINGECKO_ID && toValue(days).length > 0
  )

  const query = useQuery({
    // Sorted so the same day set (in any discovery order) hits the same cache entry.
    queryKey: computed(() => ['coingecko-history', coingeckoId, [...toValue(days)].sort()]),
    queryFn: async () => {
      const list = [...toValue(days)]
      const priced = await Promise.all(
        list.map(async (day) => [day, await fetchHistoricalUsd(coingeckoId, day)] as const)
      )
      const map = new Map<string, number>()
      for (const [day, usd] of priced) {
        if (typeof usd === 'number' && usd > 0) map.set(rateMapKey(tokenId, day), usd)
      }
      return map
    },
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24
  })

  return computed(() => query.data.value ?? new Map<string, number>())
}

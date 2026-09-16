/** Immutable transaction-date token prices shared through the TanStack Query cache. */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery, type QueryClient } from '@tanstack/vue-query'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import {
  round6,
  utcRateDate,
  type HistoricalRateTarget,
  type UsdRateOfRecord
} from '@/utils/accounting/toUsd'
import { queryClient } from './queryClient'

interface ResolvedHistoricalRateTarget extends HistoricalRateTarget {
  coinId: string
}

interface HistoricalRateResponse {
  market_data?: {
    current_price?: {
      usd?: unknown
    }
  }
}

type HistoricalRateFetcher = (
  input: string,
  init?: RequestInit
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

type HistoricalRateMap = Readonly<Record<string, number>>

export const historicalTokenRateKeys = {
  all: ['historical-token-rate'] as const,
  rate: (coinId: string, date: string) =>
    [...historicalTokenRateKeys.all, { coinId, date, currency: 'usd' }] as const,
  set: (targets: readonly ResolvedHistoricalRateTarget[]) =>
    [
      ...historicalTokenRateKeys.all,
      'set',
      targets.map(({ token, coinId, date }) => ({ token, coinId, date }))
    ] as const
}

const recordKey = (token: TokenId, date: string): string => `${token}:${date}`

function resolvedTargets(targets: readonly HistoricalRateTarget[]): ResolvedHistoricalRateTarget[] {
  const resolved = new Map<string, ResolvedHistoricalRateTarget>()
  for (const target of targets) {
    const coinId = SUPPORTED_TOKENS.find(({ id }) => id === target.token)?.coingeckoId
    if (!coinId || coinId === 'unknown') continue
    resolved.set(recordKey(target.token, target.date), { ...target, coinId })
  }
  return [...resolved.values()].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.coinId.localeCompare(right.coinId) ||
      left.token.localeCompare(right.token)
  )
}

/** Resolve and permanently cache one successful provider snapshot. */
export async function fetchHistoricalTokenRate(
  client: QueryClient,
  coinId: string,
  date: string,
  request: HistoricalRateFetcher = globalThis.fetch
): Promise<number> {
  return client.fetchQuery({
    queryKey: historicalTokenRateKeys.rate(coinId, date),
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async ({ signal }) => {
      const url = new URL(
        `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/history`
      )
      url.searchParams.set('date', date)
      url.searchParams.set('localization', 'false')
      const response = await request(url.toString(), { signal })
      if (!response.ok) throw new Error(`Historical USD rate unavailable for ${coinId} on ${date}`)

      const body = (await response.json()) as HistoricalRateResponse
      const rate = body.market_data?.current_price?.usd
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
        throw new Error(`Historical USD rate unavailable for ${coinId} on ${date}`)
      }
      return round6(rate)
    }
  })
}

/**
 * Load all transaction-date snapshots needed by the current raw feed.
 *
 * The aggregate query remains retryable. Each successful atomic snapshot stays
 * immutable forever; failed snapshots resolve to zero here so the journal can
 * retain the movement and expose `rate-unavailable` instead of disappearing.
 */
export function useHistoricalTokenRatesQuery(
  targets: MaybeRefOrGetter<readonly HistoricalRateTarget[]>,
  enabled: MaybeRefOrGetter<boolean> = true
) {
  const requested = computed(() => resolvedTargets(toValue(targets)))
  const query = useQuery<HistoricalRateMap>({
    queryKey: computed(() => historicalTokenRateKeys.set(requested.value)),
    enabled: computed(() => toValue(enabled) && requested.value.length > 0),
    queryFn: async () => {
      const pairs = await Promise.all(
        requested.value.map(async (target) => {
          try {
            const rate = await fetchHistoricalTokenRate(queryClient, target.coinId, target.date)
            return [recordKey(target.token, target.date), rate] as const
          } catch {
            return [recordKey(target.token, target.date), 0] as const
          }
        })
      )
      return Object.fromEntries(pairs)
    }
  })

  const rateOfRecord: UsdRateOfRecord = (token, at) =>
    toValue(query.data)?.[recordKey(token, utcRateDate(at))] ?? 0

  return {
    rateOfRecord,
    isLoading: computed(
      () => Boolean(toValue(query.isLoading)) || Boolean(toValue(query.isFetching))
    ),
    refetch: () => query.refetch?.() ?? Promise.resolve(undefined)
  }
}

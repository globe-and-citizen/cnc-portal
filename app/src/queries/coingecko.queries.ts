/** All CoinGecko query/cache boundaries; HTTP reads live in lib/coingecko.ts. */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery, type QueryClient } from '@tanstack/vue-query'
import { SUPPORTED_TOKENS } from '@/constant'
import type { AssetId, AssetMetadata } from '@/utils/tokens/assets'
import {
  utcRateDate,
  type HistoricalRateTarget,
  type UsdRateOfRecord
} from '@/utils/accounting/toUsd'
import {
  COINGECKO_POLYGON_CHAIN_ID,
  getCoinGeckoAssetMarket,
  getCoinGeckoHistoricalRate,
  getCoinGeckoTokenPrice,
  type AssetMarket,
  type AssetMarketFetcher,
  type HistoricalRateFetcher
} from '@/lib/coingecko'
import { failureDetails } from '@/lib/externalReads'
import { queryClient } from './queryClient'
import { queryPresets } from './queryFactory'

/** Current supported-token prices retain their five-minute recovery cadence. */
export function useGetTokenPriceQuery(coinId: string) {
  return useQuery({
    ...queryPresets.moderate,
    queryKey: ['price', coinId],
    queryFn: ({ signal }) => getCoinGeckoTokenPrice(coinId, signal),
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      const { status } = failureDetails(error)
      return failureCount < 1 && (status === undefined || status >= 500)
    },
    retryDelay: 5000
  })
}

export async function fetchAssetMarket(
  client: QueryClient,
  asset: Pick<AssetMetadata, 'chainId' | 'address'>,
  request?: AssetMarketFetcher
): Promise<AssetMarket> {
  if (asset.chainId !== COINGECKO_POLYGON_CHAIN_ID)
    throw new Error('Asset market network unavailable')
  return client.fetchQuery({
    queryKey: ['asset-market', asset.chainId, asset.address.toLowerCase()],
    ...queryPresets.moderate,
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    retry: false,
    queryFn: ({ signal }) => getCoinGeckoAssetMarket(asset, signal, request)
  })
}

export async function fetchAssetCoinId(client: QueryClient, token: string): Promise<string> {
  const [, chain, address] = token.split(':')
  if (!address) throw new Error('Asset contract unavailable')
  return client.fetchQuery({
    ...queryPresets.once,
    queryKey: ['asset-coin-id', Number(chain), address.toLowerCase()],
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: false,
    queryFn: async () =>
      (await fetchAssetMarket(client, { chainId: Number(chain), address })).coinId
  })
}

interface ResolvedHistoricalRateTarget extends HistoricalRateTarget {
  coinId: string
}

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

const recordKey = (token: AssetId, date: string): string => `${token}:${date}`

function resolvedTargets(targets: readonly HistoricalRateTarget[]): ResolvedHistoricalRateTarget[] {
  const resolved = new Map<string, ResolvedHistoricalRateTarget>()
  for (const target of targets) {
    const coinId = target.token.startsWith('erc20:')
      ? target.token
      : SUPPORTED_TOKENS.find(({ id }) => id === target.token)?.coingeckoId
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
  request?: HistoricalRateFetcher
): Promise<number> {
  return client.fetchQuery({
    ...queryPresets.once,
    queryKey: historicalTokenRateKeys.rate(coinId, date),
    staleTime: Infinity,
    retry: false,
    gcTime: Infinity,
    queryFn: ({ signal }) => getCoinGeckoHistoricalRate(coinId, date, signal, request)
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
    ...queryPresets.moderate,
    queryKey: computed(() => historicalTokenRateKeys.set(requested.value)),
    enabled: computed(() => toValue(enabled) && requested.value.length > 0),
    staleTime: 24 * 60 * 60_000,
    refetchInterval: 24 * 60 * 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    gcTime: 24 * 60 * 60_000,
    queryFn: async () => {
      const pairs = await Promise.all(
        requested.value.map(async (target) => {
          try {
            const coinId = target.token.startsWith('erc20:')
              ? await fetchAssetCoinId(queryClient, target.token)
              : target.coinId
            const rate = await fetchHistoricalTokenRate(queryClient, coinId, target.date)
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

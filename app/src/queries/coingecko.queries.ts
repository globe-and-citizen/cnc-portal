/** CoinGecko HTTP requests and query/cache boundaries. */
import { isAxiosError, type AxiosError } from 'axios'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery, type QueryClient } from '@tanstack/vue-query'
import { SUPPORTED_TOKENS } from '@/constant'
import externalApiClient from '@/lib/external.axios'
import type {
  TokenPriceResponse,
  CoinGeckoAssetMarketResponse,
  CoinGeckoHistoricalResponse
} from '@/types/coingecko'
import type { AssetId, AssetMetadata } from '@/utils/tokens/assets'
import {
  utcRateDate,
  type HistoricalRateTarget,
  type UsdRateOfRecord
} from '@/utils/accounting/toUsd'
import {
  COINGECKO_POLYGON_CHAIN_ID,
  assetMarketFromResponse,
  historicalRateFromResponse,
  retryAfterDelay,
  type AssetMarket
} from '@/utils/tokens/coingecko'
import { queryClient } from './queryClient'
import { queryPresets } from './queryFactory'
import {
  CoinGeckoPausedError,
  waitForCoinGeckoRequest,
  pauseCoinGeckoRequests
} from './coingecko.request-policy'

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3'

/** Keep the raw HTTP boundary in this module; a 429 pauses subsequent admissions. */
async function getCoinGeckoResponse<T>(url: string, signal?: AbortSignal): Promise<T> {
  const release = await waitForCoinGeckoRequest(signal)
  try {
    const { data } = await externalApiClient.get<T>(url, { signal })
    return data
  } catch (error) {
    const failure = error as AxiosError
    if ((failure.response?.status ?? failure.status) === 429) {
      pauseCoinGeckoRequests(failure.response?.headers?.['retry-after'])
    }
    throw error
  } finally {
    release()
  }
}

type AssetMarketFetcher = (
  url: string,
  signal?: AbortSignal
) => Promise<{ data: CoinGeckoAssetMarketResponse }>
type HistoricalRateFetcher = (
  url: string,
  signal?: AbortSignal
) => Promise<{ data: CoinGeckoHistoricalResponse }>

/** Fetch the unmodified current-price response for a configured provider coin. */
export async function getCoinGeckoTokenPrice(coinId: string, signal?: AbortSignal) {
  return getCoinGeckoResponse<TokenPriceResponse>(
    `${COINGECKO_API_URL}/coins/${encodeURIComponent(coinId)}`,
    signal
  )
}

/** Fetch the unmodified Polygon contract-market response. */
export async function getCoinGeckoAssetMarket(address: string, signal?: AbortSignal) {
  return getCoinGeckoResponse<CoinGeckoAssetMarketResponse>(
    `${COINGECKO_API_URL}/coins/polygon-pos/contract/${encodeURIComponent(address.toLowerCase())}`,
    signal
  )
}

/** Fetch the unmodified historical response for one provider coin and UTC date. */
export async function getCoinGeckoHistoricalRate(
  coinId: string,
  date: string,
  signal?: AbortSignal
) {
  const url = new URL(`${COINGECKO_API_URL}/coins/${encodeURIComponent(coinId)}/history`)
  url.searchParams.set('date', date)
  url.searchParams.set('localization', 'false')
  return getCoinGeckoResponse<CoinGeckoHistoricalResponse>(url.toString(), signal)
}

/** Current supported-token prices retain their five-minute recovery cadence. */
export function useGetTokenPriceQuery(coinId: string) {
  return useQuery({
    ...queryPresets.moderate,
    queryKey: ['price', coinId],
    queryFn: ({ signal }) => getCoinGeckoTokenPrice(coinId, signal),
    gcTime: 30 * 60_000,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof CoinGeckoPausedError) return false
      const failure = error as AxiosError
      const status = failure.response?.status ?? failure.status
      return failureCount < 1 && (status === undefined || status >= 500)
    },
    retryDelay: 5000 // One transient-error retry; HTTP 429 is not retried here.
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
    ...queryPresets.moderate,
    queryKey: ['asset-market', asset.chainId, asset.address.toLowerCase()],
    gcTime: 30 * 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const body = request
        ? (
            await request(
              `${COINGECKO_API_URL}/coins/polygon-pos/contract/${encodeURIComponent(asset.address.toLowerCase())}`,
              signal
            )
          ).data
        : await getCoinGeckoAssetMarket(asset.address, signal)
      return assetMarketFromResponse(body, asset.address)
    }
  })
}

export async function fetchAssetCoinId(client: QueryClient, token: string): Promise<string> {
  const [, chain, address] = token.split(':')
  if (!address) throw new Error('Asset contract unavailable')
  return client.fetchQuery({
    ...queryPresets.once,
    queryKey: ['asset-coin-id', Number(chain), address.toLowerCase()],
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

interface HistoricalRateSet {
  rates: HistoricalRateMap
  /** Present only while a provider/transport failure needs delayed recovery. */
  retryAfterMs?: number
}

export const historicalTokenRateKeys = {
  all: ['historical-token-rate'] as const,
  rate: (coinId: string, date: string) =>
    [...historicalTokenRateKeys.all, { coinId, date, currency: 'usd' }] as const,
  set: (targets: readonly ResolvedHistoricalRateTarget[]) =>
    [
      ...historicalTokenRateKeys.all,
      'batch',
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
    retry: false,
    gcTime: Infinity,
    queryFn: async ({ signal }) => {
      let body: CoinGeckoHistoricalResponse
      if (request) {
        const url = new URL(`${COINGECKO_API_URL}/coins/${encodeURIComponent(coinId)}/history`)
        url.searchParams.set('date', date)
        url.searchParams.set('localization', 'false')
        body = (await request(url.toString(), signal)).data
      } else {
        body = await getCoinGeckoHistoricalRate(coinId, date, signal)
      }
      return historicalRateFromResponse(body, coinId, date)
    }
  })
}

/**
 * Load all transaction-date snapshots needed by the current raw feed.
 *
 * Successful snapshots remain immutable. Stop the batch on throttling or transport
 * failures and recover after at least one minute; terminal/missing rates stay
 * explicit gaps and are checked daily or on an explicit Accounting refresh.
 */
export function useHistoricalTokenRatesQuery(
  targets: MaybeRefOrGetter<readonly HistoricalRateTarget[]>,
  enabled: MaybeRefOrGetter<boolean> = true
) {
  const requested = computed(() => resolvedTargets(toValue(targets)))
  const query = useQuery<HistoricalRateSet>({
    ...queryPresets.moderate,
    queryKey: computed(() => historicalTokenRateKeys.set(requested.value)),
    enabled: computed(() => toValue(enabled) && requested.value.length > 0),
    refetchInterval: (query) => query.state.data?.retryAfterMs ?? 24 * 60 * 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    gcTime: 24 * 60 * 60_000,
    queryFn: async ({ signal }) => {
      const targets = requested.value
      const previous = queryClient.getQueryData<HistoricalRateSet>(
        historicalTokenRateKeys.set(targets)
      )?.rates
      const rates: Record<string, number> = Object.fromEntries(
        targets.map((target) => [
          recordKey(target.token, target.date),
          previous?.[recordKey(target.token, target.date)] ?? 0
        ])
      )
      for (const target of targets) {
        signal?.throwIfAborted()
        if (rates[recordKey(target.token, target.date)]! > 0) continue
        try {
          const coinId = target.token.startsWith('erc20:')
            ? await fetchAssetCoinId(queryClient, target.token)
            : target.coinId
          rates[recordKey(target.token, target.date)] = await fetchHistoricalTokenRate(
            queryClient,
            coinId,
            target.date
          )
        } catch (error) {
          signal?.throwIfAborted()
          if (error instanceof CoinGeckoPausedError)
            return { rates, retryAfterMs: error.retryAfterMs }
          const failure = error as AxiosError
          const status = failure.response?.status ?? failure.status
          if (
            status === 429 ||
            (status !== undefined && status >= 500) ||
            (isAxiosError(error) && !error.response)
          )
            return {
              rates,
              retryAfterMs: retryAfterDelay(failure.response?.headers?.['retry-after'], Date.now())
            }
        }
      }
      return { rates }
    }
  })

  const rateOfRecord: UsdRateOfRecord = (token, at) =>
    toValue(query.data)?.rates[recordKey(token, utcRateDate(at))] ?? 0

  return {
    rateOfRecord,
    isLoading: computed(
      () => Boolean(toValue(query.isLoading)) || Boolean(toValue(query.isFetching))
    ),
    refetch: () => query.refetch?.() ?? Promise.resolve(undefined)
  }
}

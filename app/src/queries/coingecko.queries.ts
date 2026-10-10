/** CoinGecko endpoints return raw Axios responses cached by TanStack Query. */
import { useQueries, useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import externalApiClient from '@/lib/external.axios'
import type {
  TokenPriceResponse,
  CoinGeckoAssetMarketResponse,
  CoinGeckoHistoricalResponse
} from '@/types/coingecko'
import {
  COINGECKO_POLYGON_CHAIN_ID,
  assetMarketFromResponse,
  historicalRateFromResponse
} from '@/utils/tokens/coingecko'
import { queryPresets } from './queryFactory'

export interface CoinGeckoHistoricalTarget {
  coinId: string
  date: string
}

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3'

export const historicalTokenRateKeys = {
  all: ['historical-token-rate'] as const,
  rate: (coinId: string, date: string) =>
    [...historicalTokenRateKeys.all, { coinId, date, currency: 'usd' }] as const
}

/** Current prices refresh every five minutes in active tabs. */
export function useGetTokenPriceQuery(coinId: string) {
  return useQuery({
    ...queryPresets.moderate,
    queryKey: ['price', coinId],
    queryFn: async ({ signal }) => {
      const { data } = await externalApiClient.get<TokenPriceResponse>(
        `${COINGECKO_API_URL}/coins/${encodeURIComponent(coinId)}`,
        { signal }
      )
      return data
    },
    gcTime: 30 * 60_000,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    retry: false
  })
}

/** Resolve contract metadata only on the supported provider platform. */
export function useGetAssetMarketsQuery(
  assets: MaybeRefOrGetter<readonly { chainId: number; address: string }[]>,
  enabled: MaybeRefOrGetter<boolean> = true
) {
  return useQueries({
    queries: computed(() =>
      toValue(assets).map(({ chainId, address }) => ({
        ...queryPresets.once,
        queryKey: ['asset-market', chainId, address.toLowerCase()],
        enabled: toValue(enabled) && chainId === COINGECKO_POLYGON_CHAIN_ID && !!address,
        gcTime: 24 * 60 * 60_000,
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          const { data } = await externalApiClient.get<CoinGeckoAssetMarketResponse>(
            `${COINGECKO_API_URL}/coins/polygon-pos/contract/${encodeURIComponent(address.toLowerCase())}`,
            { signal }
          )
          assetMarketFromResponse(data, address)
          return data
        }
      }))
    ),
    combine: (queries) => queries.map((query, index) => ({ ...query, ...toValue(assets)[index]! }))
  })
}

/** Each coin/date has its own immutable snapshot and independent error state. */
export function useGetHistoricalTokenRatesQuery(
  targets: MaybeRefOrGetter<readonly CoinGeckoHistoricalTarget[]>,
  enabled: MaybeRefOrGetter<boolean> = true
) {
  return useQueries({
    queries: computed(() =>
      toValue(targets).map(({ coinId, date }) => ({
        ...queryPresets.once,
        queryKey: historicalTokenRateKeys.rate(coinId, date),
        enabled: toValue(enabled) && !!coinId && !!date,
        gcTime: Infinity,
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          const { data } = await externalApiClient.get<CoinGeckoHistoricalResponse>(
            `${COINGECKO_API_URL}/coins/${encodeURIComponent(coinId)}/history`,
            { signal, params: { date, localization: false } }
          )
          historicalRateFromResponse(data, coinId, date)
          return data
        }
      }))
    ),
    combine: (queries) => queries.map((query, index) => ({ ...query, ...toValue(targets)[index]! }))
  })
}

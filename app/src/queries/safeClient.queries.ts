import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { isAddress } from 'viem'
import { currentChainId } from '@/constant'
import {
  SAFE_CLIENT_URL,
  type SafeClientBalances,
  type SafeClientTransactionHistory
} from '@/types/safe'
import externalApiClient from '@/lib/external.axios'
import { normalizeSafeAddress } from '@/utils/safe/address'
import { safeKeys } from './safe.queries'
import {
  retrySafeIndexingRead,
  safeIndexingRetryDelay,
  retrySafeRead,
  safeReadRetryDelay
} from './safe.recovery'
import { queryPresets } from './queryFactory'

export interface GetSafeBalancesParams {
  pathParams: {
    safeAddress: MaybeRefOrGetter<string | undefined>
    chainId?: MaybeRefOrGetter<number>
    fiatCode?: MaybeRefOrGetter<string>
  }
}

export interface GetSafeTransactionHistoryQueryParams {
  cursor?: string
  timezone?: string
  trusted?: boolean
  imitation?: boolean
}

export interface GetSafeTransactionHistoryParams {
  pathParams: {
    safeAddress: MaybeRefOrGetter<string | undefined>
    chainId?: MaybeRefOrGetter<number>
  }
  queryParams?: MaybeRefOrGetter<GetSafeTransactionHistoryQueryParams>
}

/** Gateway keys remain under the existing balance and transaction invalidation prefixes. */
export const safeClientKeys = {
  balances: (address: string | undefined, chainId: number, fiatCode: string) =>
    [...safeKeys.balance(address, chainId), 'safe-client', fiatCode.toUpperCase()] as const,
  history: (
    address: string | undefined,
    chainId: number,
    queryParams?: GetSafeTransactionHistoryQueryParams
  ) =>
    [
      ...safeKeys.transactions(address),
      'safe-client',
      'history',
      { chainId, ...queryParams }
    ] as const
}

/** Fetch the Gateway holdings response, rejecting malformed bodies rather than inventing an empty wallet. */
export async function fetchSafeClientBalances(
  address: string,
  chainId: number,
  fiatCode: string,
  signal?: AbortSignal
): Promise<SafeClientBalances> {
  const url = `${SAFE_CLIENT_URL}/v1/chains/${chainId}/safes/${normalizeSafeAddress(address)}/balances/${encodeURIComponent(fiatCode.toUpperCase())}?exclude_spam=true&trusted=false`
  const { data } = await externalApiClient.get<SafeClientBalances>(url, { signal })
  if (!data || !Array.isArray(data.items) || typeof data.fiatTotal !== 'string')
    throw new Error('Safe balances response unavailable')
  return data
}

/**
 * Read native/ERC-20 holdings and current fiat valuations in one Gateway request.
 * @endpoint GET /v1/chains/{chainId}/safes/{safeAddress}/balances/{fiatCode}
 * @queryParams trusted=false, exclude_spam=true
 */
export function safeBalancesQueryOptions(
  address: string | undefined,
  chainId: number,
  fiatCode: string
) {
  return {
    ...queryPresets.moderate,
    queryKey: safeClientKeys.balances(address, chainId, fiatCode),
    enabled: Boolean(address && isAddress(address)),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchSafeClientBalances(address!, chainId, fiatCode, signal),
    gcTime: 30 * 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: retrySafeIndexingRead,
    retryDelay: safeIndexingRetryDelay
  }
}

export function useGetSafeBalancesQuery(params: GetSafeBalancesParams) {
  return useQuery(
    computed(() =>
      safeBalancesQueryOptions(
        toValue(params.pathParams.safeAddress),
        toValue(params.pathParams.chainId) ?? currentChainId,
        (toValue(params.pathParams.fiatCode) ?? 'USD').toUpperCase()
      )
    )
  )
}

/**
 * Read one raw Safe transaction-history page, including date labels and pagination links.
 * @endpoint GET /v1/chains/{chainId}/safes/{safeAddress}/transactions/history
 * @queryParams cursor, timezone, trusted, imitation
 */
export function useGetSafeTransactionHistoryQuery(params: GetSafeTransactionHistoryParams) {
  return useQuery(
    computed(() => {
      const address = toValue(params.pathParams.safeAddress)
      const chainId = toValue(params.pathParams.chainId) ?? currentChainId
      const queryParams = toValue(params.queryParams)
      return {
        ...queryPresets.moderate,
        queryKey: safeClientKeys.history(address, chainId, queryParams),
        enabled: Boolean(address && isAddress(address)),
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          if (!address) throw new Error('Missing Safe address')
          const { data } = await externalApiClient.get<SafeClientTransactionHistory>(
            `${SAFE_CLIENT_URL}/v1/chains/${chainId}/safes/${normalizeSafeAddress(address)}/transactions/history`,
            { signal, params: queryParams }
          )
          if (!data || !Array.isArray(data.results))
            throw new Error('Safe transaction history response unavailable')
          return data
        },
        refetchInterval: 300_000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        retry: retrySafeRead,
        retryDelay: safeReadRetryDelay
      }
    })
  )
}

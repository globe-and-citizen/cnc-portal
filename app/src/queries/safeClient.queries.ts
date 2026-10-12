import { useQuery } from '@tanstack/vue-query'
import type { AxiosError } from 'axios'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { isAddress } from 'viem'
import { currentChainId } from '@/constant'
import { SAFE_CLIENT_URL, type SafeClientBalances } from '@/types/safe'
import externalApiClient from '@/lib/external.axios'
import { normalizeSafeAddress } from '@/utils/safe/address'
import { safeKeys } from './safe.queries'
import { queryPresets } from './queryFactory'

export interface GetSafeBalancesParams {
  pathParams: {
    safeAddress: MaybeRefOrGetter<string | undefined>
    chainId?: MaybeRefOrGetter<number>
    fiatCode?: MaybeRefOrGetter<string>
  }
}

/** Cache identity includes fiat currency and remains under the existing wallet balance prefix. */
export const safeClientKeys = {
  balances: (address: string | undefined, chainId: number, fiatCode: string) =>
    [...safeKeys.balance(address, chainId), 'safe-client', fiatCode.toUpperCase()] as const
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
export function useGetSafeBalancesQuery(params: GetSafeBalancesParams) {
  const address = computed(() => toValue(params.pathParams.safeAddress))
  const chainId = computed(() => toValue(params.pathParams.chainId) ?? currentChainId)
  const fiatCode = computed(() => (toValue(params.pathParams.fiatCode) ?? 'USD').toUpperCase())
  return useQuery<SafeClientBalances>({
    ...queryPresets.moderate,
    queryKey: computed(() => safeClientKeys.balances(address.value, chainId.value, fiatCode.value)),
    enabled: computed(() => Boolean(address.value && isAddress(address.value))),
    queryFn: ({ signal }) =>
      fetchSafeClientBalances(address.value!, chainId.value, fiatCode.value, signal),
    gcTime: 30 * 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const failure = error as AxiosError
      return failureCount < 1 && (failure.response?.status ?? failure.status ?? 500) >= 500
    },
    retryDelay: 5000 // One transient-error retry; HTTP 429 waits for the normal refresh.
  })
}

import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { isAddress } from 'viem'
import { currentChainId } from '@/constant'
import type { SafeClientBalances } from '@/types/safe'
import { failureDetails } from '@/lib/externalReads'
import { fetchSafeClientBalances } from '@/lib/safeReads'
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
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      failureCount < 1 && (failureDetails(error).status ?? 500) >= 500,
    retryDelay: 5000
  })
}

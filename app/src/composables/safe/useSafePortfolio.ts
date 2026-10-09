/** Discover held ERC-20s from complete Safe movements and read their current on-chain balance. */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { useGetSafeTransfersQuery, useGetSafePortfolioAssetsQuery } from '@/queries/safe.queries'
import { currentChainId } from '@/constant'
import { normalizeSafeAddress } from '@/utils/safe/address'
import { failureDetails } from '@/lib/externalReads'

import { discoverSafeAssets } from '@/utils/safe/assetDiscovery'

export function useSafePortfolio(address: MaybeRefOrGetter<Address | undefined>) {
  const safeAddress = computed(() => {
    const value = toValue(address)
    return value ? normalizeSafeAddress(value) : undefined
  })
  const supported = useContractBalance(safeAddress, {
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const { status } = failureDetails(error)
      return failureCount < 1 && (status === undefined || status >= 500)
    },
    retryDelay: 5000
  })
  const transfers = useGetSafeTransfersQuery({ pathParams: { safeAddress: address } })
  const discovered = computed(() => discoverSafeAssets(transfers.data.value ?? [], currentChainId))
  const assets = useGetSafePortfolioAssetsQuery(
    safeAddress,
    discovered,
    () => transfers.data.value !== undefined
  )
  const isIncomplete = computed(
    () =>
      Boolean(supported.error.value) ||
      !supported.data.value ||
      supported.data.value.balances.some(
        (row) =>
          row.raw !== 0n && (!Number.isFinite(row.price.usd.value) || row.price.usd.value <= 0)
      ) ||
      Boolean(transfers.error.value) ||
      Boolean(assets.error.value) ||
      !transfers.data.value ||
      !assets.data.value ||
      assets.data.value.some((row) => row.valueUsd === null)
  )
  const totalUsd = computed(() =>
    !isIncomplete.value && supported.data.value
      ? supported.data.value.total.usd.value +
        (assets.data.value ?? []).reduce((sum, row) => sum + (row.valueUsd ?? 0), 0)
      : undefined
  )
  return {
    supported,
    assets,
    totalUsd,
    isIncomplete,
    isLoading: computed(
      () => supported.isLoading.value || transfers.isLoading.value || assets.isLoading.value
    ),
    refetch: () => Promise.allSettled([supported.refetch(), transfers.refetch(), assets.refetch()])
  }
}

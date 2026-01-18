import { computed, unref, type MaybeRef } from 'vue'
import { formatUnits, isAddress, type Address } from 'viem'
import { useQuery } from '@tanstack/vue-query'
import { useTeamStore } from '@/stores'
import { useCurrencyStore } from '@/stores/currencyStore'
import { formatCurrencyShort } from '@/utils/currencyUtil'
import apiClient from '@/lib/axios'
import type { SafeInfo, SafeBalanceItem, SafeDetails, SafeFiatTotal } from './types'
import { TX_SERVICE_BY_CHAIN, CHAIN_NAMES } from './types'

const SAFE_STALE_TIME = 300_000 // reduce auto refetches (5 minutes)

import type { AxiosError } from 'axios'

async function fetchSafeBalance(
  txServiceUrl: string,
  safeAddress: string,
  nativeSymbol: string
): Promise<{ balance: string; symbol: string }> {
  try {
    const { data } = await apiClient.get<SafeBalanceItem[]>(
      `${txServiceUrl}/api/v1/safes/${safeAddress}/balances/`
    )
    const native = data.find((item) => item.tokenAddress === null)
    if (!native) return { balance: '0', symbol: nativeSymbol }
    const decimals = native.token?.decimals ?? 18
    const symbol = native.token?.symbol || nativeSymbol
    const balance = formatUnits(BigInt(native.balance || '0'), decimals)
    return { balance, symbol }
  } catch (error) {
    const axiosError = error as AxiosError
    const apiMessage =
      axiosError.response?.data && typeof axiosError.response.data === 'object'
        ? (axiosError.response.data as { message?: string }).message
        : undefined
    const message = apiMessage || axiosError.message || 'Failed to fetch balance'
    console.error('Failed to fetch balance:', message, error)
    throw new Error(message)
  }
}

async function fetchSafeDetails(txServiceUrl: string, safeAddress: string): Promise<SafeDetails> {
  try {
    const { data } = await apiClient.get<{ owners?: string[]; threshold?: number }>(
      `${txServiceUrl}/api/v1/safes/${safeAddress}/`
    )
    return {
      owners: data.owners || [],
      threshold: data.threshold || 1
    }
  } catch (error) {
    const axiosError = error as AxiosError
    const apiMessage =
      axiosError.response?.data && typeof axiosError.response.data === 'object'
        ? (axiosError.response.data as { message?: string }).message
        : undefined
    const message = apiMessage || axiosError.message || 'Failed to fetch Safe details'
    console.error('Failed to fetch Safe details:', message, error)
    throw new Error(message)
  }
}

/**
 * Safe app URL helpers
 */
export function useSafeAppUrls() {
  const getSafeHomeUrl = (chainId: number, safeAddress: Address): string => {
    const chainName = CHAIN_NAMES[chainId] || 'ethereum'
    return `https://app.safe.global/home?safe=${chainName}:${safeAddress}`
  }
  const getSafeSettingsUrl = (chainId: number, safeAddress: string): string => {
    const chainName = CHAIN_NAMES[chainId] || 'ethereum'
    return `https://app.safe.global/settings/setup?safe=${chainName}:${safeAddress}`
  }
  const openSafeAppUrl = (url: string): void => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  return {
    getSafeHomeUrl,
    getSafeSettingsUrl,
    openSafeAppUrl
  }
}

/**
 * Safe contract read operations - using TanStack Query for reactivity
 */
export function useSafeReads() {
  const teamStore = useTeamStore()
  const currencyStore = useCurrencyStore()

  const safeAddress = computed(() => {
    const teamData = teamStore.currentTeamMeta?.data
    return teamData?.safeAddress as Address | undefined
  })

  const isSafeAddressValid = computed(() => {
    const address = safeAddress.value
    return !!address && isAddress(address)
  })

  const resolveSafeAddress = (addressRef?: MaybeRef<Address | undefined>): Address | undefined => {
    const providedAddress = addressRef ? unref(addressRef) : undefined
    return providedAddress || safeAddress.value
  }

  /**
   * Get Safe info for current team (TanStack Query)
   */
  const useSafeInfo = (chainId: MaybeRef<number>, addressRef?: MaybeRef<Address | undefined>) => {
    const address = computed(() => resolveSafeAddress(addressRef))
    const currentChainId = computed(() => unref(chainId))

    const query = useQuery<SafeInfo>({
      queryKey: computed(() =>
        address.value && currentChainId.value
          ? ['safeInfo', currentChainId.value, address.value]
          : ['safeInfo', 'disabled']
      ),
      enabled: computed(() => !!(address.value && isAddress(address.value))),
      queryFn: async () => {
        const addr = address.value
        const chainId = currentChainId.value
        if (!addr || !isAddress(addr)) throw new Error('Invalid Safe address')
        const txService = TX_SERVICE_BY_CHAIN[chainId]
        if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

        const [balanceData, detailsData] = await Promise.all([
          fetchSafeBalance(txService.url, addr, txService.nativeSymbol),
          fetchSafeDetails(txService.url, addr)
        ])

        // Compute fiat totals based on native token prices
        const nativePrices = currencyStore.getTokenInfo('native')?.prices ?? []
        const numericBalance = Number(balanceData.balance ?? 0)
        const totals: Record<string, SafeFiatTotal> = {}
        for (const price of nativePrices) {
          if (price.price == null) continue
          const value = numericBalance * (price.price ?? 0)
          totals[price.code] = {
            value,
            formated: formatCurrencyShort(value, price.code),
            id: price.id,
            code: price.code,
            symbol: price.symbol,
            price: price.price ?? 0,
            formatedPrice: formatCurrencyShort(price.price ?? 0, price.code)
          }
        }

        return {
          address: addr,
          chain: txService.chain,
          balance: balanceData.balance,
          symbol: balanceData.symbol,
          totals,
          owners: detailsData.owners,
          threshold: detailsData.threshold
        }
      },
      staleTime: 300_000,
      gcTime: 300_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: 300_000
    })

    return {
      safeInfo: computed(() => query.data.value ?? null),
      isLoading: computed(() => query.isLoading.value || query.isFetching.value),
      error: computed(() => {
        const err = query.error.value
        return err ? (err instanceof Error ? err.message : 'Failed to load Safe info') : null
      }),
      fetchSafeInfo: query.refetch
    }
  }

  /**
   * Get Safe owners for current team (TanStack Query)
   */
  const useSafeOwners = (chainId: MaybeRef<number>, addressRef?: MaybeRef<Address | undefined>) => {
    const address = computed(() => resolveSafeAddress(addressRef))
    const currentChainId = computed(() => unref(chainId))

    const query = useQuery<string[]>({
      queryKey: computed(() =>
        address.value && currentChainId.value
          ? ['safeOwners', currentChainId.value, address.value]
          : ['safeOwners', 'disabled']
      ),
      enabled: computed(() => !!(address.value && isAddress(address.value))),
      queryFn: async () => {
        const addr = address.value
        const chainId = currentChainId.value
        if (!addr || !isAddress(addr)) throw new Error('Invalid Safe address')
        const txService = TX_SERVICE_BY_CHAIN[chainId]
        if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)
        const details = await fetchSafeDetails(txService.url, addr)
        return details.owners
      },
      staleTime: Infinity,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      gcTime: 300_000
    })

    return {
      owners: computed(() => query.data.value ?? []),
      isLoading: computed(() => query.isLoading.value || query.isFetching.value),
      error: computed(() => {
        const err = query.error.value
        return err ? (err instanceof Error ? err.message : 'Failed to load Safe owners') : null
      }),
      fetchOwners: query.refetch
    }
  }

  /**
   * Get Safe threshold for current team (TanStack Query)
   */
  const useSafeThreshold = (
    chainId: MaybeRef<number>,
    addressRef?: MaybeRef<Address | undefined>
  ) => {
    const address = computed(() => resolveSafeAddress(addressRef))
    const currentChainId = computed(() => unref(chainId))

    const query = useQuery<number>({
      queryKey: computed(() =>
        address.value && currentChainId.value
          ? ['safeThreshold', currentChainId.value, address.value]
          : ['safeThreshold', 'disabled']
      ),
      enabled: computed(() => !!(address.value && isAddress(address.value))),
      queryFn: async () => {
        const addr = address.value
        const chainId = currentChainId.value
        if (!addr || !isAddress(addr)) throw new Error('Invalid Safe address')
        const txService = TX_SERVICE_BY_CHAIN[chainId]
        if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)
        const details = await fetchSafeDetails(txService.url, addr)
        return details.threshold
      },
      staleTime: SAFE_STALE_TIME,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false
    })

    return {
      threshold: computed(() => query.data.value ?? 1),
      isLoading: computed(() => query.isLoading.value || query.isFetching.value),
      error: computed(() => {
        const err = query.error.value
        return err ? (err instanceof Error ? err.message : 'Failed to load Safe threshold') : null
      }),
      fetchThreshold: query.refetch
    }
  }

  return {
    safeAddress,
    isSafeAddressValid,
    useSafeInfo,
    useSafeOwners,
    useSafeThreshold,
    useSafeAppUrls
  }
}

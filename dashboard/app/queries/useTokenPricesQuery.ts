import { useQuery } from '@tanstack/vue-query'
import { useChainId } from '@wagmi/vue'
import { mainnet, sepolia, polygon, polygonAmoy, hardhat } from '@wagmi/vue/chains'
import { fetchTokenPrices, type TokenPrices } from '@/api/coingecko'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

const CACHE_DURATION = 3600000 // 1 hour in milliseconds

// Map chain IDs to CoinGecko IDs
const CHAIN_TO_COINGECKO: Record<number, string> = {
  [mainnet.id]: 'ethereum',
  [sepolia.id]: 'ethereum',
  [polygon.id]: 'polygon-ecosystem-token',
  [polygonAmoy.id]: 'polygon-ecosystem-token',
  [hardhat.id]: 'ethereum'
}

// Stablecoin IDs
const STABLECOIN_IDS = {
  usdc: 'usd-coin',
  usdt: 'tether'
}

/**
 * TanStack Query hook for fetching token prices from CoinGecko
 *
 * Automatically handles:
 * - Chain ID changes (refetches when chain changes)
 * - 1-hour caching (stale time)
 * - Retry logic with exponential backoff
 * - Loading and error states
 *
 * @param chainId - Reactive chain ID (optional, defaults to useChainId)
 * @returns TanStack Query result with token prices
 *
 * @example
 * // Basic usage
 * const { data: prices, isLoading, error } = useTokenPricesQuery()
 *
 * // With custom chain ID
 * const chainId = ref(1)
 * const { data: prices } = useTokenPricesQuery(chainId)
 *
 * // Access prices
 * if (prices.value) {
 *   console.log(prices.value.ethereum) // 2500
 * }
 */
export const useTokenPricesQuery = (chainIdOverride?: MaybeRefOrGetter<number | undefined>) => {
  const defaultChainId = useChainId()

  // Use provided chain ID or fallback to wagmi's chain ID
  const getChainId = () => {
    const override = chainIdOverride ? toValue(chainIdOverride) : undefined
    return override || defaultChainId.value || mainnet.id
  }

  return useQuery<TokenPrices, Error>({
    queryKey: ['tokenPrices', getChainId],
    queryFn: async () => {
      const chainId = getChainId()
      const nativeId = CHAIN_TO_COINGECKO[chainId] || 'ethereum'
      const uniqueIds = [nativeId, STABLECOIN_IDS.usdc, STABLECOIN_IDS.usdt].join(',')

      return await fetchTokenPrices(uniqueIds)
    },
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION,
    retry: 2,
    retryDelay: (attemptIndex: number) => {
      return Math.min(1000 * (2 ** attemptIndex), 30000)
    }
  })
}

/**
 * Export constants for use in other modules
 */
export { CHAIN_TO_COINGECKO, STABLECOIN_IDS }

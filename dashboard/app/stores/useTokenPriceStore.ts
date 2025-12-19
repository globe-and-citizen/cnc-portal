import { defineStore } from 'pinia'
import { watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { mainnet, sepolia, polygon, polygonAmoy, hardhat } from '@wagmi/vue/chains'
import { useChainId } from '@wagmi/vue'
import type { TokenDisplay } from '@/types/token'

interface TokenPrices {
  'ethereum': number
  'usd-coin': number
  'tether': number
  'polygon-ecosystem-token': number
}

const COINGECKO_API = 'https://api.coingecko.com/api/v3'
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

// Function to fetch prices from CoinGecko
const fetchTokenPrices = async (): Promise<TokenPrices> => {
  const chainId = useChainId()

  const nativeId = CHAIN_TO_COINGECKO[chainId.value || 1] || 'ethereum'
  const uniqueIds = [nativeId, STABLECOIN_IDS.usdc, STABLECOIN_IDS.usdt].join(',')
  const url = `${COINGECKO_API}/simple/price?ids=${uniqueIds}&vs_currencies=usd`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch prices: ${response.status}`)
  }

  const data = await response.json()

  return {
    'ethereum': data.ethereum?.usd || 0,
    'usd-coin': data['usd-coin']?.usd || 1,
    'tether': data.tether?.usd || 1,
    'polygon-ecosystem-token': data['polygon-ecosystem-token']?.usd || 0
  }
}

/**
 * Token Price Store
 *
 * Manages token prices from CoinGecko API with automatic 1-hour caching via TanStack Query.
 * Automatically handles chain switching and cache invalidation.
 *
 * Fetches and caches prices for:
 * - ETH (Ethereum)
 * - USDC (USD Coin)
 * - USDT (Tether)
 * - MATIC (Polygon)
 *
 * @example
 * const store = useTokenPriceStore()
 *
 * // Get token price
 * const ethPrice = store.getTokenPrice(ethToken)
 *
 * // Check loading state
 * if (store.isLoading.value) {
 *   // Show loading indicator
 * }
 */

export const useTokenPriceStore = defineStore('tokenPrices', () => {
  const chainId = useChainId()

  // Watch for chain changes to invalidate cache
  watch(chainId, (newId) => {
    if (newId && newId !== chainId.value) {
      chainId.value = newId
      refetch()
    }
  })

  // TanStack Query setup with 1 hour stale time
  const { data: prices, isLoading, refetch } = useQuery({
    queryKey: ['tokenPrices', chainId],
    queryFn: fetchTokenPrices,
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION, // formerly cacheTime
    retry: 2,
    retryDelay: (attemptIndex: number) => {
      return Math.min(1000 * (2 ** attemptIndex), 30000)
    }
  })

  // Get token price by token info
  /**
   * Get the current price for a token
   * @param token - Token display object with symbol and isNative flag
   * @returns Token price in USD (0 if no price available)
   * @example
   * const store = useTokenPriceStore()
   * const ethPrice = store.getTokenPrice(ethToken)
   * console.log(ethPrice) // 2500
   */
  const getTokenPrice = (token: TokenDisplay): number => {
    if (!prices.value) return 0

    // Native token - use CoinGecko ID
    if (token.isNative) {
      const coinGeckoId = CHAIN_TO_COINGECKO[chainId.value || 1] || 'ethereum'
      return prices.value[coinGeckoId as keyof TokenPrices] || 0
    }

    // Stablecoins
    const symbol = token.symbol.toUpperCase()
    if (symbol === 'USDC') {
      return prices.value['usd-coin'] || 1
    }
    if (symbol === 'USDT') {
      return prices.value.tether || 1
    }

    return 0
  }

  return {
    /**
     * Reactive ref indicating if prices are currently being loaded
     * @type {Ref<boolean>}
     * @example
     * if (store.isLoading.value) {
     *   // Show skeleton loader
     * }
     */
    isLoading,

    /**
     * Get the current price for a token in USD
     * @function getTokenPrice
     */
    getTokenPrice
  }
})

import { defineStore } from 'pinia'
import { useChainId } from '@wagmi/vue'
import { useTokenPricesQuery, CHAIN_TO_COINGECKO } from '@/queries/useTokenPricesQuery'
import type { TokenDisplay } from '@/types/token'

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

  // Use the composable query hook
  const { data: prices, isLoading } = useTokenPricesQuery()

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
      return prices.value[coinGeckoId as keyof typeof prices.value] || 0
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

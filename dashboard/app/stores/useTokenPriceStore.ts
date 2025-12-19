import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { mainnet, sepolia, polygon, polygonAmoy, hardhat } from '@wagmi/vue/chains'
import { useNetwork } from '~/utils/network'
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
  const { chainId } = useNetwork()

  const nativeId = CHAIN_TO_COINGECKO[chainId.value || 1] || 'ethereum'
  const coinIds = [nativeId, STABLECOIN_IDS.usdc, STABLECOIN_IDS.usdt]
  const uniqueIds = [...new Set(coinIds)].join(',')
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

export const useTokenPriceStore = defineStore('tokenPrices', () => {
  const { chainId, nativeSymbol } = useNetwork()
  const currentChainId = ref(chainId.value)

  // Watch for chain changes to invalidate cache
  watch(chainId, (newId) => {
    if (newId && newId !== currentChainId.value) {
      currentChainId.value = newId
      refetch()
    }
  })

  // TanStack Query setup with 1 hour stale time
  const { data: prices, isLoading, error, refetch } = useQuery({
    queryKey: ['tokenPrices', currentChainId],
    queryFn: fetchTokenPrices,
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION, // formerly cacheTime
    retry: 2,
    retryDelay: (attemptIndex: number) => {
      return Math.min(1000 * (2 ** attemptIndex), 30000)
    }
  })

  // Get CoinGecko ID for current chain
  const getCoinGeckoId = (): string => {
    const id = CHAIN_TO_COINGECKO[currentChainId.value || 1] || 'ethereum'
    return id
  }

  // Get token price by token info
  const getTokenPrice = (token: TokenDisplay): number => {
    if (!prices.value) return 0

    // Native token - use CoinGecko ID
    if (token.isNative) {
      const coinGeckoId = getCoinGeckoId()
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

  // Calculate USD value with formatting
  const getTokenUSD = (token: TokenDisplay, amount: string | number): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

    if (isNaN(numAmount) || numAmount === 0) return ''

    const price = getTokenPrice(token)
    if (price === 0) return ''

    const usdValue = numAmount * price

    // For very small amounts (< $0.01)
    if (usdValue < 0.01) {
      if (usdValue < 0.0001) {
        return '< $0.0001'
      }
      // Show 4 decimals for cents
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      }).format(usdValue)
    }

    // Normal formatting for >= $0.01
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(usdValue)
  }

  // Get raw USD value (without formatting)
  const getTokenUSDValue = (token: TokenDisplay, amount: string | number): number => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

    if (isNaN(numAmount) || numAmount === 0) return 0

    const price = getTokenPrice(token)
    return numAmount * price
  }

  return {
    prices,
    isLoading,
    error,
    nativeSymbol,
    getCoinGeckoId,
    getTokenPrice,
    getTokenUSD,
    getTokenUSDValue,
    refetch
  }
})

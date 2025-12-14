import { ref, onMounted, watch } from 'vue'
import { mainnet, sepolia, polygon, polygonAmoy, hardhat } from '@wagmi/vue/chains'
import { useNetwork } from '~/utils/network'
import type { TokenDisplay } from '@/types/token'
import { formatUSD } from '@/utils/currency'

interface TokenPrices {
  'ethereum': number
  'usd-coin': number
  'tether': number
  'matic-network': number
}

const COINGECKO_API = 'https://api.coingecko.com/api/v3'
const CACHE_DURATION = 60000 // 1 minute

let pricesCache: { data: TokenPrices, timestamp: number } | null = null

// Map chain IDs to CoinGecko IDs
const CHAIN_TO_COINGECKO: Record<number, string> = {
  [mainnet.id]: 'ethereum',
  [sepolia.id]: 'ethereum',
  [polygon.id]: 'matic-network',
  [polygonAmoy.id]: 'matic-network',
  [hardhat.id]: 'ethereum'
}

// Stablecoin IDs
const STABLECOIN_IDS = {
  usdc: 'usd-coin',
  usdt: 'tether'
}

export const useTokenPrices = () => {
  const { chainId, nativeSymbol } = useNetwork()

  const prices = ref<TokenPrices>({
    'ethereum': 0,
    'usd-coin': 1,
    'tether': 1,
    'matic-network': 0
  })
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  // Get CoinGecko ID for current chain
  const getCoinGeckoId = () => {
    const id = CHAIN_TO_COINGECKO[chainId.value || 1] || 'ethereum'

    return id
  }

  const fetchPrices = async () => {
    // Check cache
    if (pricesCache && Date.now() - pricesCache.timestamp < CACHE_DURATION) {
      prices.value = pricesCache.data
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const nativeId = getCoinGeckoId()
      // Fetch all prices in a single batch request for better performance
      const coinIds = [nativeId, STABLECOIN_IDS.usdc, STABLECOIN_IDS.usdt]
      const uniqueIds = [...new Set(coinIds)].join(',')
      const url = `${COINGECKO_API}/simple/price?ids=${uniqueIds}&vs_currencies=usd`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`)
      }

      const data = await response.json()

      // Update prices using CoinGecko IDs as keys
      prices.value = {
        'ethereum': data.ethereum?.usd || 0,
        'usd-coin': data['usd-coin']?.usd || 1,
        'tether': data.tether?.usd || 1,
        'matic-network': data['matic-network']?.usd || 0
      }
      pricesCache = { data: prices.value, timestamp: Date.now() }
    } catch (e) {
      error.value = e as Error
    } finally {
      isLoading.value = false
    }
  }

  // Get token price by token info
  const getTokenPrice = (token: TokenDisplay): number => {
    if (isLoading.value) return 0

    // Native token - use CoinGecko ID
    if (token.isNative) {
      const coinGeckoId = getCoinGeckoId()
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
    return formatUSD(usdValue)
  }

  // Get raw USD value (without formatting)
  const getTokenUSDValue = (token: TokenDisplay, amount: string | number): number => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

    if (isNaN(numAmount) || numAmount === 0) return 0

    const price = getTokenPrice(token)
    return numAmount * price
  }

  // Watch for chain changes
  watch(chainId, (newId, oldId) => {
    if (newId && newId !== oldId) {
      pricesCache = null
      fetchPrices()
    }
  })

  onMounted(() => {
    fetchPrices()
  })

  return {
    prices,
    isLoading,
    error,
    nativeSymbol,
    getCoinGeckoId,
    getTokenPrice,
    getTokenUSD,
    getTokenUSDValue,
    refetch: () => {
      pricesCache = null
      return fetchPrices()
    }
  }
}

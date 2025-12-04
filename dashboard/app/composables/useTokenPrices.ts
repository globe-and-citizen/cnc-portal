import { ref, onMounted, watch } from 'vue'
import { mainnet, sepolia, polygon, polygonAmoy, hardhat } from '@wagmi/vue/chains'
import { useNetwork } from '~/utils/network'

interface TokenPrices {
  'ethereum': number
  'usd-coin': number
  'tether': number
  'matic-network': number
  'polygon-ecosystem-token': number
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

export const useTokenPrices = () => {
  const { chainId, nativeSymbol } = useNetwork()

  const prices = ref<TokenPrices>({
    'ethereum': 0,
    'usd-coin': 1,
    'tether': 1,
    'matic-network': 0,
    'polygon-ecosystem-token': 0
  })
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const getCoinGeckoId = () => {
    return CHAIN_TO_COINGECKO[chainId.value || 1] || 'ethereum'
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
      const ids = ['usd-coin', 'tether', nativeId].filter((v, i, a) => a.indexOf(v) === i).join(',')

      const response = await fetch(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`)

      if (!response.ok) throw new Error('Failed to fetch prices')

      const data = await response.json()

      prices.value = {
        'ethereum': data.ethereum?.usd || 0,
        'usd-coin': data['usd-coin']?.usd || 1,
        'tether': data.tether?.usd || 1,
        'matic-network': data['matic-network']?.usd || 0,
        'polygon-ecosystem-token': data['polygon-ecosystem-token']?.usd || 0
      }

      pricesCache = { data: prices.value, timestamp: Date.now() }
    } catch (e) {
      error.value = e as Error
      // Fallback prices
      prices.value = {
        'ethereum': 2000,
        'usd-coin': 1,
        'tether': 1,
        'matic-network': 0.5,
        'polygon-ecosystem-token': 0.5
      }
    } finally {
      isLoading.value = false
    }
  }

  // Watch for chain changes
  watch(chainId, (newId, oldId) => {
    if (newId && newId !== oldId) {
      pricesCache = null
      fetchPrices()
    }
  })

  onMounted(fetchPrices)

  return {
    prices,
    isLoading,
    error,
    nativeSymbol,
    refetch: () => {
      pricesCache = null
      return fetchPrices()
    },
    getCoinGeckoId
  }
}

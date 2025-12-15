import { ref, onMounted, watch } from 'vue'
import { mainnet, sepolia, polygon, polygonAmoy, hardhat } from '@wagmi/vue/chains'
import { useNetwork } from '~/utils/network'
import type { TokenDisplay } from '@/types/token'

interface TokenPrices {
  'ethereum': number
  'usd-coin': number
  'tether': number
  'matic-network': number
}

const COINGECKO_API = 'https://api.coingecko.com/api/v3'
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens'
const CACHE_DURATION = 60000 // 1 minute

let pricesCache: { data: TokenPrices, timestamp: number } | null = null

// Map chain IDs to CoinGecko IDs
const CHAIN_TO_COINGECKO: Record<number, 'ethereum' | 'matic-network'> = {
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

// Wrapped native token addresses (DexScreener fallback)
const FALLBACK_NATIVE_ADDRESSES: Record<number, string> = {
  [mainnet.id]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  [sepolia.id]: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  [polygon.id]: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
  [polygonAmoy.id]: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  [hardhat.id]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
}

interface DexScreenerPair {
  priceUsd?: string
  liquidity?: { usd?: number }
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
    return CHAIN_TO_COINGECKO[chainId.value || mainnet.id] || 'ethereum'
  }

  // DexScreener fallback for native token only
  const fetchNativePriceFallback = async (): Promise<number> => {
    const address = FALLBACK_NATIVE_ADDRESSES[chainId.value || mainnet.id]
    if (!address) return 0

    try {
      const res = await fetch(`${DEXSCREENER_API}/${address}`)
      if (!res.ok) return 0

      const json = await res.json()

      const bestPair = (json.pairs as DexScreenerPair[] | undefined)
        ?.filter(p => Number(p.liquidity?.usd) > 10_000)
        ?.sort(
          (a, b) =>
            Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0)
        )[0]

      return Number(bestPair?.priceUsd ?? 0)
    } catch {
      return 0
    }
  }

  const fetchPrices = async () => {
    // Cache check
    if (pricesCache && Date.now() - pricesCache.timestamp < CACHE_DURATION) {
      prices.value = pricesCache.data
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const nativeId = getCoinGeckoId()
      const coinIds = [nativeId, STABLECOIN_IDS.usdc, STABLECOIN_IDS.usdt]
      const uniqueIds = [...new Set(coinIds)].join(',')

      const url = `${COINGECKO_API}/simple/price?ids=${uniqueIds}&vs_currencies=usd`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`)
      }

      const data = await response.json()

      let ethereumPrice = data.ethereum?.usd || 0
      let maticPrice = data['matic-network']?.usd || 0

      // Fallback ONLY if CoinGecko failed for native token
      if (ethereumPrice === 0 && nativeId === 'ethereum') {
        ethereumPrice = await fetchNativePriceFallback()
      }

      if (maticPrice === 0 && nativeId === 'matic-network') {
        maticPrice = await fetchNativePriceFallback()
      }

      prices.value = {
        'ethereum': ethereumPrice,
        'usd-coin': data['usd-coin']?.usd || 1,
        'tether': data.tether?.usd || 1,
        'matic-network': maticPrice
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

    if (token.isNative) {
      const id = getCoinGeckoId()
      return prices.value[id] || 0
    }

    const symbol = token.symbol.toUpperCase()
    if (symbol === 'USDC') return prices.value['usd-coin'] || 1
    if (symbol === 'USDT') return prices.value.tether || 1

    return 0
  }

  // Calculate USD value with formatting
  const getTokenUSD = (token: TokenDisplay, amount: string | number): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (!Number.isFinite(numAmount) || numAmount === 0) return ''

    const price = getTokenPrice(token)
    if (price === 0) return ''

    const usdValue = numAmount * price

    if (usdValue < 0.01) {
      if (usdValue < 0.0001) return '< $0.0001'
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      }).format(usdValue)
    }

    return formatUSD(usdValue)
  }

  // Get raw USD value
  const getTokenUSDValue = (token: TokenDisplay, amount: string | number): number => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (!Number.isFinite(numAmount) || numAmount === 0) return 0

    return numAmount * getTokenPrice(token)
  }

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

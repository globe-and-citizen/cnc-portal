// import { useCustomFetch } from '@/composables'
import { NETWORK } from '@/constant'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { LIST_CURRENCIES } from '@/constant'
import { useQuery } from '@tanstack/vue-query'
import type { Ref } from 'vue'

const NETWORK_TO_COIN_ID: Record<string, string> = {
  POL: 'matic-network',
  ETH: 'ethereum',
  AMOYPOL: 'matic-network',
  SepoliaETH: 'ethereum',
  GO: 'ethereum'
}

export interface TokenConfig {
  id: string;
  name: string;
  symbol: string;
  coingeckoId: string;
  decimals: number;
}

export interface PriceResponse {
  market_data: {
    current_price: {
      [key: string]: number; // Add index signature for dynamic currency codes
      usd: number;
      cad: number;
      eur: number;
      idr: number;
      inr: number;
    }
  }
}

export const useCurrencyStore = defineStore('currency', () => {
  const currency = useStorage('currency', {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  })

  // Example: Add more tokens here as needed
  const SUPPORTED_TOKENS: TokenConfig[] = [
    {
      id: 'native',
      name: NETWORK.currencySymbol,
      symbol: NETWORK.currencySymbol,
      coingeckoId: NETWORK_TO_COIN_ID[NETWORK.currencySymbol],
      decimals: 18
    },
    {
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      coingeckoId: 'usd-coin',
      decimals: 6
    }
    // Add more tokens here
  ]

  // Fetch prices for all tokens
  async function fetchTokenPrice(coingeckoId: string) {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coingeckoId}`)
    if (!res.ok) throw new Error('Failed to fetch price')
    return res.json() as Promise<PriceResponse>
  }

  const tokenPrices = reactive<Record<string, Ref<PriceResponse | undefined>>>({})
  const tokenLoading = reactive<Record<string, Ref<boolean>>>({})

  SUPPORTED_TOKENS.forEach((token) => {
    const { data, isFetching } = useQuery({
      queryKey: ['price', token.coingeckoId],
      queryFn: () => fetchTokenPrice(token.coingeckoId),
      retryDelay: 30000,
      gcTime: 1000 * 60 * 10
    })
    tokenPrices[token.id] = data
    tokenLoading[token.id] = isFetching
  })

  async function setCurrency(value: string) {
    const found = LIST_CURRENCIES.find((c) => c.code === value)
    if (found) {
      currency.value = found
    }
    // refetchPrice()
  }

  function getTokenPrice(tokenId: string, currencyCode: string): number | null {
    const priceData = tokenPrices[tokenId]?.value;
    if (!priceData) return null;
    if (!(currencyCode in priceData.market_data.current_price)) return null;
    return tokenPrices[tokenId].market_data.current_price[currencyCode] ?? null
  }

  function getTokenPriceUSD(tokenId: string): number | null {
    const priceData = tokenPrices[tokenId]?.value
    if (!priceData) return null
    return priceData.market_data.current_price.usd ?? null
  }

  function isTokenLoading(tokenId: string): boolean {
    return tokenLoading[tokenId]?.value ?? false
  }

  return {
    localCurrency: currency,
    supportedTokens: SUPPORTED_TOKENS,
    tokenPrices,
    tokenLoading,
    getTokenPrice,
    getTokenPriceUSD,
    isTokenLoading,
    setCurrency
  }
})

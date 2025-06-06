// import { useCustomFetch } from '@/composables'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { LIST_CURRENCIES, SUPPORTED_TOKENS } from '@/constant'
import type { TokenId } from '@/constant'
import { useQuery } from '@tanstack/vue-query'
import type { Ref } from 'vue'

export interface PriceResponse {
  market_data: {
    current_price: {
      [key: string]: number // Add index signature for dynamic currency codes
      usd: number
      cad: number
      eur: number
      idr: number
      inr: number
    }
  }
}

export const useCurrencyStore = defineStore('currency', () => {
  const currency = useStorage('currency', {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  })

  // Fetch prices for all tokens
  async function fetchTokenPrice(coingeckoId: string) {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coingeckoId}`)
    if (!res.ok) throw new Error('Failed to fetch price')
    return res.json() as Promise<PriceResponse>
  }
  /**
   * @dev For a dynamic supported token, Map is better than Array
   */
  // Combine price and loading into a single array
  const tokenStates: Array<{
    id: string
    data: Ref<PriceResponse | undefined>
    loading: Ref<boolean>
  }> = []

  /**
   * @dev If in the future, supported tokens are dynamic,
   * we can use a Map to store token prices and loading states
   */
  SUPPORTED_TOKENS.forEach((token) => {
    const { data, isFetching } = useQuery({
      queryKey: ['price', token.coingeckoId],
      queryFn: () => fetchTokenPrice(token.coingeckoId),
      retryDelay: 30000,
      gcTime: 1000 * 60 * 10
    })
    tokenStates.push({ id: token.id, data, loading: isFetching })
  })

  async function setCurrency(value: string) {
    const found = LIST_CURRENCIES.find((c) => c.code === value)
    if (found) {
      currency.value = found
    }
    // refetchPrice()
  }

  /**
   * @description Get the price of a token in a specific currency
   * @param tokenId
   * @param currencyCode
   * @returns
   */
  function getTokenPrice(tokenId: TokenId, currencyCode: string): number | null {
    const token = tokenStates.find((t) => t.id === tokenId)
    const priceData = token?.data.value
    if (!priceData) return null
    if (!(currencyCode in priceData.market_data.current_price)) return null
    return priceData.market_data.current_price[currencyCode] ?? null
  }

  function getTokenPriceUSD(tokenId: TokenId): number | null {
    const token = tokenStates.find((t) => t.id === tokenId)
    const priceData = token?.data.value
    if (!priceData) return null
    return priceData.market_data.current_price.usd ?? null
  }

  function isTokenLoading(tokenId: TokenId): boolean {
    const token = tokenStates.find((t) => t.id === tokenId)
    return token?.loading.value ?? false
  }

  /**
   * @description Get token info and prices for a given tokenId
   * Returns: { id, name, symbol, prices: [{ price, code, symbol }] }
   */
  function getTokenInfo(tokenId: TokenId) {
    const token = SUPPORTED_TOKENS.find((t) => t.id === tokenId)
    if (!token) return null
    const priceData = tokenStates.find((t) => t.id === tokenId)?.data.value
    const prices: Array<{ id: string; price: number | null; code: string; symbol: string }> = []
    // Current currency
    const currentCode = currency.value.code
    prices.push({
      id: 'local',
      price: priceData?.market_data.current_price[currentCode.toLocaleLowerCase()] ?? null,
      code: currentCode,
      symbol: currency.value.symbol,
    })
    // USD
    prices.push({
      id: 'usd',
      price: priceData?.market_data.current_price.usd ?? null,
      code: 'USD',
      symbol: '$'
    })
    return {
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      code: token.code,
      prices
    }
  }

  return {
    localCurrency: currency,
    supportedTokens: SUPPORTED_TOKENS,
    tokenStates,
    getTokenPrice,
    getTokenPriceUSD,
    isTokenLoading,
    setCurrency,
    getTokenInfo
  }
})

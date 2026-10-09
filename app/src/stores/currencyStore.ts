import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { LIST_CURRENCIES, SUPPORTED_TOKENS } from '@/constant'
import type { TokenId } from '@/constant'
import type { Ref } from 'vue'
import { useTeamStore } from '@/stores/teamStore'
import { computed, ref } from 'vue'
import { useGetTokenPriceQuery } from '@/queries/coingecko.queries'
import type { TokenPriceResponse as PriceResponse } from '@/lib/coingecko'
export type { TokenPriceResponse as PriceResponse } from '@/lib/coingecko'

export const useCurrencyStore = defineStore('currency', () => {
  const currency = useStorage('currency', {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  })
  const teamStore = useTeamStore()

  const supportedToken = computed(() => {
    const tokens = [...SUPPORTED_TOKENS]
    const investorAddress = teamStore.getInvestorAddress()
    if (investorAddress && !tokens.some((t) => t.id === 'sher')) {
      tokens.push({
        id: 'sher',
        name: 'Sher Token',
        symbol: 'SHER',
        code: 'SHER',
        coingeckoId: 'sher-token',
        decimals: 6,
        address: investorAddress
      })
    }
    return tokens
  })

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
  supportedToken.value.forEach((token) => {
    if (token.coingeckoId === 'sher-token') {
      tokenStates.push({
        id: token.id,
        data: ref({ market_data: { current_price: { usd: 0, cad: 0, eur: 0, idr: 0, inr: 0 } } }),
        loading: ref(false)
      })
    } else {
      const { data, isFetching } = useGetTokenPriceQuery(token.coingeckoId)
      tokenStates.push({ id: token.id, data, loading: isFetching })
    }
  })

  async function setCurrency(value: string) {
    const found = LIST_CURRENCIES.find((c) => c.code === value)
    if (found) {
      currency.value = found
    }
  }

  /**
   * @description Get the price of a token in a specific currency
   * @param tokenId
   * @param local - If true, use local currency, otherwise use provided currencyCode
   * @param currencyCode - If local is false, use this currency code
   * @returns
   */
  function getTokenPrice(tokenId: TokenId, local: boolean = true, currencyCode?: string): number {
    const token = tokenStates.find((t) => t.id === tokenId)
    const priceData = token?.data.value
    if (!priceData) return 0
    // Use local currency by default, otherwise use provided currencyCode
    const code = local ? currency.value.code.toLowerCase() : (currencyCode ?? 'usd').toLowerCase()
    if (!(code in priceData.market_data.current_price)) return 0
    return priceData.market_data.current_price[code] ?? 0
  }

  // function getTokenPriceUSD(tokenId: TokenId): number | null {
  //   const token = tokenStates.find((t) => t.id === tokenId)
  //   const priceData = token?.data.value
  //   if (!priceData) return null
  //   return priceData.market_data.current_price.usd ?? null
  // }

  function isTokenLoading(tokenId: TokenId): boolean {
    const token = tokenStates.find((t) => t.id === tokenId)
    return token?.loading.value ?? false
  }

  /**
   * @description Get token info and prices for a given tokenId
   * Returns: { id, name, symbol, prices: [{ price, code, symbol }] }
   */
  function getTokenInfo(tokenId: TokenId) {
    const token = supportedToken.value.find((t) => t.id === tokenId)
    if (!token) return null
    const priceData = tokenStates.find((t) => t.id === tokenId)?.data.value
    const prices: Array<{ id: string; price: number | null; code: string; symbol: string }> = []
    // Current currency
    const currentCode = currency.value.code
    prices.push({
      id: 'local',
      price: priceData?.market_data.current_price[currentCode.toLocaleLowerCase()] ?? null,
      code: currentCode,
      symbol: currency.value.symbol
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
    supportedTokens: supportedToken,
    tokenStates,
    getTokenPrice,
    isTokenLoading,
    setCurrency,
    getTokenInfo
  }
})

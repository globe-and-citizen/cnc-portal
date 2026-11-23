import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { LIST_CURRENCIES, SUPPORTED_TOKENS } from '@/constant'
import type { TokenId } from '@/constant'
import { useTeamStore } from '@/stores/teamStore'
import { computed } from 'vue'
import { useGetTokenPriceQuery } from '@/queries/coingecko.queries'
export type { TokenPriceResponse as PriceResponse } from '@/types/coingecko'

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

  // Keep the query observers intact: the cache owns quotes, error and retry state.
  const tokenStates = SUPPORTED_TOKENS.filter((token) => token.coingeckoId !== 'sher-token').map(
    (token) => ({ id: token.id, ...useGetTokenPriceQuery(token.coingeckoId) })
  )

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
  function getTokenPrice(
    tokenId: TokenId,
    local: boolean = true,
    currencyCode?: string
  ): number | null {
    // SHER has an explicit local zero-price policy, not a failed market lookup.
    if (tokenId === 'sher')
      return supportedToken.value.some((token) => token.id === 'sher') ? 0 : null
    const priceData = tokenStates.find((token) => token.id === tokenId)?.data.value
    const code = local ? currency.value.code.toLowerCase() : (currencyCode ?? 'usd').toLowerCase()
    const price = priceData?.market_data?.current_price?.[code]
    return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : null
  }

  function isTokenLoading(tokenId: TokenId): boolean {
    return tokenStates.find((token) => token.id === tokenId)?.isFetching.value ?? false
  }

  /**
   * @description Get token info and prices for a given tokenId
   * Returns: { id, name, symbol, prices: [{ price, code, symbol }] }
   */
  function getTokenInfo(tokenId: TokenId) {
    const token = supportedToken.value.find((t) => t.id === tokenId)
    if (!token) return null
    const prices: Array<{ id: string; price: number | null; code: string; symbol: string }> = []
    // Current currency
    const currentCode = currency.value.code
    prices.push({
      id: 'local',
      price: getTokenPrice(tokenId, true),
      code: currentCode,
      symbol: currency.value.symbol
    })
    // USD
    prices.push({
      id: 'usd',
      price: getTokenPrice(tokenId, false, 'USD'),
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

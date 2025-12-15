// import { useCustomFetch } from '@/composables'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { LIST_CURRENCIES, SUPPORTED_TOKENS } from '@/constant'
import type { TokenId } from '@/constant'
import { useQuery } from '@tanstack/vue-query'
import type { Ref } from 'vue'
import { useTeamStore } from '@/stores/teamStore'
import { computed, ref } from 'vue'

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

interface DexScreenerPair {
  priceUsd?: string
  liquidity?: { usd?: number }
}

const COINGECKO_COIN_API = 'https://api.coingecko.com/api/v3/coins'
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens'

// Wrapped native tokens for fallback
const FALLBACK_NATIVE_ADDRESSES: Record<string, string> = {
  ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  'matic-network': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270' // WMATIC
}

// Which CoinGecko IDs are allowed to fallback
const FALLBACK_ALLOWED_IDS = new Set(['ethereum', 'matic-network'])

export const useCurrencyStore = defineStore('currency', () => {
  const currency = useStorage('currency', {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  })
  const teamStore = useTeamStore()

  const supportedToken = computed(() => {
    const tokens = [...SUPPORTED_TOKENS]
    const investorsV1Address = teamStore.getContractAddressByType('InvestorV1')
    if (investorsV1Address && !tokens.some((t) => t.id === 'sher')) {
      tokens.push({
        id: 'sher',
        name: 'Sher Token',
        symbol: 'SHER',
        code: 'SHER',
        coingeckoId: 'sher-token',
        decimals: 6,
        address: investorsV1Address
      })
    } else {
      console.warn('InvestorV1 contract address not found, Sher Token will not be included')
    }
    return tokens
  })

  async function fetchNativePriceFallback(coingeckoId: string): Promise<number> {
    const address = FALLBACK_NATIVE_ADDRESSES[coingeckoId]
    if (!address) return 0

    try {
      const res = await fetch(`${DEXSCREENER_API}/${address}`)
      if (!res.ok) return 0

      const json = await res.json()

      const bestPair = (json.pairs as DexScreenerPair[] | undefined)
        ?.filter((p) => Number(p.liquidity?.usd) > 10_000)
        ?.sort((a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0))[0]

      return Number(bestPair?.priceUsd ?? 0)
    } catch {
      return 0
    }
  }

  /* =======================
     FETCH (PRIMARY + FALLBACK)
  ======================= */

  async function fetchTokenPrice(coingeckoId: string): Promise<PriceResponse> {
    try {
      const res = await fetch(`${COINGECKO_COIN_API}/${coingeckoId}`)
      if (!res.ok) throw new Error('CoinGecko failed')
      const json = await res.json()
      // Defensive: If CoinGecko returns 0 or missing for native, try fallback
      const nativeAllowed = FALLBACK_ALLOWED_IDS.has(coingeckoId)
      const cgUsd = json?.market_data?.current_price?.usd
      if (nativeAllowed && (!cgUsd || cgUsd === 0)) {
        // Try fallback if CoinGecko USD price is missing or zero
        const usd = await fetchNativePriceFallback(coingeckoId)
        return {
          market_data: {
            current_price: {
              usd,
              cad: usd,
              eur: usd,
              idr: usd,
              inr: usd
            }
          }
        }
      }
      return json as PriceResponse
    } catch {
      // Fallback ONLY for native tokens
      if (!FALLBACK_ALLOWED_IDS.has(coingeckoId)) {
        throw new Error('No fallback available')
      }
      const usd = await fetchNativePriceFallback(coingeckoId)
      return {
        market_data: {
          current_price: {
            usd,
            cad: usd,
            eur: usd,
            idr: usd,
            inr: usd
          }
        }
      }
    }
  }

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
      const { data, isFetching } = useQuery({
        queryKey: ['price', token.coingeckoId],
        queryFn: () => fetchTokenPrice(token.coingeckoId),
        retryDelay: 30000,
        gcTime: 1000 * 60 * 10
      })
      tokenStates.push({ id: token.id, data, loading: isFetching })
    }
  })

  async function setCurrency(value: string) {
    const found = LIST_CURRENCIES.find((c) => c.code === value)
    if (found) {
      currency.value = found
    }
    // refetchPrice()
  }

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
      price: priceData?.market_data.current_price[currentCode.toLowerCase()] ?? null,
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
    supportedTokens: supportedToken.value,
    tokenStates,
    getTokenPrice,
    // getTokenPriceUSD,
    isTokenLoading,
    setCurrency,
    getTokenInfo
  }
})

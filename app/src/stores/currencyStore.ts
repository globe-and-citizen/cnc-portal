// import { useCustomFetch } from '@/composables'
import { NETWORK } from '@/constant'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, onMounted, reactive, ref } from 'vue'
import { useToastStore } from './useToastStore'
import { dailyLocalStorage } from '@/utils/storageWithExpiration'
import { LIST_CURRENCIES } from '@/constant'
import { useQuery } from '@tanstack/vue-query'

const NETWORK_TO_COIN_ID: Record<string, string> = {
  POL: 'matic-network',
  ETH: 'ethereum',
  AMOYPOL: 'matic-network',
  SepoliaETH: 'ethereum',
  GO: 'ethereum'
}

export interface PriceResponse {
  market_data: {
    current_price: {
      usd: number
      cad: number
      eur: number
      idr: number
      inr: number
    }
  }
}

type currencyType = keyof PriceResponse['market_data']['current_price']
export const useCurrencyStore = defineStore('currency', () => {
  const currency = useStorage('currency', {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  })

  const fetchPrice = async () => {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${NETWORK_TO_COIN_ID[NETWORK.currencySymbol]}`
    )
    if (!res.ok) throw new Error('Failed to fetch price')
    return res.json() as Promise<PriceResponse>
  }

  const fetchUSDPrice = async () => {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/usd-coin`)
    if (!res.ok) throw new Error('Failed to fetch USD price')
    return res.json() as Promise<PriceResponse>
  }

  const {
    data: priceResponse,
    refetch: refetchPrice,
    isFetching: isLoading
  } = useQuery({
    queryKey: ['price', NETWORK.currencySymbol],
    queryFn: fetchPrice,
    retryDelay: 30000,
    gcTime: 1000 * 60 * 10 // 10 Minutes hour
    // gcTime: 1000 * 60 * 60 * 24 // 24 hour
  })

  const {
    data: usdPriceResponse,
    // refetch: refetchUSDPrice,
    isFetching: isLoadingUSDPrice
  } = useQuery({
    queryKey: ['usdPrice'],
    queryFn: fetchUSDPrice,
    retryDelay: 30000,
    gcTime: 1000 * 60 * 10 // 10 Minutes hour
    // gcTime: 1000 * 60 * 60 * 24 // 24 hour
  })

  async function setCurrency(value: string) {
    const found = LIST_CURRENCIES.find((c) => c.code === value)
    if (found) {
      currency.value = found
    }
    refetchPrice()
  }

  const currencyCode = computed<currencyType>(
    () => currency.value.code.toLowerCase() as currencyType
  )

  const prices = reactive({
    nativeToken: {
      id: NETWORK_TO_COIN_ID[NETWORK.currencySymbol],
      name: NETWORK.currencySymbol,
      symbol: NETWORK.currencySymbol,
      priceInLocal: computed(() =>
        priceResponse.value
          ? priceResponse.value.market_data.current_price[currencyCode.value]
          : null
      ),
      priceInUSD: computed(() =>
        priceResponse.value ? priceResponse.value.market_data.current_price.usd : null
      ),
      isLoading
    },
    usdc: {
      id: 'usd-coin',
      name: 'USD Coin',
      symbol: 'USDC',
      priceInLocal: computed(() =>
        usdPriceResponse.value
          ? usdPriceResponse.value.market_data.current_price[currencyCode.value]
          : null
      ),
      priceInUSD: computed(() =>
        usdPriceResponse.value
          ? usdPriceResponse.value.market_data.current_price[currencyCode.value]
          : null
      ),
      isLoading: computed(() => isLoadingUSDPrice.value)
    }
  })

  return {
    localCurrency: currency,
    nativeToken: prices.nativeToken,
    usdc: prices.usdc,
    setCurrency
    // fetchNativeTokenPrice
  }
})

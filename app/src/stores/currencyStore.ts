import { useCustomFetch } from '@/composables'
import { NETWORK } from '@/constant'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { onMounted, ref } from 'vue'
import { useToastStore } from './useToastStore'

interface Currency {
  code: string
  name: string
  symbol: string
}
export const LIST_CURRENCIES: Currency[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€'
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$'
  },
  {
    code: 'IDR',
    name: 'Indonesian Rupiah',
    symbol: 'Rp'
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹'
  }
]
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
export const useCurrencyStore = defineStore(
  'currency',
  () => {
    const currency = useStorage('currency', {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$'
    })
    const nativeTokenPrice = ref<number | undefined>(undefined)
    const nativeTokenPriceInUSD = ref<number | undefined>(undefined)
    const usdPriceInLocal = ref<number | undefined>(undefined)
    const toastStore = useToastStore()

    const {
      data: priceResponse,
      execute: fetchPrice,
      isFetching: isLoading,
      error: error
    } = useCustomFetch(
      `https://api.coingecko.com/api/v3/coins/${NETWORK_TO_COIN_ID[NETWORK.currencySymbol]}`,
      {
        immediate: false
      }
    )
      .get()
      .json<PriceResponse>()

    const {
      data: usdPriceResponse,
      execute: fetchUSDPrice,
      isFetching: isLoadingUSDPrice,
      error: errorUSDPrice
    } = useCustomFetch(`https://api.coingecko.com/api/v3/usd-coin`, {
      immediate: false
    })
      .get()
      .json<PriceResponse>()

    async function setCurrency(value: string) {
      currency.value = LIST_CURRENCIES.find((c) => c.code === value)
      await fetchNativeTokenPrice()
    }

    type currencyType = keyof PriceResponse['market_data']['current_price']

    async function fetchNativeTokenPrice() {
      await fetchPrice()
      const currencyCode = currency.value.code.toLowerCase() as currencyType

      if (!priceResponse.value || error.value) {
        toastStore.addErrorToast('Failed to fetch price')
        return
      }
      nativeTokenPrice.value = priceResponse.value.market_data.current_price[currencyCode]
      nativeTokenPriceInUSD.value = priceResponse.value.market_data.current_price.usd
    }

    async function fetchUSDPriceInLocal() {
      await fetchUSDPrice()

      const currencyCode = currency.value.code.toLowerCase() as currencyType
      if (!usdPriceResponse.value || errorUSDPrice.value) {
        toastStore.addErrorToast('Failed to fetch price')
        return
      }
      usdPriceInLocal.value = usdPriceResponse.value.market_data.current_price[currencyCode]
    }

    onMounted(async () => {
      if (nativeTokenPrice.value === undefined || nativeTokenPriceInUSD.value === undefined) {
        await fetchNativeTokenPrice()
      }

      if (usdPriceInLocal.value === undefined) {
        await fetchUSDPriceInLocal()
      }
    })

    return {
      currency,
      nativeTokenPrice,
      nativeTokenPriceInUSD,
      usdPriceInLocal,
      isLoading,
      isLoadingUSDPrice,
      setCurrency,
      fetchNativeTokenPrice
    }
  },
  {
    persist: {
      storage: sessionStorage // Persist for the current browser tab session
    }
  }
)

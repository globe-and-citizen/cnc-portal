import { useCustomFetch } from '@/composables'
import { NETWORK } from '@/constant'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, onMounted, reactive, ref } from 'vue'
import { useToastStore } from './useToastStore'
import { dailyLocalStorage } from '@/utils/storageWithExpiration'

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
    } = useCustomFetch(`https://api.coingecko.com/api/v3/coins/usd-coin`, {
      immediate: false
    })
      .get()
      .json<PriceResponse>()

    async function setCurrency(value: string) {
      currency.value = LIST_CURRENCIES.find((c) => c.code === value)
      await fetchNativeTokenPrice()
      await fetchUSDPriceInLocal()
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

    const prices = reactive({
      nativeToken: {
        id: NETWORK_TO_COIN_ID[NETWORK.currencySymbol],
        name: NETWORK.currencySymbol,
        symbol: NETWORK.currencySymbol,
        priceInLocal: computed(() => nativeTokenPrice.value),
        priceInUSD: computed(() => nativeTokenPriceInUSD.value),
        isLoading: computed(() => isLoading.value)
      },
      usdc: {
        id: 'usd-coin',
        name: 'USD Coin',
        symbol: 'USDC',
        priceInLocal: computed(() => usdPriceInLocal.value),
        priceInUSD: computed(() => usdPriceInLocal.value),
        isLoading: computed(() => isLoadingUSDPrice.value)
      }
    })

    return {
      localCurrency: currency,
      nativeToken: prices.nativeToken,
      usdc: prices.usdc,
      setCurrency,
      fetchNativeTokenPrice
    }
  },
  {
    persist: {
      storage: dailyLocalStorage
    }
  }
)

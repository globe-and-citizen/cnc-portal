import { onMounted, ref } from 'vue'
import { useCustomFetch } from './useCustomFetch'
import { useCurrencyStore, type PriceResponse } from '@/stores'
import { watch } from 'vue'
import { storeToRefs } from 'pinia'

export function useCryptoPrice(tokenId: string) {
  const price = ref<number | null>(null)
  const priceInUSD = ref<number | null>(null)
  const currencyStore = useCurrencyStore()
  const { localCurrency } = storeToRefs(currencyStore)
  const {
    execute,
    data: priceResponse,
    isFetching: isLoading,
    error
  } = useCustomFetch(`https://api.coingecko.com/api/v3/coins/${tokenId}`, {
    immediate: false
  })
    .get()
    .json<PriceResponse>()

  type currencyType = keyof PriceResponse['market_data']['current_price']

  const fetchPrice = async () => {
    const currencyCode = currencyStore.localCurrency.code.toLowerCase() as currencyType
    price.value = priceResponse.value?.market_data.current_price[currencyCode] || null
    priceInUSD.value = priceResponse.value?.market_data?.current_price?.usd || null
  }

  onMounted(async () => {
    await execute()
    await fetchPrice()
  })

  watch(localCurrency, async (newVal) => {
    if (newVal) {
      await fetchPrice()
    }
  })

  return {
    price,
    priceInUSD,
    isLoading,
    error,
    fetchPrice
  }
}

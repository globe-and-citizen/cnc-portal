import { ref } from 'vue'
import { useCustomFetch } from './useCustomFetch'
import { useCurrencyStore, type PriceResponse } from '@/stores'

export function useCryptoPrice(tokenId: string) {
  const price = ref<number | null>(null)
  const priceInUSD = ref<number | null>(null)
  const currencyStore = useCurrencyStore()
  const {
    data: priceResponse,
    isFetching: isLoading,
    error
  } = useCustomFetch(`https://api.coingecko.com/api/v3/coins/${tokenId}`)
    .get()
    .json<PriceResponse>()

  type currencyType = keyof PriceResponse['market_data']['current_price']

  const fetchPrices = async () => {
    price.value =
      priceResponse.value?.market_data.current_price[currencyStore.currency.code as currencyType] ||
      null
    priceInUSD.value = priceResponse.value?.market_data?.current_price?.usd || null
  }

  return {
    price,
    isLoading,
    error,
    fetchPrices
  }
}

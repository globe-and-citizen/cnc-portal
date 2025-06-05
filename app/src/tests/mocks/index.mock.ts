// import { vi } from 'vitest'
import { ref } from 'vue'

export const mockUseCurrencyStore = {
  localCurrency: ref({
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  }),
  nativeToken: ref({
    id: 'ethereum',
    isLoading: false,
    name: 'SepoliaETH',
    priceInLocal: 1000,
    priceInUSD: 1000,
    symbol: 'SepoliaETH'
  }),
  usdc: {
    id: 'usd-coin',
    isLoading: false,
    name: 'USD Coin',
    priceInLocal: 1000,
    priceInUSD: 1000,
    symbol: 'USDC'
  }
}

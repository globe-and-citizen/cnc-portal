// import { vi } from 'vitest'
import { vi } from 'vitest'
import { ref } from 'vue'

export const mockUseCurrencyStore = {
  localCurrency: ref({
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  }),
  getTokenInfo: vi.fn((tokenId) => ({
    id: tokenId,
    name: tokenId === 'native' ? 'SepoliaETH' : 'USD Coin',
    symbol: tokenId === 'native' ? 'SepoliaETH' : 'USDC',
    prices: [
      { id: 'local', price: 1000, code: 'USD', symbol: '$' },
      { id: 'usd', price: 1000, code: 'USD', symbol: '$' }
    ]
  })),
  isTokenLoading: vi.fn(() => false)
}

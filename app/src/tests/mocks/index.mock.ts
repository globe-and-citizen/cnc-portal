// import { vi } from 'vitest'
import { vi } from 'vitest'
import { ref } from 'vue'

export const mockUseCurrencyStore = () => ({
  localCurrency: ref({
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  }),
  supportedTokens: [
    {
      id: 'native',
      name: 'SepoliaETH',
      symbol: 'SepoliaETH',
      code: 'ETH',
      coingeckoId: 'ethereum',
      decimals: 18,
      address: '0xNative'
    },
    {
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      code: 'USDC',
      coingeckoId: 'usd-coin',
      decimals: 6,
      address: '0xUSDC'
    }
  ],
  tokenStates: [
    {
      id: 'native',
      data: ref({
        market_data: {
          current_price: { usd: 2000, cad: 2500, eur: 1800, idr: 30000000, inr: 150000 }
        }
      }),
      loading: ref(false)
    },
    {
      id: 'usdc',
      data: ref({
        market_data: { current_price: { usd: 1, cad: 1.3, eur: 0.9, idr: 15000, inr: 80 } }
      }),
      loading: ref(false)
    }
  ],
  getTokenInfo: vi.fn((tokenId) => ({
    id: tokenId,
    name: tokenId === 'native' ? 'SepoliaETH' : 'USD Coin',
    symbol: tokenId === 'native' ? 'SepoliaETH' : 'USDC',
    code: tokenId === 'native' ? 'ETH' : 'USDC',
    prices: [
      { id: 'local', price: tokenId === 'native' ? 2000 : 1, code: 'USD', symbol: '$' },
      { id: 'usd', price: tokenId === 'native' ? 2000 : 1, code: 'USD', symbol: '$' }
    ]
  })),
  getTokenPrice: vi.fn(
    (tokenId: 'native' | 'usdc', local: boolean = true, currencyCode: string = 'usd') => {
      const prices: Record<'native' | 'usdc', { usd: number; eur: number; cad: number }> = {
        native: { usd: 2000, eur: 1800, cad: 2500 },
        usdc: { usd: 1, eur: 0.9, cad: 1.3 }
      }
      const token = prices[tokenId] || { usd: 0, eur: 0, cad: 0 }
      if (local) return token.usd
      const key = currencyCode?.toLowerCase?.() as 'usd' | 'eur' | 'cad'
      return token[key] ?? 0
    }
  ),
  isTokenLoading: vi.fn(() => false),
  setCurrency: vi.fn()
})

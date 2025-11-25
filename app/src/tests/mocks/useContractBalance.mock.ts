import { ref } from 'vue'

export const mockUseContractBalance = {
  balances: ref([
    {
      amount: 0.5,
      token: {
        id: 'native',
        name: 'SepoliaETH',
        symbol: 'SepoliaETH',
        code: 'SepoliaETH',
        coingeckoId: 'ethereum',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000'
      },
      values: {
        USD: {
          value: 500,
          formated: '$500',
          id: 'usd',
          code: 'USD',
          symbol: '$',
          price: 1000,
          formatedPrice: '$1K'
        }
      }
    },
    {
      amount: 50,
      token: {
        id: 'usdc',
        name: 'USD Coin',
        symbol: 'USDC',
        code: 'USDC',
        coingeckoId: 'usd-coin',
        decimals: 6,
        address: '0xA3492D046095AFFE351cFac15de9b86425E235dB'
      },
      values: {
        USD: {
          value: 50000,
          formated: '$50K',
          id: 'usd',
          code: 'USD',
          symbol: '$',
          price: 1000,
          formatedPrice: '$1K'
        }
      }
    }
  ]),
  total: ref({
    USD: {
      value: 50500,
      formated: '$50.5K',
      id: 'usd',
      code: 'USD',
      symbol: '$',
      price: 1000,
      formatedPrice: '$1K'
    }
  }),
  dividendsTotal: ref({
    USD: {
      value: 100,
      formated: '$100',
      id: 'usd',
      code: 'USD',
      symbol: '$',
      price: 1000,
      formatedPrice: '$1K'
    }
  }),
  isLoading: ref(false),
  error: ref(null)
}

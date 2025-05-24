import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContractBalance } from '../useContractBalance'

import type { Address } from 'viem'
import { ref } from 'vue'
import { LIST_CURRENCIES } from '@/constant/index'

const mockUseBalance = {
  data: ref<{ value: bigint } | null>(null),
  isLoading: ref(false),
  error: ref<unknown>(null)
}

const mockUseReadContract = {
  data: ref<bigint | null>(null),
  isLoading: ref(false),
  error: ref<unknown>(null)
}

const mockUseChainId = ref(1)

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useBalance: vi.fn(() => mockUseBalance),
    useReadContract: vi.fn(() => mockUseReadContract),
    useChainId: vi.fn(() => mockUseChainId)
  }
})
type CurrencyStore = {
  localCurrency: {
    code: string
    name: string
    symbol: string
  }
  nativeToken: {
    id: string
    name: string
    symbol: string
    priceInLocal: number
    priceInUSD: number
    isLoading: boolean
  }
  usdc: {
    id: string
    name: string
    symbol: string
    priceInLocal: number
    priceInUSD: number
    isLoading: boolean
  }
}

const mockCurrencyStore: CurrencyStore = {
  localCurrency: LIST_CURRENCIES[1],
  nativeToken: {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    priceInLocal: 3000,
    priceInUSD: 2000,
    isLoading: false
  },
  usdc: {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    priceInLocal: 1,
    priceInUSD: 1,
    isLoading: false
  }
}

vi.mock('@/stores/currencyStore', () => ({
  useCurrencyStore: vi.fn(() => mockCurrencyStore)
}))

describe('useContractBalance', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as Address

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBalance.data.value = null
    mockUseBalance.isLoading.value = false
    mockUseBalance.error.value = null
    mockUseReadContract.data.value = null
    mockUseReadContract.isLoading.value = false
    mockUseReadContract.error.value = null
    mockUseChainId.value = 1
  })

  it('should return correct total value with both balances', () => {
    mockUseBalance.data.value = { value: BigInt('500000000000000000') }
    mockUseReadContract.data.value = BigInt('50000000')

    const { balances, total, isLoading, error } = useContractBalance(mockAddress)
    expect(total.value).toMatchInlineSnapshot(`
      {
        "localCurrencyBalance": {
          "formated": "€1.55K",
          "value": 1550,
        },
        "usdBalance": {
          "formated": "$1.05K",
          "value": 1050,
        },
      }
    `)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBe(null)
    expect(balances.value).toMatchInlineSnapshot(`
       [
         {
           "amount": 0.5,
           "code": "ETH",
           "valueInLocalCurrency": {
             "formated": "€1.5K",
             "value": 1500,
           },
           "valueInUSD": {
             "formated": "$1K",
             "value": 1000,
           },
         },
         {
           "amount": 50,
           "code": "USDC",
           "valueInLocalCurrency": {
             "formated": "€50",
             "value": 50,
           },
           "valueInUSD": {
             "formated": "$50",
             "value": 50,
           },
         },
       ]
     `)
  })

  it('should return correct value even if useBalance or useReadContract is null', () => {
    mockUseBalance.data.value = null
    mockUseReadContract.data.value = null

    const { balances } = useContractBalance(mockAddress)
    expect(balances.value).toMatchInlineSnapshot(`
      [
        {
          "amount": 0,
          "code": "ETH",
          "valueInLocalCurrency": {
            "formated": "€0",
            "value": 0,
          },
          "valueInUSD": {
            "formated": "$0",
            "value": 0,
          },
        },
        {
          "amount": 0,
          "code": "USDC",
          "valueInLocalCurrency": {
            "formated": "€0",
            "value": 0,
          },
          "valueInUSD": {
            "formated": "$0",
            "value": 0,
          },
        },
      ]
    `)
  })
})

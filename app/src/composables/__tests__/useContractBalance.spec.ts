import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContractBalance } from '../useContractBalance'

import type { Address } from 'viem'
import { ref } from 'vue'

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

describe.skip('useContractBalance', () => {
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
        "USD": {
          "code": "USD",
          "formated": "$50.5K",
          "formatedPrice": "$1K",
          "id": "usd",
          "price": 1000,
          "symbol": "$",
          "value": 50500,
        },
      }
    `)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBe(null)
    expect(balances.value).toMatchInlineSnapshot(`
      [
        {
          "amount": 50,
          "token": {
            "address": "0xA3492D046095AFFE351cFac15de9b86425E235dB",
            "code": "USDC",
            "coingeckoId": "usd-coin",
            "decimals": 6,
            "id": "usdc",
            "name": "USD Coin",
            "symbol": "USDC",
          },
          "values": {
            "USD": {
              "code": "USD",
              "formated": "$50K",
              "formatedPrice": "$1K",
              "id": "usd",
              "price": 1000,
              "symbol": "$",
              "value": 50000,
            },
          },
        },
        {
          "amount": 0.5,
          "token": {
            "address": "0x0000000000000000000000000000000000000000",
            "code": "SepoliaETH",
            "coingeckoId": "ethereum",
            "decimals": 18,
            "id": "native",
            "name": "SepoliaETH",
            "symbol": "SepoliaETH",
          },
          "values": {
            "USD": {
              "code": "USD",
              "formated": "$500",
              "formatedPrice": "$1K",
              "id": "usd",
              "price": 1000,
              "symbol": "$",
              "value": 500,
            },
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
          "token": {
            "address": "0xA3492D046095AFFE351cFac15de9b86425E235dB",
            "code": "USDC",
            "coingeckoId": "usd-coin",
            "decimals": 6,
            "id": "usdc",
            "name": "USD Coin",
            "symbol": "USDC",
          },
          "values": {
            "USD": {
              "code": "USD",
              "formated": "$0",
              "formatedPrice": "$1K",
              "id": "usd",
              "price": 1000,
              "symbol": "$",
              "value": 0,
            },
          },
        },
        {
          "amount": 0,
          "token": {
            "address": "0x0000000000000000000000000000000000000000",
            "code": "SepoliaETH",
            "coingeckoId": "ethereum",
            "decimals": 18,
            "id": "native",
            "name": "SepoliaETH",
            "symbol": "SepoliaETH",
          },
          "values": {
            "USD": {
              "code": "USD",
              "formated": "$0",
              "formatedPrice": "$1K",
              "id": "usd",
              "price": 1000,
              "symbol": "$",
              "value": 0,
            },
          },
        },
      ]
    `)
  })
})

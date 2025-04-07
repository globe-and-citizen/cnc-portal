import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContractBalance } from '../useContractBalance'

import type { Address } from 'viem'
import { ref } from 'vue'

const mockUseBalance = {
  data: ref<{ value: bigint } | null>(null),
  isLoading: ref(false),
  error: ref<unknown>(null),
  refetch: vi.fn()
}

const mockUseReadContract = {
  data: ref<bigint | null>(null),
  isLoading: ref(false),
  error: ref<unknown>(null),
  refetch: vi.fn()
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

const mockCurrencyStore = {
  nativeTokenPriceInUSD: 2000
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

  it('should return correct native token balance', () => {
    mockUseBalance.data.value = { value: BigInt('1000000000000000000') }
    mockUseReadContract.data.value = BigInt('0')

    const { balances } = useContractBalance(mockAddress)
    expect(balances.nativeToken.formatted).toBe('1')
    expect(balances.totalValueUSD).toBe('2000.00')
  })

  it('should return correct USDC balance', () => {
    mockUseBalance.data.value = { value: BigInt('0') }
    mockUseReadContract.data.value = BigInt('100000000')

    const { balances } = useContractBalance(mockAddress)
    expect(balances.usdc.formatted).toBe('100')
    expect(balances.totalValueUSD).toBe('100.00')
  })

  it('should return correct total value with both balances', () => {
    mockUseBalance.data.value = { value: BigInt('500000000000000000') }
    mockUseReadContract.data.value = BigInt('50000000')

    const { balances } = useContractBalance(mockAddress)
    expect(balances.nativeToken.formatted).toBe('0.5')
    expect(balances.usdc.formatted).toBe('50')
    expect(balances.totalValueUSD).toBe('1050.00')
  })

  it('should return correct native token raw balance and formatted value', () => {
    const nativeBalance = BigInt('1500000000000000000') // 1.5 ETH
    mockUseBalance.data.value = { value: nativeBalance }
    mockUseReadContract.data.value = BigInt('0')

    const { balances } = useContractBalance(mockAddress)
    expect(balances.nativeToken.balance).toBe(nativeBalance)
    expect(balances.nativeToken.formatted).toBe('1.5')
  })

  it('should return correct USDC raw balance and formatted value', () => {
    const usdcBalance = BigInt('150000000') // 150 USDC
    mockUseBalance.data.value = { value: BigInt('0') }
    mockUseReadContract.data.value = usdcBalance

    const { balances } = useContractBalance(mockAddress)
    expect(balances.usdc.balance).toBe(usdcBalance)
    expect(balances.usdc.formatted).toBe('150')
  })

  it('should refetch both balances when refetch is called', async () => {
    const { refetch } = useContractBalance(mockAddress)
    await refetch()

    expect(mockUseBalance.refetch).toHaveBeenCalled()
    expect(mockUseReadContract.refetch).toHaveBeenCalled()
  })
})

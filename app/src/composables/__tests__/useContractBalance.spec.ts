import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContractBalance } from '../useContractBalance'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import type { Address } from 'viem'

// Mock the dependencies
vi.mock('@wagmi/vue', () => ({
  useBalance: vi.fn(),
  useReadContract: vi.fn(),
  useChainId: vi.fn()
}))

vi.mock('@/stores/currencyStore', () => ({
  useCurrencyStore: vi.fn()
}))

describe('useContractBalance', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as Address
  const mockChainId = 1

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useChainId
    ;(useChainId as ReturnType<typeof vi.fn>).mockReturnValue(mockChainId)

    // Mock currency store
    const mockCurrencyStore = {
      nativeTokenPriceInUSD: 2000
    }
    ;(useCurrencyStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockCurrencyStore)
  })

  it('should refetch both balances when refetch is called', async () => {
    const mockRefetchNative = vi.fn()
    const mockRefetchUsdc = vi.fn()

    ;(useBalance as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetchNative
    })
    ;(useReadContract as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetchUsdc
    })

    const { refetch } = useContractBalance(mockAddress)
    await refetch()

    expect(mockRefetchNative).toHaveBeenCalled()
    expect(mockRefetchUsdc).toHaveBeenCalled()
  })
})

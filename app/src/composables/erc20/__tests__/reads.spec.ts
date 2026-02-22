import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useErc20Name,
  useErc20Symbol,
  useErc20Decimals,
  useErc20TotalSupply,
  useErc20BalanceOf,
  useErc20Allowance
} from '../reads'
import { mockERC20Reads, resetERC20Mocks } from '@/tests/mocks'
import type { Address } from 'viem'

// Test constants
const MOCK_DATA = {
  validAddress: '0x1234567890123456789012345678901234567890' as Address,
  ownerAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  spenderAddress: '0x9876543210987654321098765432109876543210' as Address
} as const

describe('ERC20 Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetERC20Mocks()
  })

  describe('useErc20Name', () => {
    it('should return mock token name', () => {
      const result = useErc20Name(MOCK_DATA.validAddress)

      expect(result).toBe(mockERC20Reads.name)
      expect(result.data.value).toBe('Mock Token')
      expect(result.isSuccess.value).toBe(true)
      expect(result.isLoading.value).toBe(false)
    })

    it('should handle error state', () => {
      mockERC20Reads.name.isError.value = true
      mockERC20Reads.name.error.value = new Error('Failed to fetch name')

      const result = useErc20Name(MOCK_DATA.validAddress)

      expect(result.isError.value).toBe(true)
      expect(result.error.value).toBeInstanceOf(Error)
    })

    it('should support refetch functionality', () => {
      const result = useErc20Name(MOCK_DATA.validAddress)

      result.refetch()
      expect(result.refetch).toHaveBeenCalled()
    })
  })

  describe('useErc20Symbol', () => {
    it('should return mock token symbol', () => {
      const result = useErc20Symbol(MOCK_DATA.validAddress)

      expect(result).toBe(mockERC20Reads.symbol)
      expect(result.data.value).toBe('MTK')
      expect(result.isSuccess.value).toBe(true)
    })

    it('should handle loading state', () => {
      mockERC20Reads.symbol.isLoading.value = true
      mockERC20Reads.symbol.isSuccess.value = false

      const result = useErc20Symbol(MOCK_DATA.validAddress)

      expect(result.isLoading.value).toBe(true)
      expect(result.isSuccess.value).toBe(false)
    })
  })

  describe('useErc20Decimals', () => {
    it('should return mock token decimals', () => {
      const result = useErc20Decimals(MOCK_DATA.validAddress)

      expect(result).toBe(mockERC20Reads.decimals)
      expect(result.data.value).toBe(18)
      expect(result.isSuccess.value).toBe(true)
    })

    it('should handle custom decimals value', () => {
      mockERC20Reads.decimals.data.value = 6

      const result = useErc20Decimals(MOCK_DATA.validAddress)

      expect(result.data.value).toBe(6)
    })
  })

  describe('useErc20TotalSupply', () => {
    it('should return mock total supply', () => {
      const result = useErc20TotalSupply(MOCK_DATA.validAddress)

      expect(result).toBe(mockERC20Reads.totalSupply)
      expect(result.data.value).toBe(1000000n * 10n ** 18n)
      expect(result.isSuccess.value).toBe(true)
    })

    it('should handle custom total supply', () => {
      mockERC20Reads.totalSupply.data.value = 5000000n

      const result = useErc20TotalSupply(MOCK_DATA.validAddress)

      expect(result.data.value).toBe(5000000n)
    })
  })

  describe('useErc20BalanceOf', () => {
    it('should return mock balance', () => {
      const result = useErc20BalanceOf(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress)

      expect(result).toBe(mockERC20Reads.balanceOf)
      expect(result.data.value).toBe(1000n * 10n ** 18n)
      expect(result.isSuccess.value).toBe(true)
    })

    it('should handle zero balance', () => {
      mockERC20Reads.balanceOf.data.value = 0n

      const result = useErc20BalanceOf(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress)

      expect(result.data.value).toBe(0n)
    })

    it('should handle pending state', () => {
      mockERC20Reads.balanceOf.isPending.value = true
      mockERC20Reads.balanceOf.status.value = 'pending'

      const result = useErc20BalanceOf(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress)

      expect(result.isPending.value).toBe(true)
      expect(result.status.value).toBe('pending')
    })
  })

  describe('useErc20Allowance', () => {
    it('should return mock allowance', () => {
      const result = useErc20Allowance(
        MOCK_DATA.validAddress,
        MOCK_DATA.ownerAddress,
        MOCK_DATA.spenderAddress
      )

      expect(result).toBe(mockERC20Reads.allowance)
      expect(result.data.value).toBe(1000000n * 10n ** 18n)
      expect(result.isSuccess.value).toBe(true)
    })

    it('should handle insufficient allowance', () => {
      mockERC20Reads.allowance.data.value = 0n

      const result = useErc20Allowance(
        MOCK_DATA.validAddress,
        MOCK_DATA.ownerAddress,
        MOCK_DATA.spenderAddress
      )

      expect(result.data.value).toBe(0n)
    })

    it('should handle custom allowance amount', () => {
      const customAllowance = 500n * 10n ** 18n
      mockERC20Reads.allowance.data.value = customAllowance

      const result = useErc20Allowance(
        MOCK_DATA.validAddress,
        MOCK_DATA.ownerAddress,
        MOCK_DATA.spenderAddress
      )

      expect(result.data.value).toBe(customAllowance)
    })
  })

  describe('Mock Behavior', () => {
    it('should return consistent interface for all functions', () => {
      const name = useErc20Name(MOCK_DATA.validAddress)
      const symbol = useErc20Symbol(MOCK_DATA.validAddress)
      const decimals = useErc20Decimals(MOCK_DATA.validAddress)
      const totalSupply = useErc20TotalSupply(MOCK_DATA.validAddress)
      const balance = useErc20BalanceOf(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress)
      const allowance = useErc20Allowance(
        MOCK_DATA.validAddress,
        MOCK_DATA.ownerAddress,
        MOCK_DATA.spenderAddress
      )

      // All should have the same interface structure
      expect(name).toHaveProperty('data')
      expect(name).toHaveProperty('isLoading')
      expect(name).toHaveProperty('isSuccess')
      expect(name).toHaveProperty('isError')
      expect(name).toHaveProperty('error')
      expect(name).toHaveProperty('refetch')

      // Verify all functions return their respective mocks
      expect(name).toBe(mockERC20Reads.name)
      expect(symbol).toBe(mockERC20Reads.symbol)
      expect(decimals).toBe(mockERC20Reads.decimals)
      expect(totalSupply).toBe(mockERC20Reads.totalSupply)
      expect(balance).toBe(mockERC20Reads.balanceOf)
      expect(allowance).toBe(mockERC20Reads.allowance)
    })

    it('should reset mocks properly', () => {
      // Modify mock state
      mockERC20Reads.name.isError.value = true
      mockERC20Reads.name.error.value = new Error('Test error')
      mockERC20Reads.balanceOf.data.value = 999n

      // Reset
      resetERC20Mocks()

      // Verify reset
      expect(mockERC20Reads.name.isError.value).toBe(false)
      expect(mockERC20Reads.name.error.value).toBeNull()
      expect(mockERC20Reads.name.isSuccess.value).toBe(true)
      expect(mockERC20Reads.balanceOf.data.value).toBe(1000n * 10n ** 18n)
    })

    it('should allow mock customization for different scenarios', () => {
      // Scenario 1: Successful read
      mockERC20Reads.decimals.data.value = 6
      const result1 = useErc20Decimals(MOCK_DATA.validAddress)
      expect(result1.data.value).toBe(6)

      // Scenario 2: Error state
      resetERC20Mocks()
      mockERC20Reads.decimals.isError.value = true
      mockERC20Reads.decimals.isSuccess.value = false
      const result2 = useErc20Decimals(MOCK_DATA.validAddress)
      expect(result2.isError.value).toBe(true)
      expect(result2.isSuccess.value).toBe(false)
    })
  })
})

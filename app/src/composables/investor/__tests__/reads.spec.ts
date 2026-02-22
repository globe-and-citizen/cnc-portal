import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useInvestorAddress,
  useInvestorName,
  useInvestorSymbol,
  useInvestorTotalSupply,
  useInvestorPaused,
  useInvestorOwner,
  useInvestorBalanceOf,
  useInvestorShareholders
} from '../reads'
import { mockInvestorReads, resetContractMocks } from '@/tests/mocks'
import type { Address } from 'viem'

// Test constants
const MOCK_DATA = {
  investorAddress: '0x4234567890123456789012345678901234567890' as Address,
  ownerAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  shareholderAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  totalSupply: 1000000n * 10n ** 18n,
  shareholderBalance: 50000n * 10n ** 18n
} as const

describe('Investor Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  describe('useInvestorAddress', () => {
    it('should return investor contract address', () => {
      const result = useInvestorAddress()

      expect(result).toBeDefined()
      expect(typeof result.value).toBe('string')
    })
  })

  describe('useInvestorName', () => {
    it('should return investor token name mock', () => {
      const result = useInvestorName()

      expect(result).toBe(mockInvestorReads.name)
      expect(result.data.value).toBe('Investor')
    })

    it('should have correct token name', () => {
      const result = useInvestorName()
      
      expect(typeof result.data.value).toBe('string')
      expect(result.isSuccess.value).toBe(true)
    })
  })

  describe('useInvestorSymbol', () => {
    it('should return investor token symbol mock', () => {
      const result = useInvestorSymbol()

      expect(result).toBe(mockInvestorReads.symbol)
      expect(result.data.value).toBe('INV')
    })

    it('should have correct token symbol', () => {
      const result = useInvestorSymbol()
      
      expect(typeof result.data.value).toBe('string')
      expect(result.isSuccess.value).toBe(true)
    })
  })

  describe('useInvestorTotalSupply', () => {
    it('should return total supply mock', () => {
      const result = useInvestorTotalSupply()

      expect(result).toBe(mockInvestorReads.totalSupply)
    })

    it('should handle non-zero total supply', () => {
      mockInvestorReads.totalSupply.data.value = MOCK_DATA.totalSupply
      const result = useInvestorTotalSupply()

      expect(result.data.value).toBe(MOCK_DATA.totalSupply)
    })

    it('should support refetch functionality', () => {
      const result = useInvestorTotalSupply()

      expect(result.refetch).toBeInstanceOf(Function)
    })
  })

  describe('useInvestorPaused', () => {
    it('should return paused status mock', () => {
      const result = useInvestorPaused()

      expect(result).toBe(mockInvestorReads.paused)
      expect(result.data.value).toBe(false)
    })

    it('should show paused state changes', () => {
      mockInvestorReads.paused.data.value = true
      const result = useInvestorPaused()

      expect(result.data.value).toBe(true)
    })
  })

  describe('useInvestorOwner', () => {
    it('should return owner address mock', () => {
      const result = useInvestorOwner()

      expect(result).toBe(mockInvestorReads.owner)
      expect(result.data.value).toBe(MOCK_DATA.ownerAddress)
    })

    it('should support refetch functionality', () => {
      const result = useInvestorOwner()

      expect(result.refetch).toBeInstanceOf(Function)
    })
  })

  describe('useInvestorBalanceOf', () => {
    it('should return balance for address', () => {
      const result = useInvestorBalanceOf(MOCK_DATA.shareholderAddress)

      expect(result).toBe(mockInvestorReads.balanceOf)
    })

    it('should show zero balance', () => {
      mockInvestorReads.balanceOf.data.value = 0n
      const result = useInvestorBalanceOf(MOCK_DATA.shareholderAddress)

      expect(result.data.value).toBe(0n)
    })

    it('should show shareholder balance', () => {
      mockInvestorReads.balanceOf.data.value = MOCK_DATA.shareholderBalance
      const result = useInvestorBalanceOf(MOCK_DATA.shareholderAddress)

      expect(result.data.value).toBe(MOCK_DATA.shareholderBalance)
    })

    it('should handle error state', () => {
      mockInvestorReads.balanceOf.isError.value = true
      const result = useInvestorBalanceOf(MOCK_DATA.shareholderAddress)

      expect(result.isError.value).toBe(true)
    })
  })

  describe('useInvestorShareholders', () => {
    it('should return shareholders list mock', () => {
      const result = useInvestorShareholders()

      expect(result).toBe(mockInvestorReads.shareholders)
      expect(Array.isArray(result.data.value)).toBe(true)
    })

    it('should handle empty shareholders list', () => {
      mockInvestorReads.shareholders.data.value = []
      const result = useInvestorShareholders()

      expect(result.data.value.length).toBe(0)
    })

    it('should handle multiple shareholders', () => {
      const shareholders = [MOCK_DATA.ownerAddress, MOCK_DATA.shareholderAddress]
      mockInvestorReads.shareholders.data.value = shareholders
      const result = useInvestorShareholders()

      expect(result.data.value.length).toBe(2)
    })
  })

  describe('Mock Behavior', () => {
    it('should have consistent interface for all read functions', () => {
      const name = useInvestorName()
      const totalSupply = useInvestorTotalSupply()

      expect(name).toHaveProperty('data')
      expect(name).toHaveProperty('isLoading')
      expect(name).toHaveProperty('isSuccess')
      expect(totalSupply).toHaveProperty('data')
      expect(totalSupply).toHaveProperty('isLoading')
      expect(totalSupply).toHaveProperty('isSuccess')
    })

    it('should reset mocks properly', () => {
      mockInvestorReads.name.data.value = 'Custom Name'
      mockInvestorReads.symbol.data.value = 'CUSTOM'
      resetContractMocks()

      const nameResult = useInvestorName()
      const symbolResult = useInvestorSymbol()

      expect(nameResult.isSuccess.value).toBe(true)
      expect(symbolResult.isSuccess.value).toBe(true)
    })
  })
})

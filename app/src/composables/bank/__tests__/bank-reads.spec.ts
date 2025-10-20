import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useBankReads } from '../reads'

// Hoisted mock variables
const { mockUseReadContract, mockTeamStore, mockIsAddress } = vi.hoisted(() => ({
  mockUseReadContract: vi.fn(),
  mockTeamStore: {
    getContractAddressByType: vi.fn().mockReturnValue('0x1234567890123456789012345678901234567890')
  },
  mockIsAddress: vi.fn((address: string) => /^0x[a-fA-F0-9]{40}$/.test(address))
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useReadContract: mockUseReadContract
}))

vi.mock('@/stores', () => ({
  useTeamStore: () => mockTeamStore
}))

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    isAddress: mockIsAddress
  }
})

// Test constants
const MOCK_DATA = {
  validBankAddress: '0x1234567890123456789012345678901234567890',
  validTokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
  invalidAddress: 'invalid-address',
  tokenSymbol: 'USDC'
} as const

describe('useBankReads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the mock implementation to return the valid bank address
    mockTeamStore.getContractAddressByType.mockImplementation((type: string) => {
      if (type === 'Bank') return MOCK_DATA.validBankAddress
      return undefined
    })
    mockUseReadContract.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      error: ref(null),
      isSuccess: ref(false)
    })
  })

  describe('Bank Address Management', () => {
    it('should get bank address from team store', () => {
      mockTeamStore.getContractAddressByType.mockClear()
      const { bankAddress } = useBankReads()

      // Access the computed value to trigger evaluation
      const result = bankAddress.value

      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('Bank')
      expect(result).toBe(MOCK_DATA.validBankAddress)
    })

    it('should validate bank address correctly', () => {
      const { isBankAddressValid } = useBankReads()

      expect(isBankAddressValid.value).toBe(true)
    })

    it('should handle invalid bank address', () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      const { isBankAddressValid } = useBankReads()

      expect(isBankAddressValid.value).toBe(false)
    })

    it('should handle undefined bank address', () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      const { isBankAddressValid } = useBankReads()

      expect(isBankAddressValid.value).toBe(false)
    })
  })

  describe('Bank Read Functions', () => {
    it('should call useBankPaused with correct parameters', () => {
      const { useBankPaused } = useBankReads()
      useBankPaused()

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_DATA.validBankAddress,
          abi: expect.any(Array),
          functionName: 'paused',
          query: expect.objectContaining({
            enabled: expect.any(Object)
          })
        })
      )
    })

    it('should call useBankOwner with correct parameters', () => {
      const { useBankOwner } = useBankReads()
      useBankOwner()

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_DATA.validBankAddress,
          abi: expect.any(Array),
          functionName: 'owner',
          query: expect.objectContaining({
            enabled: expect.any(Object)
          })
        })
      )
    })


  })

  describe('Query Enablement Logic', () => {
    it('should disable queries when bank address is invalid', () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      const { useBankPaused, isBankAddressValid } = useBankReads()
      useBankPaused()

      expect(isBankAddressValid.value).toBe(false)
      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(false)
    })


  })

  describe('Return Interface', () => {
    it('should return all expected properties and methods', () => {
      const bankReads = useBankReads()

      expect(bankReads).toHaveProperty('bankAddress')
      expect(bankReads).toHaveProperty('isBankAddressValid')
      expect(bankReads).toHaveProperty('useBankPaused')
      expect(bankReads).toHaveProperty('useBankOwner')
      expect(bankReads).toHaveProperty('useBankSupportedTokens')

      // Check that functions are actually functions
      expect(typeof bankReads.useBankPaused).toBe('function')
      expect(typeof bankReads.useBankOwner).toBe('function')
      expect(typeof bankReads.useBankSupportedTokens).toBe('function')
    })
  })
})

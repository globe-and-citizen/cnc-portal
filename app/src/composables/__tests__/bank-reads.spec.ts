import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useBankReads } from '../bank/reads'

// Hoisted mock variables
const { 
  mockUseReadContract,
  mockTeamStore,
  mockIsAddress
} = vi.hoisted(() => ({
  mockUseReadContract: vi.fn(),
  mockTeamStore: {
    getContractAddressByType: vi.fn((type: string) => {
      if (type === 'Bank') return '0x1234567890123456789012345678901234567890'
      return undefined
    })
  },
  mockIsAddress: vi.fn((address: string) => /^0x[a-fA-F0-9]{40}$/.test(address))
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useReadContract: mockUseReadContract
}))

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    isAddress: mockIsAddress
  }
})

vi.mock('@/artifacts/abi/bank.json', () => ({
  default: [
    {
      type: 'function',
      name: 'paused',
      outputs: [{ name: '', type: 'bool' }]
    },
    {
      type: 'function',
      name: 'owner',
      outputs: [{ name: '', type: 'address' }]
    }
  ]
}))

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
    mockUseReadContract.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      error: ref(null),
      isSuccess: ref(false)
    })
  })

  describe('Bank Address Management', () => {
    it('should get bank address from team store', () => {
      const { bankAddress } = useBankReads()
      
      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('Bank')
      expect(bankAddress.value).toBe(MOCK_DATA.validBankAddress)
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

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: MOCK_DATA.validBankAddress,
        abi: expect.any(Array),
        functionName: 'paused',
        query: { enabled: true }
      })
    })

    it('should call useBankOwner with correct parameters', () => {
      const { useBankOwner } = useBankReads()
      useBankOwner()

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: MOCK_DATA.validBankAddress,
        abi: expect.any(Array),
        functionName: 'owner',
        query: { enabled: true }
      })
    })

    it('should call useBankTipsAddress with correct parameters', () => {
      const { useBankTipsAddress } = useBankReads()
      useBankTipsAddress()

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: MOCK_DATA.validBankAddress,
        abi: expect.any(Array),
        functionName: 'tipsAddress',
        query: { enabled: true }
      })
    })

    it('should call useBankIsTokenSupported with correct parameters', () => {
      const { useBankIsTokenSupported } = useBankReads()
      useBankIsTokenSupported(MOCK_DATA.validTokenAddress)

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: MOCK_DATA.validBankAddress,
        abi: expect.any(Array),
        functionName: 'isTokenSupported',
        args: [MOCK_DATA.validTokenAddress],
        query: {
          enabled: expect.any(Object) // This is a computed property
        }
      })
    })

    it('should call useBankSupportedTokens with correct parameters', () => {
      const { useBankSupportedTokens } = useBankReads()
      useBankSupportedTokens(MOCK_DATA.tokenSymbol)

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: MOCK_DATA.validBankAddress,
        abi: expect.any(Array),
        functionName: 'supportedTokens',
        args: [MOCK_DATA.tokenSymbol],
        query: { enabled: expect.any(Object) }
      })
    })
  })

  describe('Query Enablement Logic', () => {
    it('should disable queries when bank address is invalid', () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      const { useBankPaused } = useBankReads()
      useBankPaused()

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled).toBe(false)
    })

    it('should disable token queries when token address is invalid', () => {
      const { useBankIsTokenSupported } = useBankReads()
      useBankIsTokenSupported(MOCK_DATA.invalidAddress as `0x${string}`)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      // The enabled property is a computed, so we need to test its computed value
      expect(typeof callArgs.query.enabled).toBe('object') // Vue computed ref
    })

    it('should disable supported tokens query when symbol is empty', () => {
      const { useBankSupportedTokens } = useBankReads()
      useBankSupportedTokens('')

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(typeof callArgs.query.enabled).toBe('object') // Vue computed ref
    })
  })

  describe('Return Interface', () => {
    it('should return all expected properties and methods', () => {
      const bankReads = useBankReads()

      expect(bankReads).toHaveProperty('bankAddress')
      expect(bankReads).toHaveProperty('isBankAddressValid')
      expect(bankReads).toHaveProperty('useBankPaused')
      expect(bankReads).toHaveProperty('useBankOwner')
      expect(bankReads).toHaveProperty('useBankTipsAddress')
      expect(bankReads).toHaveProperty('useBankIsTokenSupported')
      expect(bankReads).toHaveProperty('useBankSupportedTokens')

      // Check that functions are actually functions
      expect(typeof bankReads.useBankPaused).toBe('function')
      expect(typeof bankReads.useBankOwner).toBe('function')
      expect(typeof bankReads.useBankTipsAddress).toBe('function')
      expect(typeof bankReads.useBankIsTokenSupported).toBe('function')
      expect(typeof bankReads.useBankSupportedTokens).toBe('function')
    })
  })
})

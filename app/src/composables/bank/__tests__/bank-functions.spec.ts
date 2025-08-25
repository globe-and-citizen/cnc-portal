import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useBankFunctions } from '../functions'

// Hoisted mock variables
const {
  mockUseWriteContract,
  mockUseWaitForTransactionReceipt,
  mockTeamStore,
  mockToastStore,
  mockIsAddress
} = vi.hoisted(() => ({
  mockUseWriteContract: vi.fn(),
  mockUseWaitForTransactionReceipt: vi.fn(),
  mockTeamStore: {
    getContractAddressByType: vi.fn().mockReturnValue('0x1234567890123456789012345678901234567890')
  },
  mockToastStore: {
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  },
  mockIsAddress: vi.fn((address: string) => /^0x[a-fA-F0-9]{40}$/.test(address))
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useWriteContract: mockUseWriteContract,
  useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt
}))

vi.mock('@/stores', () => ({
  useTeamStore: () => mockTeamStore,
  useToastStore: () => mockToastStore
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
  validUserAddress: '0x9876543210987654321098765432109876543210',
  invalidAddress: 'invalid-address',
  amount: BigInt(1000000),
  transactionHash: '0x123456789abcdef',
  tokenSymbol: 'USDC'
} as const

describe('useBankFunctions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mockTeamStore.getContractAddressByType.mockImplementation((type: string) => {
      if (type === 'Bank') return MOCK_DATA.validBankAddress
      return undefined
    })
    mockUseWriteContract.mockReturnValue({
      writeContract: vi.fn(),
      data: ref(undefined),
      isLoading: ref(false),
      error: ref(null),
      isSuccess: ref(false)
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      error: ref(null),
      isSuccess: ref(false)
    })
  })

  describe('Bank Address Management', () => {
    it('should get bank address from team store', () => {
      mockTeamStore.getContractAddressByType.mockClear()
      const { bankAddress } = useBankFunctions()

      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('Bank')
      expect(bankAddress.value).toBe(MOCK_DATA.validBankAddress)
    })

    it('should validate bank address correctly', () => {
      const { isBankAddressValid } = useBankFunctions()
      expect(isBankAddressValid.value).toBe(true)
    })
  })

  describe('Admin Functions', () => {
    it('should call addTokenSupport with correct parameters', async () => {
      const { addTokenSupport } = useBankFunctions()
      const writeContractMock = vi.fn().mockResolvedValue({ hash: MOCK_DATA.transactionHash })
      mockUseWriteContract.mockReturnValue({
        writeContract: writeContractMock,
        data: ref(undefined),
        isLoading: ref(false),
        error: ref(null),
        isSuccess: ref(false)
      })

      await addTokenSupport(MOCK_DATA.validTokenAddress)

      expect(writeContractMock).toHaveBeenCalledWith({
        address: MOCK_DATA.validBankAddress,
        abi: expect.any(Array),
        functionName: 'addTokenSupport',
        args: [MOCK_DATA.validTokenAddress]
      })
    })

    it('should show success toast on successful token support addition', async () => {
      const { addTokenSupport } = useBankFunctions()
      const writeContractMock = vi.fn().mockResolvedValue({ hash: MOCK_DATA.transactionHash })
      mockUseWriteContract.mockReturnValue({
        writeContract: writeContractMock,
        data: ref({ hash: MOCK_DATA.transactionHash }),
        isLoading: ref(false),
        error: ref(null),
        isSuccess: ref(true)
      })

      await addTokenSupport(MOCK_DATA.validTokenAddress)

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('Token support added')
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid addresses', async () => {
      const { addTokenSupport } = useBankFunctions()
      await addTokenSupport(MOCK_DATA.invalidAddress as `0x${string}`)

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('Invalid address')
      )
      expect(mockUseWriteContract).not.toHaveBeenCalled()
    })

    it('should handle transaction failures', async () => {
      const { addTokenSupport } = useBankFunctions()
      const writeContractMock = vi.fn().mockRejectedValue(new Error('Transaction failed'))
      mockUseWriteContract.mockReturnValue({
        writeContract: writeContractMock,
        data: ref(undefined),
        isLoading: ref(false),
        error: ref(new Error('Transaction failed')),
        isSuccess: ref(false)
      })

      await addTokenSupport(MOCK_DATA.validTokenAddress)

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(expect.stringContaining('failed'))
    })
  })

  describe('Transfer Functions', () => {
    it('should call transferERC20 with correct parameters', async () => {
      const { transferERC20 } = useBankFunctions()
      const writeContractMock = vi.fn().mockResolvedValue({ hash: MOCK_DATA.transactionHash })
      mockUseWriteContract.mockReturnValue({
        writeContract: writeContractMock,
        data: ref(undefined),
        isLoading: ref(false),
        error: ref(null),
        isSuccess: ref(false)
      })

      await transferERC20(MOCK_DATA.validTokenAddress, MOCK_DATA.validUserAddress, MOCK_DATA.amount)

      expect(writeContractMock).toHaveBeenCalledWith({
        address: MOCK_DATA.validBankAddress,
        abi: expect.any(Array),
        functionName: 'transferERC20',
        args: [MOCK_DATA.validTokenAddress, MOCK_DATA.validUserAddress, MOCK_DATA.amount]
      })
    })
  })
})

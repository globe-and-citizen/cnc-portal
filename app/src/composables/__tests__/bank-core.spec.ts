import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useBankReads, useBankWrites, useBankGetFunction } from '../bank'

// Hoisted mock variables for core functionality
const { 
  mockUseReadContract,
  mockUseWriteContract,
  mockUseWaitForTransactionReceipt,
  mockTeamStore,
  mockToastStore,
  mockGetContract,
  mockLog
} = vi.hoisted(() => ({
  mockUseReadContract: vi.fn(() => ({
    data: undefined,
    error: null,
    isLoading: false
  })),
  mockUseWriteContract: vi.fn(() => ({
    data: undefined,
    writeContract: vi.fn(),
    isPending: false,
    error: null
  })),
  mockUseWaitForTransactionReceipt: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isSuccess: false,
    error: null
  })),
  mockTeamStore: {
    getContractAddressByType: vi.fn((type: string) => {
      if (type === 'Bank') return '0x1234567890123456789012345678901234567890'
      return undefined
    })
  },
  mockToastStore: {
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  },
  mockGetContract: vi.fn(() => ({
    abi: [
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: '_to', type: 'address' },
          { name: '_amount', type: 'uint256' }
        ]
      }
    ]
  })),
  mockLog: vi.fn()
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useReadContract: mockUseReadContract,
  useWriteContract: mockUseWriteContract,
  useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt
}))

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore),
  useToastStore: vi.fn(() => mockToastStore)
}))

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    isAddress: vi.fn((address: string) => /^0x[a-fA-F0-9]{40}$/.test(address)),
    parseEther: vi.fn((value: string) => BigInt(value) * BigInt(10 ** 18)),
    getContract: mockGetContract,
    decodeFunctionData: vi.fn(() => ({
      functionName: 'transfer',
      args: ['0x123', '1.0']
    }))
  }
})

vi.mock('@/utils', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    log: { error: mockLog },
    parseError: vi.fn((error: Error) => error.message)
  }
})

// Test constants
const MOCK_DATA = {
  validAddress: '0x1234567890123456789012345678901234567890',
  invalidAddress: 'invalid-address',
  bankAddress: '0x1234567890123456789012345678901234567890'
} as const

describe('useBankGetFunction (Legacy)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should set initial values correctly', () => {
      const { execute: getFunction, data, inputs, args } = useBankGetFunction('0x1')

      expect(getFunction).toBeInstanceOf(Function)
      expect(data.value).toBe(undefined)
      expect(inputs.value).toStrictEqual([])
      expect(args.value).toStrictEqual([])
    })

    it('should return data correctly', async () => {
      const { execute: getFunction, data, args, inputs } = useBankGetFunction('0x1')
      
      await getFunction('data')
      
      expect(data.value).toStrictEqual('transfer')
      expect(args.value).toStrictEqual(['0x123', '1.0'])
      expect(inputs.value).toStrictEqual(['_to', '_amount'])
    })

    it('should log error when getFunction fails', async () => {
      const { execute: getFunction } = useBankGetFunction('0x1')

      mockGetContract.mockRejectedValue(new Error('error'))
      await getFunction('data')
      
      expect(mockLog).toHaveBeenCalled()
    })
  })
})

describe('useBankReads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Contract Address Resolution', () => {
    it('should get bank address from team store', () => {
      const { bankAddress } = useBankReads()
      
      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('Bank')
      expect(bankAddress.value).toBe(MOCK_DATA.bankAddress)
    })
  })

  describe('Read Functions', () => {
    it('should call useReadContract for paused state', () => {
      const { useBankPaused } = useBankReads()
      useBankPaused()
      
      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'paused',
        query: { enabled: expect.any(Object) }
      })
    })

    it('should call useReadContract for owner', () => {
      const { useBankOwner } = useBankReads()
      useBankOwner()
      
      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'owner',
        query: { enabled: expect.any(Object) }
      })
    })

    it('should call useReadContract for token support check', () => {
      const { useBankIsTokenSupported } = useBankReads()
      useBankIsTokenSupported(MOCK_DATA.validAddress)
      
      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'isTokenSupported',
        args: [MOCK_DATA.validAddress],
        query: { enabled: expect.any(Object) }
      })
    })
  })
})

describe('useBankWrites Core', () => {
  const mockWriteContract = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      data: undefined,
      writeContract: mockWriteContract,
      isPending: false,
      error: null
    })
  })

  describe('Contract Write Setup', () => {
    it('should initialize write contract composable', () => {
      useBankWrites()
      
      expect(mockUseWriteContract).toHaveBeenCalled()
      expect(mockUseWaitForTransactionReceipt).toHaveBeenCalled()
    })

    it('should provide loading states', () => {
      const { isLoading, isWritePending, isConfirming } = useBankWrites()
      
      expect(isLoading.value).toBe(false)
      expect(isWritePending.value).toBe(false)
      expect(isConfirming.value).toBe(false)
    })
  })

  describe('Execute Write Function', () => {
    it('should execute write contract with correct parameters', async () => {
      const { executeWrite } = useBankWrites()
      
      await executeWrite('pause')
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'pause',
        args: []
      })
    })

    it('should execute write contract with arguments', async () => {
      const { executeWrite } = useBankWrites()
      const args = [MOCK_DATA.validAddress]
      
      await executeWrite('changeTipsAddress', args)
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        functionName: 'changeTipsAddress',
        args
      })
    })

    it('should show error toast when bank address not found', async () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      const { executeWrite } = useBankWrites()
      
      await executeWrite('pause')
      
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Bank contract address not found')
      expect(mockWriteContract).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle write contract errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const writeError = new Error('Transaction failed')
      mockUseWriteContract.mockReturnValue({
        data: undefined,
        writeContract: mockWriteContract,
        isPending: false,
        error: writeError
      })

      useBankWrites()
      await nextTick()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Bank contract write error:', writeError)
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Transaction failed: Transaction failed'
      )
      
      consoleErrorSpy.mockRestore()
    })

    it('should handle transaction receipt errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const receiptError = new Error('Confirmation failed')
      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        error: receiptError
      })

      useBankWrites()
      await nextTick()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Bank transaction receipt error:', receiptError)
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Transaction confirmation failed: Confirmation failed'
      )
      
      consoleErrorSpy.mockRestore()
    })
  })
})

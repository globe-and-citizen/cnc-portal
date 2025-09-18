import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useBankWrites } from '../writes'
import { BANK_FUNCTION_NAMES } from '../types'

// Hoisted mock variables
const {
  mockUseContractWrites,
  mockUseQueryClient,
  mockUseAccount,
  mockTeamStore,
  mockQueryClient,
  mockUseWriteContract,
  mockUseWaitForTransactionReceipt,
  mockUseEstimateGas
} = vi.hoisted(() => {
  const mockQueryClient = {
    invalidateQueries: vi.fn()
  }

  return {
    mockUseContractWrites: vi.fn(),
    mockUseQueryClient: vi.fn(() => mockQueryClient),
    mockUseAccount: vi.fn(() => ({
      chainId: ref(1)
    })),
    mockTeamStore: {
      getContractAddressByType: vi.fn((type: string) => {
        if (type === 'Bank') return '0x1234567890123456789012345678901234567890'
        return undefined
      })
    },
    mockQueryClient,
    mockUseWriteContract: vi.fn(() => ({
      writeContractAsync: vi.fn(),
      data: ref(undefined),
      isPending: ref(false),
      error: ref(null)
    })),
    mockUseWaitForTransactionReceipt: vi.fn(() => ({
      data: ref(undefined),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(null)
    })),
    mockUseEstimateGas: vi.fn(() => ({
      data: ref(undefined),
      isLoading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    }))
  }
})

// Mock external dependencies
vi.mock('@/composables/contracts/useContractWrites', () => ({
  useContractWrites: mockUseContractWrites
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: mockUseQueryClient
}))

vi.mock('@wagmi/vue', async () => {
  return {
    useAccount: mockUseAccount,
    createConfig: vi.fn(),
    mainnet: {},
    sepolia: {},
    polygon: {},
    hardhat: {},
    useWriteContract: mockUseWriteContract,
    useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
    useEstimateGas: mockUseEstimateGas,
    polygonAmoy: {}
  }
})

vi.mock('@/utils', () => ({
  parseError: (error: unknown) => String(error)
}))

vi.mock('@/artifacts/abi/bank.json', () => ({
  default: [
    {
      type: 'function',
      name: 'pause',
      inputs: [],
      outputs: []
    },
    {
      type: 'function',
      name: 'unpause',
      inputs: [],
      outputs: []
    }
  ]
}))

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore),
  useToastStore: vi.fn(() => ({
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  }))
}))

// Test constants
const MOCK_DATA = {
  bankAddress: '0x1234567890123456789012345678901234567890',
  chainId: 1,
  functionName: BANK_FUNCTION_NAMES.PAUSE,
  args: [] as readonly unknown[],
  value: BigInt(1),
  options: {}
} as const

const mockBaseWrites = {
  executeWrite: vi.fn(),
  estimateGas: vi.fn(),
  canExecuteTransaction: vi.fn(),
  invalidateQueries: vi.fn(),
  isLoading: ref(false),
  error: ref(null),
  isSuccess: ref(false)
}

describe('useBankWrites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContractWrites.mockReturnValue(mockBaseWrites)
  })

  describe('Initialization', () => {
    it('should initialize with correct contract configuration', () => {
      useBankWrites()

      expect(mockUseContractWrites).toHaveBeenCalledWith({
        contractAddress: MOCK_DATA.bankAddress,
        abi: expect.any(Array),
        chainId: MOCK_DATA.chainId
      })
    })

    it('should get bank address from team store', () => {
      useBankWrites()

      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('Bank')
    })

    it('should get query client', () => {
      useBankWrites()

      expect(mockUseQueryClient).toHaveBeenCalled()
    })
  })

  describe('executeWrite', () => {
    it('should execute write with valid bank function', async () => {
      const { executeWrite } = useBankWrites()

      await executeWrite(MOCK_DATA.functionName, MOCK_DATA.args, MOCK_DATA.value, MOCK_DATA.options)

      expect(mockBaseWrites.executeWrite).toHaveBeenCalledWith(
        MOCK_DATA.functionName,
        MOCK_DATA.args,
        MOCK_DATA.value,
        MOCK_DATA.options
      )
    })

    it('should throw error for invalid bank function', async () => {
      const { executeWrite } = useBankWrites()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(executeWrite('invalidFunction' as any)).rejects.toThrow(
        'Invalid bank function: invalidFunction'
      )
    })

    it('should work with all valid bank functions', async () => {
      const { executeWrite } = useBankWrites()

      const validFunctions = Object.values(BANK_FUNCTION_NAMES)

      for (const functionName of validFunctions) {
        await executeWrite(functionName)
        expect(mockBaseWrites.executeWrite).toHaveBeenCalledWith(
          functionName,
          [],
          undefined,
          undefined
        )
      }

      expect(mockBaseWrites.executeWrite).toHaveBeenCalledTimes(validFunctions.length)
    })
  })

  describe('estimateGas', () => {
    it('should estimate gas with valid bank function', async () => {
      const { estimateGas } = useBankWrites()

      await estimateGas(MOCK_DATA.functionName, MOCK_DATA.args, MOCK_DATA.value)

      expect(mockBaseWrites.estimateGas).toHaveBeenCalledWith(
        MOCK_DATA.functionName,
        MOCK_DATA.args,
        MOCK_DATA.value
      )
    })

    it('should throw error for invalid bank function', async () => {
      const { estimateGas } = useBankWrites()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(estimateGas('invalidFunction' as any)).rejects.toThrow(
        'Invalid bank function: invalidFunction'
      )
    })
  })

  describe('canExecuteTransaction', () => {
    it('should check if transaction can execute with valid function', async () => {
      mockBaseWrites.canExecuteTransaction.mockResolvedValue(true)
      const { canExecuteTransaction } = useBankWrites()

      const result = await canExecuteTransaction(
        MOCK_DATA.functionName,
        MOCK_DATA.args,
        MOCK_DATA.value
      )

      expect(mockBaseWrites.canExecuteTransaction).toHaveBeenCalledWith(
        MOCK_DATA.functionName,
        MOCK_DATA.args,
        MOCK_DATA.value
      )
      expect(result).toBe(true)
    })

    it('should return false for invalid bank function', async () => {
      const { canExecuteTransaction } = useBankWrites()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await canExecuteTransaction('invalidFunction' as any)

      expect(result).toBe(false)
      expect(mockBaseWrites.canExecuteTransaction).not.toHaveBeenCalled()
    })
  })

  describe('invalidateBankQueries', () => {
    it('should invalidate paused queries for pause/unpause functions', async () => {
      const { invalidateBankQueries } = useBankWrites()

      await invalidateBankQueries(BANK_FUNCTION_NAMES.PAUSE)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bankAddress,
            chainId: MOCK_DATA.chainId,
            functionName: BANK_FUNCTION_NAMES.PAUSED
          }
        ]
      })
    })

    it('should invalidate tips address queries for changeTipsAddress', async () => {
      const { invalidateBankQueries } = useBankWrites()

      await invalidateBankQueries(BANK_FUNCTION_NAMES.CHANGE_TIPS_ADDRESS)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bankAddress,
            chainId: MOCK_DATA.chainId,
            functionName: BANK_FUNCTION_NAMES.TIPS_ADDRESS
          }
        ]
      })
    })

    it('should invalidate owner queries for ownership functions', async () => {
      const { invalidateBankQueries } = useBankWrites()

      await invalidateBankQueries(BANK_FUNCTION_NAMES.TRANSFER_OWNERSHIP)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bankAddress,
            chainId: MOCK_DATA.chainId,
            functionName: BANK_FUNCTION_NAMES.OWNER
          }
        ]
      })
    })

    it('should invalidate token queries for changeTokenAddress', async () => {
      const { invalidateBankQueries } = useBankWrites()

      await invalidateBankQueries(BANK_FUNCTION_NAMES.CHANGE_TOKEN_ADDRESS)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(2)
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bankAddress,
            chainId: MOCK_DATA.chainId,
            functionName: BANK_FUNCTION_NAMES.IS_TOKEN_SUPPORTED
          }
        ]
      })
    })

    it('should invalidate balance queries for transfer functions', async () => {
      const { invalidateBankQueries } = useBankWrites()

      await invalidateBankQueries(BANK_FUNCTION_NAMES.TRANSFER)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'balance',
          {
            address: MOCK_DATA.bankAddress,
            chainId: MOCK_DATA.chainId
          }
        ]
      })
    })

    it('should invalidate all queries for unknown functions', async () => {
      const { invalidateBankQueries } = useBankWrites()

      await invalidateBankQueries(BANK_FUNCTION_NAMES.INITIALIZE)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bankAddress,
            chainId: MOCK_DATA.chainId
          }
        ]
      })
    })

    it('should handle missing bank address gracefully', async () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      const { invalidateBankQueries } = useBankWrites()

      await invalidateBankQueries(BANK_FUNCTION_NAMES.PAUSE)

      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled()
    })
  })

  describe('Return Interface', () => {
    it('should return all base functionality', () => {
      const bankWrites = useBankWrites()

      // Should include all base writes properties
      expect(bankWrites.isLoading).toBeDefined()
      expect(bankWrites.error).toBeDefined()
    })

    it('should return bank-specific overrides', () => {
      const bankWrites = useBankWrites()

      expect(bankWrites).toHaveProperty('executeWrite')
      expect(bankWrites).toHaveProperty('estimateGas')
      expect(bankWrites).toHaveProperty('canExecuteTransaction')
      expect(bankWrites).toHaveProperty('invalidateBankQueries')
      expect(bankWrites).toHaveProperty('invalidateQueries')

      expect(typeof bankWrites.executeWrite).toBe('function')
      expect(typeof bankWrites.estimateGas).toBe('function')
      expect(typeof bankWrites.canExecuteTransaction).toBe('function')
      expect(typeof bankWrites.invalidateBankQueries).toBe('function')
      expect(typeof bankWrites.invalidateQueries).toBe('function')
    })

    it('should preserve generic invalidateQueries from base', () => {
      const bankWrites = useBankWrites()

      expect(bankWrites.invalidateQueries).toBe(mockBaseWrites.invalidateQueries)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined chain ID', () => {
      mockUseAccount.mockReturnValue({ chainId: ref(null as unknown as number) })

      expect(() => useBankWrites()).not.toThrow()
    })

    it('should handle missing bank address', () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)

      expect(() => useBankWrites()).not.toThrow()
    })

    it('should work with default parameters', async () => {
      const { executeWrite } = useBankWrites()

      await executeWrite(BANK_FUNCTION_NAMES.PAUSE)

      expect(mockBaseWrites.executeWrite).toHaveBeenCalledWith(
        BANK_FUNCTION_NAMES.PAUSE,
        [],
        undefined,
        undefined
      )
    })
  })
})

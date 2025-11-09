import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useContractWrites } from '../useContractWritesV2'
import type { ContractWriteConfig } from '../useContractWritesV2'
import type { Address, Abi } from 'viem'

// Hoisted mock variables
const {
  mockUseWriteContract,
  mockUseWaitForTransactionReceipt,
  mockUseAccount,
  mockUseQuery,
  mockUseQueryClient,
  mockQueryClient,
  mockUseTransactionTimeline,
  mockLog,
  mockWaitForCondition,
  mockFormatDataForDisplay
} = vi.hoisted(() => {
  const mockQueryClient = {
    invalidateQueries: vi.fn().mockResolvedValue(undefined)
  }

  return {
    mockUseWriteContract: vi.fn(),
    mockUseWaitForTransactionReceipt: vi.fn(),
    mockUseAccount: vi.fn(),
    mockUseQuery: vi.fn(),
    mockUseQueryClient: vi.fn(() => mockQueryClient),
    mockQueryClient,
    mockUseTransactionTimeline: vi.fn(),
    mockLog: { error: vi.fn() },
    mockWaitForCondition: vi.fn().mockResolvedValue(true),
    mockFormatDataForDisplay: vi.fn(data => data)
  }
})

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useWriteContract: mockUseWriteContract,
  useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
  useAccount: mockUseAccount
}))

vi.mock('@tanstack/vue-query', () => ({
  useQuery: mockUseQuery,
  useQueryClient: mockUseQueryClient
}))

vi.mock('@wagmi/core', () => ({
  simulateContract: vi.fn()
}))

vi.mock('@/wagmi.config', () => ({
  config: { chains: [] }
}))

vi.mock('@/composables/useTransactionTimeline', () => ({
  useTransactionTimeline: mockUseTransactionTimeline
}))

vi.mock('@/utils', () => ({
  formatDataForDisplay: mockFormatDataForDisplay,
  log: mockLog,
  waitForCondition: mockWaitForCondition
}))

// Test constants
const MOCK_DATA = {
  contractAddress: '0x1234567890123456789012345678901234567890' as Address,
  functionName: 'testFunction',
  args: ['arg1', 'arg2'] as const,
  transactionHash: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
} as const

const MOCK_ABI = [
  {
    type: 'function',
    name: 'testFunction',
    inputs: [
      { name: 'param1', type: 'string' },
      { name: 'param2', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const

describe('useContractWrites (V2)', () => {
  let mockConfig: ContractWriteConfig

  beforeEach(() => {
    vi.clearAllMocks()

    mockConfig = {
      contractAddress: MOCK_DATA.contractAddress,
      abi: MOCK_ABI as Abi,
      functionName: MOCK_DATA.functionName,
      args: MOCK_DATA.args
    }

    // Set up default mock implementations
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: vi.fn(),
      data: ref(undefined),
      isPending: ref(false),
      isSuccess: ref(false),
      error: ref(null),
      reset: vi.fn()
    })

    mockUseWaitForTransactionReceipt.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(null)
    })

    mockUseQuery.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      isSuccess: ref(false),
      isError: ref(false),
      error: ref(null),
      refetch: vi.fn().mockResolvedValue({ data: { gasLimit: BigInt(21000) } })
    })

    mockUseAccount.mockReturnValue({
      chainId: ref(1)
    })

    mockUseTransactionTimeline.mockReturnValue({
      currentStep: ref('idle'),
      timelineSteps: ref([])
    })
  })

  describe('Initialization', () => {
    it('should initialize with correct dependencies', () => {
      useContractWrites(mockConfig)

      expect(mockUseWriteContract).toHaveBeenCalled()
      expect(mockUseWaitForTransactionReceipt).toHaveBeenCalled()
      expect(mockUseAccount).toHaveBeenCalled()
      expect(mockUseQuery).toHaveBeenCalled()
      expect(mockUseQueryClient).toHaveBeenCalled()
      expect(mockUseTransactionTimeline).toHaveBeenCalled()
    })

    it('should return expected interface', () => {
      const result = useContractWrites(mockConfig)

      expect(result).toHaveProperty('writeResult')
      expect(result).toHaveProperty('receiptResult')
      expect(result).toHaveProperty('simulateGasResult')
      expect(result).toHaveProperty('executeWrite')
      expect(result).toHaveProperty('invalidateQueries')
      expect(result).toHaveProperty('currentStep')
      expect(result).toHaveProperty('timelineSteps')
    })
  })

  describe('executeWrite Function', () => {
    it('should execute write operation successfully', async () => {
      const mockWriteContractAsync = vi.fn().mockResolvedValue({
        hash: MOCK_DATA.transactionHash
      })

      // Override mocks for this specific test
      mockUseQuery.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        isError: ref(false),
        error: ref(null),
        refetch: vi.fn().mockResolvedValue({ data: { gasLimit: BigInt(21000) } })
      })

      mockUseWriteContract.mockReturnValueOnce({
        writeContractAsync: mockWriteContractAsync,
        data: ref(undefined),
        isPending: ref(false),
        isSuccess: ref(false),
        error: ref(null),
        reset: vi.fn()
      })

      mockUseWaitForTransactionReceipt.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        error: ref(null)
      })

      const { executeWrite } = useContractWrites(mockConfig)
      const result = await executeWrite()

      expect(mockWriteContractAsync).toHaveBeenCalledWith({
        address: MOCK_DATA.contractAddress,
        abi: MOCK_ABI,
        functionName: MOCK_DATA.functionName,
        args: []
      })

      expect(result).toEqual({ hash: MOCK_DATA.transactionHash })
    })

    it('should handle missing contract address', async () => {
      const configWithoutAddress = {
        ...mockConfig,
        contractAddress: undefined
      }

      const { executeWrite } = useContractWrites(configWithoutAddress)
      const result = await executeWrite()

      expect(result).toBeUndefined()
      expect(mockLog.error).toHaveBeenCalledWith(
        `Failed to execute ${MOCK_DATA.functionName}:`,
        expect.any(Error)
      )
    })
  })

  describe('Gas Estimation', () => {
    it('should perform gas estimation by default', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: { gasLimit: BigInt(21000) } })
      const mockWriteContractAsync = vi.fn().mockResolvedValue({
        hash: MOCK_DATA.transactionHash
      })

      mockUseQuery.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        isError: ref(false),
        error: ref(null),
        refetch: mockRefetch
      })

      mockUseWriteContract.mockReturnValueOnce({
        writeContractAsync: mockWriteContractAsync,
        data: ref(undefined),
        isPending: ref(false),
        isSuccess: ref(false),
        error: ref(null),
        reset: vi.fn()
      })

      mockUseWaitForTransactionReceipt.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        error: ref(null)
      })

      const { executeWrite } = useContractWrites(mockConfig)
      await executeWrite(['arg1'])

      expect(mockRefetch).toHaveBeenCalled()
    })

    it('should skip gas estimation when skipGasEstimation is true', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: { gasLimit: BigInt(21000) } })
      const mockWriteContractAsync = vi.fn().mockResolvedValue({
        hash: MOCK_DATA.transactionHash
      })

      mockUseQuery.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        isError: ref(false),
        error: ref(null),
        refetch: mockRefetch
      })

      mockUseWriteContract.mockReturnValueOnce({
        writeContractAsync: mockWriteContractAsync,
        data: ref(undefined),
        isPending: ref(false),
        isSuccess: ref(false),
        error: ref(null),
        reset: vi.fn()
      })

      mockUseWaitForTransactionReceipt.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        error: ref(null)
      })

      const { executeWrite } = useContractWrites(mockConfig)
      await executeWrite(['arg1'], undefined, { skipGasEstimation: true })

      expect(mockRefetch).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle gas estimation failure', async () => {
      const mockWriteContractAsync = vi.fn()

      mockUseQuery.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(false),
        isError: ref(true),
        error: ref(null),
        refetch: vi.fn().mockResolvedValue({ error: new Error('Gas estimation failed') })
      })

      mockUseWriteContract.mockReturnValueOnce({
        writeContractAsync: mockWriteContractAsync,
        data: ref(undefined),
        isPending: ref(false),
        isSuccess: ref(false),
        error: ref(null),
        reset: vi.fn()
      })

      const { executeWrite } = useContractWrites(mockConfig)
      const result = await executeWrite(['arg1'])

      expect(result).toBeUndefined()
      expect(mockLog.error).toHaveBeenCalledWith(
        `Failed to execute ${MOCK_DATA.functionName}:`,
        expect.any(Error)
      )
    })

    it('should handle writeContract failure', async () => {
      const mockWriteContractAsync = vi.fn().mockRejectedValue(new Error('Transaction failed'))

      mockUseQuery.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        isError: ref(false),
        error: ref(null),
        refetch: vi.fn().mockResolvedValue({ data: { gasLimit: BigInt(21000) } })
      })

      mockUseWriteContract.mockReturnValueOnce({
        writeContractAsync: mockWriteContractAsync,
        data: ref(undefined),
        isPending: ref(false),
        isSuccess: ref(false),
        error: ref(null),
        reset: vi.fn()
      })

      const { executeWrite } = useContractWrites(mockConfig)
      const result = await executeWrite(['arg1'])

      expect(result).toBeUndefined()
      expect(mockLog.error).toHaveBeenCalledWith(
        `Failed to execute ${MOCK_DATA.functionName}:`,
        expect.any(Error)
      )
    })
  })

  describe('Query Management', () => {
    it('should expose query key for external access', () => {
      const { simulateGasResult } = useContractWrites(mockConfig)

      expect(simulateGasResult.queryKey).toBeDefined()
      expect(Array.isArray(simulateGasResult.queryKey)).toBe(true)
    })

    it('should allow custom query invalidation', async () => {
      const { invalidateQueries } = useContractWrites(mockConfig)

      await invalidateQueries()

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.contractAddress,
            chainId: 1
          }
        ]
      })
    })
  })

  describe('Transaction Timeline Integration', () => {
    it('should initialize transaction timeline with correct parameters', () => {
      useContractWrites(mockConfig)

      expect(mockUseTransactionTimeline).toHaveBeenCalledWith({
        writeResult: expect.any(Object),
        receiptResult: expect.any(Object),
        simulateGasResult: expect.any(Object)
      })
    })

    it('should expose timeline data', () => {
      const { currentStep, timelineSteps } = useContractWrites(mockConfig)

      expect(currentStep).toBeDefined()
      expect(timelineSteps).toBeDefined()
    })
  })
})
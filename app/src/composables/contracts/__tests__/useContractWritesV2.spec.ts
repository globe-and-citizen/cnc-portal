import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useContractWrites } from '../useContractWritesV2'
import type { ContractWriteConfig } from '../useContractWritesV2'
import type { Address, Abi } from 'viem'
import {
  useWriteContractFn,
  useWaitForTransactionReceiptFn,
  useAccountFn,
  useChainIdFn
} from '@/tests/mocks'
import { useQueryFn, useQueryClientFn } from '@/tests/mocks'

// Local mocks for composables/utils not covered by global setup
const { mockUseTransactionTimeline, mockLog, mockWaitForCondition, mockFormatDataForDisplay } =
  vi.hoisted(() => {
    const mockQueryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined)
    }

    return {
      mockQueryClient,
      mockUseTransactionTimeline: vi.fn(),
      mockLog: { error: vi.fn() },
      mockWaitForCondition: vi.fn().mockResolvedValue(true),
      mockFormatDataForDisplay: vi.fn((data) => data)
    }
  })

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

    // Set up default mock implementations using exported factory fns
    useWriteContractFn.mockReturnValue({
      mutateAsync: vi.fn(),
      data: ref(undefined),
      isPending: ref(false),
      isSuccess: ref(false),
      error: ref(null),
      reset: vi.fn()
    })

    useWaitForTransactionReceiptFn.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(null)
    })

    useQueryFn.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      isSuccess: ref(false),
      isError: ref(false),
      error: ref(null),
      refetch: vi.fn().mockResolvedValue({ data: { gasLimit: BigInt(21000) } })
    })

    useAccountFn.mockReturnValue({
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

      expect(useWriteContractFn).toHaveBeenCalled()
      expect(useWaitForTransactionReceiptFn).toHaveBeenCalled()
      expect(useChainIdFn).toHaveBeenCalled()
      expect(useQueryFn).toHaveBeenCalled()
      expect(useQueryClientFn).toHaveBeenCalled()
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
      const mockMutateAsync = vi.fn().mockResolvedValue({
        hash: MOCK_DATA.transactionHash
      })

      // Override mocks for this specific test
      useQueryFn.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        isError: ref(false),
        error: ref(null),
        refetch: vi.fn().mockResolvedValue({ data: { gasLimit: BigInt(21000) } })
      })

      useWriteContractFn.mockReturnValueOnce({
        mutateAsync: mockMutateAsync,
        data: ref(undefined),
        isPending: ref(false),
        isSuccess: ref(false),
        error: ref(null),
        reset: vi.fn()
      })

      useWaitForTransactionReceiptFn.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        error: ref(null)
      })

      const { executeWrite } = useContractWrites(mockConfig)
      const result = await executeWrite()

      expect(mockMutateAsync).toHaveBeenCalledWith({
        address: MOCK_DATA.contractAddress,
        abi: MOCK_ABI,
        functionName: MOCK_DATA.functionName,
        args: [],
        gas: 500000n
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
        `Failed to execute ${MOCK_DATA.functionName}: \n`,
        expect.any(Error)
      )
    })
  })

  describe('Gas Estimation', () => {
    it('should perform gas estimation by default', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: { gasLimit: BigInt(21000) } })
      const mockMutateAsync = vi.fn().mockResolvedValue({
        hash: MOCK_DATA.transactionHash
      })

      useQueryFn.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        isError: ref(false),
        error: ref(null),
        refetch: mockRefetch
      })

      useWriteContractFn.mockReturnValueOnce({
        mutateAsync: mockMutateAsync,
        data: ref(undefined),
        isPending: ref(false),
        isSuccess: ref(false),
        error: ref(null),
        reset: vi.fn()
      })

      useWaitForTransactionReceiptFn.mockReturnValueOnce({
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
      const mockMutateAsync = vi.fn().mockResolvedValue({
        hash: MOCK_DATA.transactionHash
      })

      useQueryFn.mockReturnValueOnce({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(true),
        isError: ref(false),
        error: ref(null),
        refetch: mockRefetch
      })

      useWriteContractFn.mockReturnValueOnce({
        mutateAsync: mockMutateAsync,
        data: ref(undefined),
        isPending: ref(false),
        isSuccess: ref(false),
        error: ref(null),
        reset: vi.fn()
      })

      useWaitForTransactionReceiptFn.mockReturnValueOnce({
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
})

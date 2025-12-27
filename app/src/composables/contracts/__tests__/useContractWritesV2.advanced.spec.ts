import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useContractWrites } from '../useContractWritesV2'
import type { ContractWriteConfig } from '../useContractWritesV2'
import type { Address, Abi } from 'viem'

// Hoisted mock variables
const {
  mockUseWriteContract,
  mockUseWaitForTransactionReceipt,
  mockUseAccount,
  mockUseChainId,
  mockUseQuery,
  mockUseQueryClient,
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
    mockUseChainId: vi.fn(() => 11155111),
    mockUseQuery: vi.fn(),
    mockUseQueryClient: vi.fn(() => mockQueryClient),
    mockQueryClient,
    mockUseTransactionTimeline: vi.fn(),
    mockLog: { error: vi.fn() },
    mockWaitForCondition: vi.fn().mockResolvedValue(true),
    mockFormatDataForDisplay: vi.fn((data) => data)
  }
})

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useWriteContract: mockUseWriteContract,
  useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
  useAccount: mockUseAccount,
  useChainId: mockUseChainId
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
  waitForCondition: mockWaitForCondition,
  parseErrorV2: vi.fn((error: Error) => error.name + ': ' + error.message.split('.')[0])
}))

// Test constants
const MOCK_DATA = {
  contractAddress: '0x1234567890123456789012345678901234567890' as Address,
  altAddress: '0x9876543210987654321098765432109876543210' as Address,
  functionName: 'testFunction',
  args: ['arg1', 'arg2'] as const,
  value: BigInt(1000),
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

describe('useContractWrites (V2) - Advanced Tests', () => {
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

  describe('Reactive Configuration Handling', () => {
    it('should handle reactive contract address changes', async () => {
      const reactiveAddress = ref(MOCK_DATA.contractAddress)
      const config = {
        ...mockConfig,
        contractAddress: reactiveAddress
      }

      useContractWrites(config)

      // Change address
      reactiveAddress.value = MOCK_DATA.altAddress
      await nextTick()

      // Verify that the composable handles reactive changes
      expect(mockUseQuery).toHaveBeenCalled()
    })

    it('should handle reactive function name and args', async () => {
      const reactiveFunctionName = ref('testFunction' as string)
      const reactiveArgs = ref(['arg1', 'arg2'] as readonly unknown[])

      const config = {
        ...mockConfig,
        functionName: reactiveFunctionName,
        args: reactiveArgs
      }

      useContractWrites(config)

      // Change values
      reactiveFunctionName.value = 'newFunction'
      reactiveArgs.value = ['newArg1', 'newArg2']
      await nextTick()

      expect(mockUseQuery).toHaveBeenCalled()
    })

    it('should use provided chainId over account chainId', () => {
      const customChainId = 42
      const configWithChainId = {
        ...mockConfig,
        chainId: customChainId
      }

      useContractWrites(configWithChainId)
      expect(mockUseQuery).toHaveBeenCalled()
    })
  })

  describe('Complex Error Scenarios', () => {
    it('should handle waitForCondition timeout', async () => {
      const mockWriteContractAsync = vi.fn().mockResolvedValue({
        hash: MOCK_DATA.transactionHash
      })

      mockWaitForCondition.mockRejectedValue(new Error('Timeout waiting for transaction'))

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
        `Failed to execute ${MOCK_DATA.functionName}: \n`,
        expect.any(Error)
      )
    })

    it('should handle write contract error watchers', async () => {
      const writeError = new Error('Contract write failed')
      const errorRef = ref<Error | null>(null)

      mockUseWriteContract.mockReturnValue({
        writeContractAsync: vi.fn(),
        data: ref(undefined),
        isPending: ref(false),
        isSuccess: ref(false),
        error: errorRef,
        reset: vi.fn()
      })

      useContractWrites(mockConfig)

      // Simulate error
      errorRef.value = writeError
      await nextTick()

      expect(mockLog.error).toHaveBeenCalledWith('Contract write error. \n', expect.any(String))
    })

    it('should handle receipt error watchers', async () => {
      const receiptError = new Error('Receipt error')
      const errorRef = ref<Error | null>(null)

      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(false),
        error: errorRef
      })

      useContractWrites(mockConfig)

      // Simulate error
      errorRef.value = receiptError
      await nextTick()

      expect(mockLog.error).toHaveBeenCalledWith(
        'Transaction receipt error. \n',
        expect.any(String)
      )
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle executeWrite with value parameter', async () => {
      const mockWriteContractAsync = vi.fn().mockResolvedValue({
        hash: MOCK_DATA.transactionHash
      })

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
      await executeWrite(['arg1'], MOCK_DATA.value)

      expect(mockWriteContractAsync).toHaveBeenCalledWith({
        address: MOCK_DATA.contractAddress,
        abi: MOCK_ABI,
        functionName: MOCK_DATA.functionName,
        args: ['arg1'],
        value: MOCK_DATA.value
      })
    })
  })

  describe('Query Configuration and Management', () => {
    it('should create correct query key structure', () => {
      const { simulateGasResult } = useContractWrites(mockConfig)

      expect(simulateGasResult.queryKey).toEqual(['simulateContract', expect.any(Object)])
    })

    it('should setup query configuration correctly', () => {
      useContractWrites(mockConfig)

      // Verify that useQuery was called, indicating proper setup
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.any(Array),
          queryFn: expect.any(Function),
          enabled: expect.any(Object),
          refetchInterval: false,
          refetchOnWindowFocus: false
        })
      )
    })
  })
})

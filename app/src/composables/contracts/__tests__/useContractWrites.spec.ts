import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useContractWrites } from '../useContractWrites'
import type { ContractWriteConfig } from '../useContractWrites'
import { type Address } from 'viem'

// Hoisted mock variables
const { 
  mockUseWriteContract,
  mockUseWaitForTransactionReceipt,
  mockUseAccount,
  mockUseEstimateGas,
  mockUseQueryClient,
  mockQueryClient,
  mockToastStore
} = vi.hoisted(() => {
  const mockQueryClient = {
    invalidateQueries: vi.fn()
  }

  return {
    mockUseWriteContract: vi.fn(),
    mockUseWaitForTransactionReceipt: vi.fn(),
    mockUseAccount: vi.fn(() => ({
      chainId: ref(1)
    })),
    mockUseEstimateGas: vi.fn(),
    mockUseQueryClient: vi.fn(() => mockQueryClient),
    mockQueryClient,
    mockToastStore: {
      addSuccessToast: vi.fn(),
      addErrorToast: vi.fn()
    }
  }
})

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useWriteContract: mockUseWriteContract,
  useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
  useAccount: mockUseAccount,
  useEstimateGas: mockUseEstimateGas
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: mockUseQueryClient
}))

vi.mock('@/stores', () => ({
  useToastStore: vi.fn(() => mockToastStore)
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    getCurrentInstance: () => ({
      isMounted: true,
      provides: {}
    })
  }
})

vi.mock('@/utils', () => ({
  parseError: (error: unknown) => String(error)
}))

// Test constants
const MOCK_DATA = {
  contractAddress: '0x1234567890123456789012345678901234567890' as Address,
  chainId: 1,
  functionName: 'testFunction',
  args: ['arg1', 'arg2'] as const,
  value: BigInt(1000),
  encodedData: '0xabcdef' as `0x${string}`,
  transactionHash: '0x0123456789abcdef',
  gasEstimate: BigInt(21000)
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

describe('useContractWrites', () => {
  const config: ContractWriteConfig = {
    contractAddress: MOCK_DATA.contractAddress,
    abi: MOCK_ABI,
    chainId: MOCK_DATA.chainId
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock implementations
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: vi.fn(),
      data: ref(undefined),
      isPending: ref(false),
      error: ref(null)
    })

    mockUseWaitForTransactionReceipt.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(null)
    })

    // Setup useEstimateGas mock
    mockUseEstimateGas.mockReturnValue({
      data: ref(MOCK_DATA.gasEstimate),
      isLoading: ref(false),
      error: ref(null),
      refetch: vi.fn().mockResolvedValue({ data: MOCK_DATA.gasEstimate })
    })
  })

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      useContractWrites(config)

      expect(mockUseQueryClient).toHaveBeenCalled()
      expect(mockUseWriteContract).toHaveBeenCalled()
      expect(mockUseWaitForTransactionReceipt).toHaveBeenCalled()
    })
  })

  describe('executeWrite', () => {
    it('should execute write with correct parameters', async () => {
      const writeContractMock = vi.fn().mockResolvedValue({ hash: MOCK_DATA.transactionHash })
      mockUseWriteContract.mockReturnValue({
        writeContractAsync: writeContractMock,
        data: ref(undefined),
        isPending: ref(false),
        error: ref(null)
      })

      const { executeWrite } = useContractWrites(config)
      await executeWrite(MOCK_DATA.functionName, MOCK_DATA.args, MOCK_DATA.value)

      expect(writeContractMock).toHaveBeenCalledWith({
        address: MOCK_DATA.contractAddress,
        abi: MOCK_ABI,
        functionName: MOCK_DATA.functionName,
        args: MOCK_DATA.args,
        value: MOCK_DATA.value
      })
    })

    it('should expose error from useWriteContract when it fails', async () => {
    const writeError = ref(new Error('Write failed'))
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: vi.fn().mockRejectedValue(writeError.value),
      error: writeError,
      isPending: ref(false)
    })

    const { canExecuteTransaction, estimateGas, estimateGasForEncodedData } = useContractWrites({
      contractAddress: MOCK_DATA.contractAddress,
      abi: MOCK_ABI
    })

    try {
      await estimateGas(MOCK_DATA.functionName, MOCK_DATA.args)
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe('Write failed')
      }
    }
  })
  })

  describe('Query Invalidation', () => {
    it('should invalidate queries after successful transaction', async () => {
      const txHash = '0xhash'
      mockUseWriteContract.mockReturnValue({
        writeContractAsync: vi.fn().mockResolvedValue(txHash),
        data: ref(txHash),
        isPending: ref(false),
        error: ref(null)
      })

      const isConfirmed = ref(false)
      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: ref({ status: 'success' }),
        isLoading: ref(false),
        isSuccess: isConfirmed,
        error: ref(null)
      })

      const { executeWrite } = useContractWrites(config)
      await executeWrite(MOCK_DATA.functionName, MOCK_DATA.args)
      
      // Simulate transaction confirmation
      isConfirmed.value = true
      await Promise.resolve() // Wait for watcher to trigger

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.contractAddress,
            chainId: MOCK_DATA.chainId
          }
        ]
      })
    })

    it('should show success toast after transaction confirmation', async () => {
      const txHash = '0xhash'
      mockUseWriteContract.mockReturnValue({
        writeContractAsync: vi.fn().mockResolvedValue(txHash),
        data: ref(txHash),
        isPending: ref(false),
        error: ref(null)
      })

      const isConfirmed = ref(false)
      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: ref({ status: 'success' }),
        isLoading: ref(false),
        isSuccess: isConfirmed,
        error: ref(null)
      })

      const { executeWrite } = useContractWrites(config)
      await executeWrite(MOCK_DATA.functionName, MOCK_DATA.args)
      
      // Simulate transaction confirmation
      isConfirmed.value = true
      await Promise.resolve() // Wait for watcher to trigger

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
        'Transaction confirmed successfully'
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle transaction receipt errors', async () => {
      const error = new Error('Receipt error')
      const txError = ref<Error | null>(error)
      const writeData = ref('0xhash')
      
      mockUseWriteContract.mockReturnValue({
        writeContractAsync: vi.fn().mockResolvedValue('0xhash'),
        data: writeData,
        isPending: ref(false),
        error: ref(null)
      })
      
      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: ref(undefined),
        isLoading: ref(false),
        isSuccess: ref(false),
        error: txError
      })

      const { executeWrite } = useContractWrites(config)
      
      try {
        await executeWrite(MOCK_DATA.functionName, MOCK_DATA.args)
      } catch (e) {
        expect(e).toEqual(error)
        expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
          expect.stringContaining('Failed to execute testFunction')
        )
      }
    })

    it('should handle write contract errors', async () => {
      const error = new Error('Write error')
      const writeError = ref<Error | null>(error)
      
      mockUseWriteContract.mockReturnValue({
        writeContractAsync: vi.fn().mockRejectedValue(error),
        data: ref(undefined),
        isPending: ref(false),
        error: writeError
      })

      const { executeWrite } = useContractWrites(config)

      try {
        await executeWrite(MOCK_DATA.functionName, MOCK_DATA.args)
      } catch (e) {
        expect(e).toEqual(error)
      }

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('Failed to execute testFunction')
      )
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useContractWrites } from '../useContractWrites'
import type { ContractWriteConfig } from '../useContractWrites'
import { type Address } from 'viem'

// Hoisted mock variables
const { 
  mockUseEstimateGas,
  mockUseWriteContract,
  mockUseWaitForTransactionReceipt,
  mockUseAccount,
  mockUseQueryClient,
  mockQueryClient,
  mockToastStore
} = vi.hoisted(() => {
  const mockQueryClient = {
    invalidateQueries: vi.fn()
  }

  return {
    mockUseEstimateGas: vi.fn(),
    mockUseWriteContract: vi.fn(),
    mockUseWaitForTransactionReceipt: vi.fn(),
    mockUseAccount: vi.fn(() => ({
      chainId: ref(1)
    })),
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

describe('useContractWrites Gas & Advanced Features', () => {
  const config: ContractWriteConfig = {
    contractAddress: MOCK_DATA.contractAddress,
    abi: MOCK_ABI,
    chainId: MOCK_DATA.chainId
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Gas Estimation', () => {
    it('should estimate gas correctly with loading states', async () => {
      const gasEstimate = ref<bigint | undefined>(undefined)
      const isEstimateLoading = ref(false)
      const refetch = vi.fn().mockImplementation(async () => {
        isEstimateLoading.value = true
        await new Promise(resolve => setTimeout(resolve, 0))
        gasEstimate.value = MOCK_DATA.gasEstimate
        await new Promise(resolve => setTimeout(resolve, 0))
        isEstimateLoading.value = false
        return { data: MOCK_DATA.gasEstimate }
      })
      
      mockUseEstimateGas.mockReturnValue({
        data: gasEstimate,
        isLoading: isEstimateLoading,
        error: ref(null),
        refetch
      })

      const { estimateGas, isEstimatingGas } = useContractWrites(config)
      expect(isEstimatingGas.value).toBe(false)

      const estimatePromise = estimateGas(MOCK_DATA.functionName, MOCK_DATA.args, MOCK_DATA.value)
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(isEstimatingGas.value).toBe(true)

      const result = await estimatePromise
      expect(result).toBe(MOCK_DATA.gasEstimate)
      expect(isEstimatingGas.value).toBe(false)
      expect(refetch).toHaveBeenCalled()
    })

    it('should handle gas estimation errors', async () => {
      const error = new Error('Gas estimation failed')
      const refetchMock = vi.fn().mockRejectedValue(error)
      mockUseEstimateGas.mockReturnValue({
        data: ref(undefined),
        isLoading: ref(false),
        error: ref(error),
        refetch: refetchMock
      })

      const { estimateGas } = useContractWrites(config)
      await expect(estimateGas(MOCK_DATA.functionName, MOCK_DATA.args)).rejects.toThrow(
        'Gas estimation failed'
      )
    })

    it('should estimate gas for encoded data', async () => {
      const refetchMock = vi.fn().mockResolvedValue({ data: MOCK_DATA.gasEstimate })
      mockUseEstimateGas.mockReturnValue({
        data: ref(MOCK_DATA.gasEstimate),
        isLoading: ref(false),
        error: ref(null),
        refetch: refetchMock
      })

      const { estimateGasForEncodedData } = useContractWrites(config)
      const result = await estimateGasForEncodedData(MOCK_DATA.encodedData, MOCK_DATA.value)

      expect(result).toBe(MOCK_DATA.gasEstimate)
      expect(refetchMock).toHaveBeenCalled()
    })
  })

  describe('Transaction Execution Check', () => {
    it('should verify transaction can be executed and handle loading states', async () => {
      const gasEstimate = ref<bigint | undefined>(undefined)
      const isEstimateLoading = ref(false)
      const refetch = vi.fn().mockImplementation(async () => {
        isEstimateLoading.value = true
        await new Promise(resolve => setTimeout(resolve, 0))
        gasEstimate.value = MOCK_DATA.gasEstimate
        await new Promise(resolve => setTimeout(resolve, 0))
        isEstimateLoading.value = false
        return { data: MOCK_DATA.gasEstimate }
      })
      
      mockUseEstimateGas.mockReturnValue({
        data: gasEstimate,
        isLoading: isEstimateLoading,
        error: ref(null),
        refetch
      })

      const { canExecuteTransaction, isEstimatingGas } = useContractWrites(config)
      expect(isEstimatingGas.value).toBe(false)

      const checkPromise = canExecuteTransaction(MOCK_DATA.functionName, MOCK_DATA.args)
      // Add small delay to ensure loading state is detected
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(isEstimatingGas.value).toBe(true)

      const result = await checkPromise
      expect(result).toBe(true)
      expect(isEstimatingGas.value).toBe(false)
    })

    it('should handle transaction simulation failures with proper error logging', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const error = new Error('Execution would fail: insufficient funds')
      const refetchMock = vi.fn().mockRejectedValue(error)

      mockUseEstimateGas.mockReturnValue({
        data: ref(undefined),
        isLoading: ref(false),
        error: ref(error),
        refetch: refetchMock
      })

      const { canExecuteTransaction } = useContractWrites(config)
      const result = await canExecuteTransaction(MOCK_DATA.functionName, MOCK_DATA.args)

      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Transaction testFunction will likely fail:',
        expect.any(Error)
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('should track loading state through transaction lifecycle', async () => {
      const writePending = ref(false)
      const confirmationLoading = ref(false)

      // Setup write contract mock with proper loading state handling
      mockUseWriteContract.mockReturnValue({
        writeContractAsync: vi.fn().mockImplementation(async () => {
          writePending.value = true
          await new Promise(resolve => setTimeout(resolve, 0))
          const result = '0xhash'
          writePending.value = false
          return result
        }),
        data: ref(undefined),
        isPending: writePending,
        error: ref(null)
      })

      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: ref(undefined),
        isLoading: confirmationLoading,
        isSuccess: ref(false),
        error: ref(null)
      })

      const { isLoading, executeWrite } = useContractWrites(config)
      expect(isLoading.value).toBe(false)

      // Start write
      const writePromise = executeWrite(MOCK_DATA.functionName, MOCK_DATA.args)
      // Add small delay to ensure loading state is detected
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(isLoading.value).toBe(true)

      // Simulate confirmation start
      confirmationLoading.value = true
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(isLoading.value).toBe(true)

      // Complete transaction
      confirmationLoading.value = false
      await writePromise
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(isLoading.value).toBe(false)
    })

    it('should track estimating gas state', () => {
      mockUseEstimateGas.mockReturnValue({
        data: ref(undefined),
        isLoading: ref(true),
        error: ref(null),
        refetch: vi.fn()
      })

      const { isEstimatingGas } = useContractWrites(config)
      expect(isEstimatingGas.value).toBe(true)
    })
  })

  describe('Return Interface', () => {
    it('should return all required properties and methods', () => {
      const contractWrites = useContractWrites(config)

      // Gas estimation
      expect(contractWrites.gasEstimate).toBeDefined()
      expect(contractWrites.isEstimatingGas).toBeDefined()
      expect(contractWrites.gasEstimateError).toBeDefined()
      expect(contractWrites.estimateGas).toBeDefined()
      expect(contractWrites.estimateGasForEncodedData).toBeDefined()
      expect(contractWrites.canExecuteTransaction).toBeDefined()

      // Transaction state
      expect(contractWrites.isLoading).toBeDefined()
      expect(contractWrites.isWritePending).toBeDefined()
      expect(contractWrites.isConfirming).toBeDefined()
      expect(contractWrites.isConfirmed).toBeDefined()
      expect(contractWrites.writeContractData).toBeDefined()
      expect(contractWrites.receipt).toBeDefined()
      expect(contractWrites.error).toBeDefined()
      
      // Core methods
      expect(contractWrites.executeWrite).toBeDefined()
      expect(contractWrites.invalidateQueries).toBeDefined()
      expect(contractWrites.currentFunctionName).toBeDefined()
    })
  })
})

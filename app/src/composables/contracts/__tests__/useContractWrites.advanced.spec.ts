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
  mockUseAccount
} = vi.hoisted(() => ({
  mockUseEstimateGas: vi.fn(),
  mockUseWriteContract: vi.fn(),
  mockUseWaitForTransactionReceipt: vi.fn(),
  mockUseAccount: vi.fn(() => ({
    chainId: ref(1)
  }))
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useWriteContract: mockUseWriteContract,
  useWaitForTransactionReceipt: mockUseWaitForTransactionReceipt,
  useAccount: mockUseAccount,
  useEstimateGas: mockUseEstimateGas
}))

vi.mock('@/stores', () => ({
  useToastStore: vi.fn(() => ({
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  }))
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

    mockUseEstimateGas.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

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
  })

  describe('Gas Estimation', () => {
    it('should estimate gas correctly', async () => {
      const refetchMock = vi.fn().mockResolvedValue({ data: MOCK_DATA.gasEstimate })
      mockUseEstimateGas.mockReturnValue({
        data: ref(MOCK_DATA.gasEstimate),
        isLoading: ref(false),
        error: ref(null),
        refetch: refetchMock
      })

      const { estimateGas } = useContractWrites(config)
      const result = await estimateGas(MOCK_DATA.functionName, MOCK_DATA.args, MOCK_DATA.value)

      expect(result).toBe(MOCK_DATA.gasEstimate)
      expect(refetchMock).toHaveBeenCalled()
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
    it('should verify transaction can be executed', async () => {
      const refetchMock = vi.fn().mockResolvedValue({ data: MOCK_DATA.gasEstimate })
      mockUseEstimateGas.mockReturnValue({
        data: ref(MOCK_DATA.gasEstimate),
        isLoading: ref(false),
        error: ref(null),
        refetch: refetchMock
      })

      const { canExecuteTransaction } = useContractWrites(config)
      const result = await canExecuteTransaction(MOCK_DATA.functionName, MOCK_DATA.args)

      expect(result).toBe(true)
    })

    it('should return false when transaction would fail', async () => {
      const refetchMock = vi.fn().mockRejectedValue(new Error('Execution would fail'))
      mockUseEstimateGas.mockReturnValue({
        data: ref(undefined),
        isLoading: ref(false),
        error: ref(new Error('Execution would fail')),
        refetch: refetchMock
      })

      const { canExecuteTransaction } = useContractWrites(config)
      const result = await canExecuteTransaction(MOCK_DATA.functionName, MOCK_DATA.args)

      expect(result).toBe(false)
    })
  })

  describe('Loading States', () => {
    it('should track loading state correctly', () => {
      mockUseWriteContract.mockReturnValue({
        writeContractAsync: vi.fn(),
        data: ref(undefined),
        isPending: ref(true),
        error: ref(null)
      })

      mockUseWaitForTransactionReceipt.mockReturnValue({
        data: ref(undefined),
        isLoading: ref(true),
        isSuccess: ref(false),
        error: ref(null)
      })

      const { isLoading } = useContractWrites(config)
      expect(isLoading.value).toBe(true)
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

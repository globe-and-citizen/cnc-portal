/* eslint-disable max-lines */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useSafeExecution } from '../useSafeExecution'
import type { SafeTransaction, SafeMultisigTransactionResponse } from '@/types/safe'

// Define proper types for mocks following CNC Portal standards
interface MockConnection {
  isConnected: Ref<boolean>
  address: Ref<string | null>
}

interface MockSafeSDK {
  executeTransaction: (tx: SafeMultisigTransactionResponse) => Promise<{
    hash: string
    transactionResponse?: { hash?: string; wait?: () => Promise<unknown> }
  }>
}

interface MockMutation {
  mutateAsync: (params: {
    chainId: number
    safeAddress: string
    safeTxHash: string
    txHash: string
  }) => Promise<void>
}

// Hoisted mock variables
const {
  mockUseConnection,
  mockUseChainId,
  mockUseSafeSDK,
  mockLoadSafe,
  mockSafeSdk,
  mockMutation,
  mockAddSuccessToast,
  mockAddErrorToast,
  mockTransformToSafeMultisigResponse
} = vi.hoisted(() => ({
  mockUseConnection: vi.fn<[], MockConnection>(),
  mockUseChainId: vi.fn(() => ref(137)),
  mockUseSafeSDK: vi.fn(),
  mockLoadSafe: vi.fn<[string], Promise<MockSafeSDK>>(),
  mockSafeSdk: {
    executeTransaction: vi.fn()
  } as MockSafeSDK,
  mockMutation: {
    mutateAsync: vi.fn()
  } as MockMutation,
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn(),
  mockTransformToSafeMultisigResponse: vi.fn()
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useConnection: mockUseConnection,
  useChainId: mockUseChainId
}))

vi.mock('@/queries/safe.queries', () => ({
  useExecuteTransactionMutation: () => mockMutation
}))

vi.mock('../useSafeSdk', () => ({
  useSafeSDK: mockUseSafeSDK
}))

vi.mock('@/stores', () => ({
  useToastStore: () => ({
    addSuccessToast: mockAddSuccessToast,
    addErrorToast: mockAddErrorToast
  })
}))

vi.mock('@/utils/safe', () => ({
  transformToSafeMultisigResponse: mockTransformToSafeMultisigResponse
}))

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    isAddress: vi.fn((address: string) => /^0x[a-fA-F0-9]{40}$/.test(address))
  }
})

// Test constants
const MOCK_DATA = {
  validSafeAddress: '0x1111111111111111111111111111111111111111',
  invalidSafeAddress: 'invalid-address',
  safeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  connectedAddress: '0x0000000000000000000000000000000000000001',
  txHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
  mockTransaction: {
    safe: '0x1111111111111111111111111111111111111111',
    to: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000',
    data: '0xabcdef',
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 1,
    executionDate: null,
    submissionDate: '2023-01-01T00:00:00Z',
    modified: '2023-01-01T00:00:00Z',
    blockNumber: null,
    transactionHash: null,
    safeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    executor: null,
    isExecuted: false,
    isSuccessful: null,
    confirmationsRequired: 2,
    confirmations: [],
    dataDecoded: undefined
  } as SafeTransaction,
  mockSdkTransaction: {
    safe: '0x1111111111111111111111111111111111111111',
    to: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000',
    data: '0xabcdef',
    operation: 0,
    safeTxGas: 0,
    baseGas: 0,
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 1,
    executionDate: null,
    submissionDate: '2023-01-01T00:00:00Z',
    modified: '2023-01-01T00:00:00Z',
    blockNumber: null,
    transactionHash: null,
    safeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    proposer: '',
    proposedByDelegate: false,
    executor: null,
    isExecuted: false,
    isSuccessful: null,
    ethGasPrice: null,
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    gasUsed: null,
    fee: null,
    origin: null,
    dataDecoded: null,
    confirmationsRequired: 2,
    confirmations: [],
    trusted: true,
    signatures: null
  } as SafeMultisigTransactionResponse
} as const

describe('useSafeExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    mockUseConnection.mockReturnValue({
      isConnected: ref(true),
      address: ref(MOCK_DATA.connectedAddress)
    })

    mockUseChainId.mockReturnValue(ref(137))
    mockUseSafeSDK.mockReturnValue({ loadSafe: mockLoadSafe })

    mockLoadSafe.mockResolvedValue(mockSafeSdk)
    mockSafeSdk.executeTransaction.mockResolvedValue({
      hash: MOCK_DATA.txHash
    })

    mockMutation.mutateAsync.mockResolvedValue(undefined)
    mockTransformToSafeMultisigResponse.mockReturnValue(MOCK_DATA.mockSdkTransaction)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Transaction Response Handling', () => {
    it('should extract hash from simple response', async () => {
      mockSafeSdk.executeTransaction.mockResolvedValue({
        hash: MOCK_DATA.txHash
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBe(MOCK_DATA.txHash)
    })

    it('should extract hash from nested transaction response', async () => {
      mockSafeSdk.executeTransaction.mockResolvedValue({
        hash: 'outer-hash',
        transactionResponse: { hash: MOCK_DATA.txHash }
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBe(MOCK_DATA.txHash)
    })

    it('should fallback to outer hash when nested hash is unavailable', async () => {
      mockSafeSdk.executeTransaction.mockResolvedValue({
        hash: MOCK_DATA.txHash,
        transactionResponse: {}
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBe(MOCK_DATA.txHash)
    })

    it('should handle response with no transaction response', async () => {
      mockSafeSdk.executeTransaction.mockResolvedValue({
        hash: MOCK_DATA.txHash
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBe(MOCK_DATA.txHash)
    })
  })

  describe('Return Value Structure', () => {
    it('should return correct properties', () => {
      const result = useSafeExecution()

      expect(result).toHaveProperty('executeTransaction')
      expect(result).toHaveProperty('isExecuting')
      expect(result).toHaveProperty('error')
      expect(typeof result.executeTransaction).toBe('function')
      expect(result.isExecuting.value).toBe(false)
      expect(result.error.value).toBe(null)
    })

    it('should maintain reactive references', () => {
      const { isExecuting, error } = useSafeExecution()

      expect(isExecuting.value).toBe(false)
      expect(error.value).toBe(null)

      // These should be reactive refs
      expect(typeof isExecuting.value).toBe('boolean')
      expect(error.value).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing address in connection', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(true),
        address: ref(null)
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })

    it('should handle consecutive execution attempts', async () => {
      const { executeTransaction } = useSafeExecution()

      // First execution
      const result1 = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )
      expect(result1).toBe(MOCK_DATA.txHash)

      // Second execution with different hash
      const differentHash = '0x9876543210987654321098765432109876543210987654321098765432109876'
      const result2 = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        differentHash,
        MOCK_DATA.mockTransaction
      )
      expect(result2).toBe(MOCK_DATA.txHash)

      expect(mockMutation.mutateAsync).toHaveBeenCalledTimes(2)
    })

    it('should reset error state on new execution attempt', async () => {
      // First execution fails
      mockLoadSafe.mockRejectedValueOnce(new Error('First error'))

      const { executeTransaction, error } = useSafeExecution()
      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(error.value?.message).toBe('First error')

      // Reset mock to succeed
      mockLoadSafe.mockResolvedValue(mockSafeSdk)
      mockSafeSdk.executeTransaction.mockResolvedValue({ hash: MOCK_DATA.txHash })

      // Second execution succeeds
      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(error.value).toBe(null)
    })

    it('should handle complex transaction data', async () => {
      const complexTransaction: SafeTransaction = {
        ...MOCK_DATA.mockTransaction,
        data: '0xa9059cbb000000000000000000000000recipient000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a7640000',
        operation: 1,
        safeTxGas: '21000',
        baseGas: '21000',
        gasPrice: '20000000000'
      }

      const complexSdkTransaction = {
        ...MOCK_DATA.mockSdkTransaction,
        ...complexTransaction
      }

      mockTransformToSafeMultisigResponse.mockReturnValue(complexSdkTransaction)

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        complexTransaction
      )

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockTransformToSafeMultisigResponse).toHaveBeenCalledWith(complexTransaction)
      expect(mockSafeSdk.executeTransaction).toHaveBeenCalledWith(complexSdkTransaction)
    })

    it('should handle empty transaction hash validation', async () => {
      const { executeTransaction } = useSafeExecution()

      const testCases: Array<string | null | undefined> = ['', null, undefined]

      for (const hash of testCases) {
        const result = await executeTransaction(
          MOCK_DATA.validSafeAddress,
          hash as unknown as string,
          MOCK_DATA.mockTransaction
        )

        expect(result).toBeNull()
      }

      expect(mockAddErrorToast).toHaveBeenCalledWith('Missing Safe transaction hash')
    })

    it('should handle malformed transaction data', async () => {
      const malformedTransaction: Partial<SafeTransaction> = {
        to: 'not-an-address',
        value: 'not-a-number',
        data: 'not-hex'
      }

      mockTransformToSafeMultisigResponse.mockImplementation(() => {
        throw new Error('Invalid transaction format')
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        malformedTransaction
      )

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid transaction format')
    })

    it('should handle transaction execution timeout', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Simulate timeout by rejecting after delay
      mockSafeSdk.executeTransaction.mockImplementation(() =>
        Promise.reject(new Error('Transaction timeout'))
      )

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Transaction timeout')

      consoleErrorSpy.mockRestore()
    })

    it('should handle network disconnection during execution', async () => {
      const networkError = new Error('Network Error')
      mockMutation.mutateAsync.mockRejectedValue(networkError)

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Network Error')
    })
  })

  describe('Query Invalidation', () => {
    it.skip('should trigger query invalidation after successful execution', async () => {
      const { executeTransaction } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(mockMutation.mutateAsync).toHaveBeenCalledWith({
        chainId: 137,
        safeAddress: MOCK_DATA.validSafeAddress,
        safeTxHash: MOCK_DATA.safeTxHash,
        txHash: MOCK_DATA.txHash
      })
    })

    it('should not trigger query invalidation when execution fails', async () => {
      mockSafeSdk.executeTransaction.mockRejectedValue(new Error('Execution failed'))

      const { executeTransaction } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(mockMutation.mutateAsync).not.toHaveBeenCalled()
    })

    it('should handle query invalidation errors gracefully', async () => {
      mockMutation.mutateAsync.mockRejectedValue(new Error('Invalidation failed'))

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalidation failed')
    })
  })

  describe('Chain Compatibility', () => {
    it.skip('should work with different chain configurations', async () => {
      const testChains = [1, 137, 42161, 10, 100] // Ethereum, Polygon, Arbitrum, Optimism, Gnosis

      const { executeTransaction } = useSafeExecution()

      for (const chainId of testChains) {
        mockUseChainId.mockReturnValue(ref(chainId))

        await executeTransaction(
          MOCK_DATA.validSafeAddress,
          MOCK_DATA.safeTxHash,
          MOCK_DATA.mockTransaction
        )

        expect(mockMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ chainId }))
      }
    })

    it.skip('should handle unsupported chains gracefully', async () => {
      const unsupportedChainId = 99999
      mockUseChainId.mockReturnValue(ref(unsupportedChainId))

      const { executeTransaction } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      // Should still attempt execution regardless of chain
      expect(mockMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: unsupportedChainId
        })
      )
    })
  })

  describe('Memory Management', () => {
    it('should not leak memory on rapid consecutive calls', async () => {
      const { executeTransaction } = useSafeExecution()

      // Simulate rapid calls
      const promises = Array.from({ length: 10 }, (_, i) =>
        executeTransaction(MOCK_DATA.validSafeAddress, `hash-${i}`, MOCK_DATA.mockTransaction)
      )

      await Promise.all(promises)

      expect(mockSafeSdk.executeTransaction).toHaveBeenCalledTimes(10)
      expect(mockMutation.mutateAsync).toHaveBeenCalledTimes(10)
    })

    it('should clean up properly after errors', async () => {
      mockSafeSdk.executeTransaction.mockRejectedValue(new Error('Test error'))

      const { executeTransaction, isExecuting, error } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      // State should be cleaned up
      expect(isExecuting.value).toBe(false)
      expect(error.value).toBeDefined()

      // Reset and try again
      mockSafeSdk.executeTransaction.mockResolvedValue({ hash: MOCK_DATA.txHash })

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(error.value).toBe(null)
    })
  })
})

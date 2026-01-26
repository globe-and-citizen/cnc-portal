import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useConnection, useChainId } from '@wagmi/vue'
import { useExecuteTransactionMutation, useSafeTransactionQuery } from '@/queries/safe.queries'
import { useToastStore } from '@/stores'
import { useSafeSDK } from '../useSafeSdk'
import { useSafeExecution } from '../useSafeExecution'

interface MockSafeSDK {
  executeTransaction: (tx: unknown) => Promise<{ hash: string }>
}

interface MockMutation {
  mutateAsync: (params: {
    chainId: number
    safeAddress: string
    safeTxHash: string
    txHash: string
  }) => Promise<void>
}

vi.mock('@wagmi/vue', () => ({
  useConnection: vi.fn(),
  useChainId: vi.fn()
}))

vi.mock('@/queries/safe.queries', () => ({
  useExecuteTransactionMutation: vi.fn(),
  useSafeTransactionQuery: vi.fn()
}))

vi.mock('../useSafeSdk', () => ({
  useSafeSDK: vi.fn()
}))

vi.mock('@/stores', () => ({
  useToastStore: vi.fn()
}))

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    isAddress: vi.fn((address: string) => /^0x[a-fA-F0-9]{40}$/.test(address))
  }
})

const mockUseConnection = vi.mocked(useConnection)
const mockUseChainId = vi.mocked(useChainId)
const mockUseSafeSDK = vi.mocked(useSafeSDK)
const mockUseExecuteTransactionMutation = vi.mocked(useExecuteTransactionMutation)
const mockUseSafeTransactionQuery = vi.mocked(useSafeTransactionQuery)
const mockUseToastStore = vi.mocked(useToastStore)

const mockLoadSafe = vi.fn<[string], Promise<MockSafeSDK>>()
const mockMutation: MockMutation = {
  mutateAsync: vi.fn<
    [
      {
        chainId: number
        safeAddress: string
        safeTxHash: string
        txHash: string
      }
    ],
    Promise<void>
  >()
}
const mockAddSuccessToast = vi.fn()
const mockAddErrorToast = vi.fn()

// Test constants
const MOCK_DATA = {
  validSafeAddress: '0x1111111111111111111111111111111111111111',
  invalidSafeAddress: 'invalid-address',
  safeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  connectedAddress: '0x0000000000000000000000000000000000000001',
  txHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
  mockTransaction: {
    to: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000',
    data: '0xabcdef'
  }
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

    mockUseSafeTransactionQuery.mockReturnValue({
      data: ref(MOCK_DATA.mockTransaction)
    })

    mockUseExecuteTransactionMutation.mockReturnValue(mockMutation)
    mockUseSafeSDK.mockReturnValue({ loadSafe: mockLoadSafe })
    mockUseToastStore.mockReturnValue({
      addSuccessToast: mockAddSuccessToast,
      addErrorToast: mockAddErrorToast
    })

    mockLoadSafe.mockResolvedValue({
      executeTransaction: vi.fn().mockResolvedValue({
        hash: MOCK_DATA.txHash
      })
    })

    mockMutation.mutateAsync.mockResolvedValue(undefined)
  })

  describe('Input Validation', () => {
    it('should reject invalid Safe address', async () => {
      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.invalidSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid Safe address')
    })

    it('should reject empty transaction hash', async () => {
      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.validSafeAddress, '')

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Missing Safe transaction hash')
    })

    it('should reject when wallet is not connected', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(false),
        address: ref(null)
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })

    it('should reject when transaction data is not available', async () => {
      mockUseSafeTransactionQuery.mockReturnValue({
        data: ref(null)
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Transaction data not found')
    })
  })

  describe('Successful Execution', () => {
    it('should execute transaction and return hash successfully', async () => {
      const mockExecuteTransaction = vi.fn().mockResolvedValue({
        hash: MOCK_DATA.txHash
      })

      mockLoadSafe.mockResolvedValue({
        executeTransaction: mockExecuteTransaction
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
      expect(mockExecuteTransaction).toHaveBeenCalledWith(MOCK_DATA.mockTransaction)
      expect(mockMutation.mutateAsync).toHaveBeenCalledWith({
        chainId: 137,
        safeAddress: MOCK_DATA.validSafeAddress,
        safeTxHash: MOCK_DATA.safeTxHash,
        txHash: MOCK_DATA.txHash
      })
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Transaction executed successfully')
    })

    it('should handle different chain IDs correctly', async () => {
      const arbitrumChainId = 42161
      mockUseChainId.mockReturnValue(ref(arbitrumChainId))

      const { executeTransaction } = useSafeExecution()

      await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(mockMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: arbitrumChainId
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle Safe SDK loading errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const sdkError = new Error('Safe SDK initialization failed')
      mockLoadSafe.mockRejectedValue(sdkError)

      const { executeTransaction, error } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Safe SDK initialization failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Safe SDK initialization failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Safe execution error:', sdkError)

      consoleErrorSpy.mockRestore()
    })

    it('should handle transaction execution errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const executionError = new Error('Transaction execution failed')

      mockLoadSafe.mockResolvedValue({
        executeTransaction: vi.fn().mockRejectedValue(executionError)
      })

      const { executeTransaction, error } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Transaction execution failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Transaction execution failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle mutation submission errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mutationError = new Error('Network request failed')
      mockMutation.mutateAsync.mockRejectedValue(mutationError)

      const { executeTransaction, error } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Network request failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Network request failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle unknown error types', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockLoadSafe.mockRejectedValue('Unknown error')

      const { executeTransaction, error } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Failed to execute transaction')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to execute transaction')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('should manage loading state correctly', async () => {
      let resolveExecution: (value: { hash: string }) => void
      const executionPromise = new Promise<{ hash: string }>((resolve) => {
        resolveExecution = resolve
      })

      mockLoadSafe.mockResolvedValue({
        executeTransaction: vi.fn().mockReturnValue(executionPromise)
      })

      const { executeTransaction, isExecuting } = useSafeExecution()

      // Start execution
      const executionAsyncPromise = executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash
      )

      // Check loading state
      expect(isExecuting.value).toBe(true)

      // Complete execution
      resolveExecution!({ hash: MOCK_DATA.txHash })
      await executionAsyncPromise

      // Check loading state cleared
      expect(isExecuting.value).toBe(false)
    })

    it('should clear loading state even when errors occur', async () => {
      mockLoadSafe.mockRejectedValue(new Error('Test error'))

      const { executeTransaction, isExecuting } = useSafeExecution()

      await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(isExecuting.value).toBe(false)
    })
  })

  describe('Integration with Safe SDK', () => {
    it('should use centralized Safe SDK', async () => {
      const { executeTransaction } = useSafeExecution()

      await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(mockUseSafeSDK).toHaveBeenCalled()
      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
    })

    it('should pass correct transaction data to SDK', async () => {
      const mockExecuteTransaction = vi.fn().mockResolvedValue({ hash: MOCK_DATA.txHash })
      mockLoadSafe.mockResolvedValue({ executeTransaction: mockExecuteTransaction })

      const { executeTransaction } = useSafeExecution()

      await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(mockExecuteTransaction).toHaveBeenCalledWith(MOCK_DATA.mockTransaction)
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
  })

  // describe('Edge Cases', () => {
  //   it('should handle missing address in connection', async () => {
  //     mockUseConnection.mockReturnValue({
  //       isConnected: ref(true),
  //       address: ref(null)
  //     })

  //     const { executeTransaction } = useSafeExecution()

  //     const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

  //     expect(result).toBeNull()
  //     expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
  //   })

  //   it('should handle consecutive execution attempts', async () => {
  //     const { executeTransaction } = useSafeExecution()

  //     // First execution
  //     const result1 = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)
  //     expect(result1).toBe(MOCK_DATA.txHash)

  //     // Second execution with different hash
  //     const differentHash = '0x9876543210987654321098765432109876543210987654321098765432109876'
  //     const result2 = await executeTransaction(MOCK_DATA.validSafeAddress, differentHash)
  //     expect(result2).toBe(MOCK_DATA.txHash)

  //     expect(mockMutation.mutateAsync).toHaveBeenCalledTimes(2)
  //   })

  //   it('should reset error state on new execution attempt', async () => {
  //     // First execution fails
  //     mockLoadSafe.mockRejectedValueOnce(new Error('First error'))

  //     const { executeTransaction, error } = useSafeExecution()
  //     await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

  //     expect(error.value?.message).toBe('First error')

  //     // Second execution succeeds
  //     mockLoadSafe.mockResolvedValue({
  //       executeTransaction: vi.fn().mockResolvedValue({ hash: MOCK_DATA.txHash })
  //     })

  //     await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

  //     expect(error.value).toBe(null)
  //   })

  //   it('should handle complex transaction data', async () => {
  //     const complexTransaction = {
  //       to: '0x1234567890123456789012345678901234567890',
  //       value: '0',
  //       data: '0xa9059cbb000000000000000000000000recipient000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a7640000',
  //       operation: 0,
  //       safeTxGas: 0,
  //       baseGas: 0,
  //       gasPrice: 0,
  //       gasToken: '0x0000000000000000000000000000000000000000',
  //       refundReceiver: '0x0000000000000000000000000000000000000000'
  //     }

  //     mockUseSafeTransactionQuery.mockReturnValue({
  //       data: ref(complexTransaction)
  //     })

  //     const mockExecuteTransaction = vi.fn().mockResolvedValue({ hash: MOCK_DATA.txHash })
  //     mockLoadSafe.mockResolvedValue({ executeTransaction: mockExecuteTransaction })

  //     const { executeTransaction } = useSafeExecution()

  //     const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

  //     expect(result).toBe(MOCK_DATA.txHash)
  //     expect(mockExecuteTransaction).toHaveBeenCalledWith(complexTransaction)
  //   })
  // })
})

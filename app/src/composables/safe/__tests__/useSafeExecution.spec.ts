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

    it('should reject when wallet address is missing', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(true),
        address: ref(null)
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })

    it('should reject when transaction data is not provided', async () => {
      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith(
        'Transaction data is required. Please pass the transaction data from the component.'
      )
    })

    it('should validate Safe address format correctly', async () => {
      const invalidAddresses = [
        'invalid-address',
        '0x123', // Too short
        '1234567890123456789012345678901234567890', // Missing 0x prefix
        '0xGHIJKL1234567890123456789012345678901234' // Invalid hex characters
      ]

      const { executeTransaction } = useSafeExecution()

      for (const invalidAddress of invalidAddresses) {
        const result = await executeTransaction(invalidAddress, MOCK_DATA.safeTxHash)
        expect(result).toBeNull()
      }

      expect(mockAddErrorToast).toHaveBeenCalledTimes(invalidAddresses.length)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid Safe address')
    })
  })

  describe('Successful Execution', () => {
    it.skip('should execute transaction and return hash successfully', async () => {
      const { executeTransaction } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
      expect(mockTransformToSafeMultisigResponse).toHaveBeenCalledWith(MOCK_DATA.mockTransaction)
      expect(mockSafeSdk.executeTransaction).toHaveBeenCalledWith(MOCK_DATA.mockSdkTransaction)
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

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(mockMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: arbitrumChainId
        })
      )
    })

    it.skip('should handle transaction response with nested hash', async () => {
      mockSafeSdk.executeTransaction.mockResolvedValue({
        hash: 'outer-hash',
        transactionResponse: { hash: MOCK_DATA.txHash }
      })

      const { executeTransaction } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          txHash: MOCK_DATA.txHash
        })
      )
    })

    it('should wait for transaction confirmation when available', async () => {
      const mockWaitFn = vi.fn().mockResolvedValue(undefined)
      mockSafeSdk.executeTransaction.mockResolvedValue({
        hash: MOCK_DATA.txHash,
        transactionResponse: {
          hash: MOCK_DATA.txHash,
          wait: mockWaitFn
        }
      })

      const { executeTransaction } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(mockWaitFn).toHaveBeenCalled()
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Transaction executed successfully')
    })

    it('should handle transaction confirmation errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockWaitFn = vi.fn().mockRejectedValue(new Error('Confirmation failed'))

      mockSafeSdk.executeTransaction.mockResolvedValue({
        hash: MOCK_DATA.txHash,
        transactionResponse: {
          hash: MOCK_DATA.txHash,
          wait: mockWaitFn
        }
      })

      const { executeTransaction } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Safe execution error:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle Safe SDK loading errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const sdkError = new Error('Safe SDK initialization failed')
      mockLoadSafe.mockRejectedValue(sdkError)

      const { executeTransaction, error } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Safe SDK initialization failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Safe SDK initialization failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Safe execution error:', sdkError)

      consoleErrorSpy.mockRestore()
    })

    it('should handle transaction execution errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const executionError = new Error('Transaction execution failed')

      mockSafeSdk.executeTransaction.mockRejectedValue(executionError)

      const { executeTransaction, error } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

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

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Network request failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Network request failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle unknown error types', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockLoadSafe.mockRejectedValue('Unknown error')

      const { executeTransaction, error } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Failed to execute transaction')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to execute transaction')

      consoleErrorSpy.mockRestore()
    })

    it('should handle user rejection errors', async () => {
      const userRejectionError = new Error('User rejected the request')
      mockSafeSdk.executeTransaction.mockRejectedValue(userRejectionError)

      const { executeTransaction } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(mockAddErrorToast).toHaveBeenCalledWith('Transaction  rejected')
    })

    it('should handle transformation errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockTransformToSafeMultisigResponse.mockImplementation(() => {
        throw new Error('Transformation failed')
      })

      const { executeTransaction, error } = useSafeExecution()

      const result = await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Transformation failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Safe execution error:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('should manage loading state correctly', async () => {
      let resolveExecution: (value: { hash: string }) => void
      const executionPromise = new Promise<{ hash: string }>((resolve) => {
        resolveExecution = resolve
      })

      mockSafeSdk.executeTransaction.mockReturnValue(executionPromise)

      const { executeTransaction, isExecuting } = useSafeExecution()

      // Start execution
      const executionAsyncPromise = executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
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

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(isExecuting.value).toBe(false)
    })

    it('should reset loading state for consecutive operations', async () => {
      const { executeTransaction, isExecuting } = useSafeExecution()

      // First execution
      const promise1 = executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )
      expect(isExecuting.value).toBe(true)
      await promise1
      expect(isExecuting.value).toBe(false)

      // Second execution
      const promise2 = executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )
      expect(isExecuting.value).toBe(true)
      await promise2
      expect(isExecuting.value).toBe(false)
    })

    it.skip('should handle overlapping execution attempts', async () => {
      let resolveFirst: (value: { hash: string }) => void
      let resolveSecond: (value: { hash: string }) => void

      const firstPromise = new Promise<{ hash: string }>((resolve) => {
        resolveFirst = resolve
      })

      const secondPromise = new Promise<{ hash: string }>((resolve) => {
        resolveSecond = resolve
      })

      mockSafeSdk.executeTransaction
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise)

      const { executeTransaction, isExecuting } = useSafeExecution()

      // Start first execution
      const execution1 = executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      // Start second execution while first is running
      const execution2 = executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(isExecuting.value).toBe(true)

      // Complete first execution
      resolveFirst!({ hash: MOCK_DATA.txHash })
      await execution1

      expect(isExecuting.value).toBe(true) // Still executing second

      // Complete second execution
      resolveSecond!({ hash: MOCK_DATA.txHash })
      await execution2

      expect(isExecuting.value).toBe(false)
    })
  })

  describe('Integration with Safe SDK', () => {
    it('should use centralized Safe SDK', async () => {
      const { executeTransaction } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(mockUseSafeSDK).toHaveBeenCalled()
      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
    })

    it('should pass transformed transaction data to SDK', async () => {
      const { executeTransaction } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(mockTransformToSafeMultisigResponse).toHaveBeenCalledWith(MOCK_DATA.mockTransaction)
      expect(mockSafeSdk.executeTransaction).toHaveBeenCalledWith(MOCK_DATA.mockSdkTransaction)
    })

    it('should handle SDK instance reuse', async () => {
      const { executeTransaction } = useSafeExecution()

      // Execute multiple transactions with same address
      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        'different-hash',
        MOCK_DATA.mockTransaction
      )

      expect(mockLoadSafe).toHaveBeenCalledTimes(2)
      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
    })

    it('should handle different Safe addresses', async () => {
      const differentSafeAddress = '0x2222222222222222222222222222222222222222'
      const { executeTransaction } = useSafeExecution()

      await executeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      await executeTransaction(
        differentSafeAddress,
        MOCK_DATA.safeTxHash,
        MOCK_DATA.mockTransaction
      )

      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
      expect(mockLoadSafe).toHaveBeenCalledWith(differentSafeAddress)
    })
  })
})

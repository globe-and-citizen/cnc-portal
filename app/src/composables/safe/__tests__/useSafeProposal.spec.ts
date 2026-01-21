import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useSafeProposal } from '../useSafeProposal'

// Define proper types for mocks following CNC Portal standards
interface MockConnection {
  isConnected: Ref<boolean>
  address: Ref<string | null>
}

interface SafeTransactionPayload {
  to: string
  value: string
  data: string
  operation: number
}

interface SafeTransactionResponse {
  data: SafeTransactionPayload
}

interface MockSafeSDK {
  createTransaction: (params: {
    transactions: SafeTransactionPayload[]
  }) => Promise<SafeTransactionResponse>
  getTransactionHash: (transaction: SafeTransactionResponse) => Promise<string>
  signHash: (hash: string) => Promise<{ data: string }>
}

interface MockMutation {
  mutateAsync: (params: {
    chainId: number
    safeAddress: string
    transactionData: SafeTransactionPayload
    signature: { data: string; signer: string }
  }) => Promise<void>
}

interface TransactionData {
  to: string
  value: string
  data: string
  operation?: number
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
  mockAddErrorToast
} = vi.hoisted(() => ({
  mockUseConnection: vi.fn<[], MockConnection>(),
  mockUseChainId: vi.fn(() => ref(137)),
  mockUseSafeSDK: vi.fn(),
  mockLoadSafe: vi.fn<[string], Promise<MockSafeSDK>>(),
  mockSafeSdk: {
    createTransaction: vi.fn<
      [{ transactions: SafeTransactionPayload[] }],
      Promise<SafeTransactionResponse>
    >(),
    getTransactionHash: vi.fn<[SafeTransactionResponse], Promise<string>>(),
    signHash: vi.fn<[string], Promise<{ data: string }>>()
  } as MockSafeSDK,
  mockMutation: {
    mutateAsync: vi.fn<
      [
        {
          chainId: number
          safeAddress: string
          transactionData: SafeTransactionPayload
          signature: { data: string; signer: string }
        }
      ],
      Promise<void>
    >()
  } as MockMutation,
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn()
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useConnection: mockUseConnection,
  useChainId: mockUseChainId
}))

vi.mock('@/queries/safe.queries', () => ({
  useProposeTransactionMutation: () => mockMutation
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
  connectedAddress: '0x0000000000000000000000000000000000000001',
  safeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  signature: '0xsig123456',
  safeTransaction: {
    data: {
      to: '0x1234567890123456789012345678901234567890',
      value: '1000000000000000000',
      data: '0xabcdef',
      operation: 0
    } as SafeTransactionPayload
  } as SafeTransactionResponse,
  transactionData: {
    to: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000',
    data: '0xabcdef'
  } as TransactionData
} as const

describe('useSafeProposal', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    mockUseConnection.mockReturnValue({
      isConnected: ref(true),
      address: ref(MOCK_DATA.connectedAddress)
    })

    mockUseChainId.mockReturnValue(ref(137))

    mockUseSafeSDK.mockReturnValue({
      loadSafe: mockLoadSafe
    })

    mockLoadSafe.mockResolvedValue(mockSafeSdk)

    // Setup default Safe SDK responses
    mockSafeSdk.createTransaction.mockResolvedValue(MOCK_DATA.safeTransaction)
    mockSafeSdk.getTransactionHash.mockResolvedValue(MOCK_DATA.safeTxHash)
    mockSafeSdk.signHash.mockResolvedValue({ data: MOCK_DATA.signature })

    mockMutation.mutateAsync.mockResolvedValue(undefined)
  })

  describe('Input Validation', () => {
    it('should reject invalid Safe address', async () => {
      const { proposeTransaction } = useSafeProposal()

      const result = await proposeTransaction(
        MOCK_DATA.invalidSafeAddress,
        MOCK_DATA.transactionData
      )

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid Safe address')
    })

    it('should reject when wallet is not connected', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(false),
        address: ref(null)
      })

      const { proposeTransaction } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })

    it('should reject when wallet address is missing', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(true),
        address: ref(null)
      })

      const { proposeTransaction } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })
  })

  describe('Successful Proposal', () => {
    it('should propose transaction successfully with default operation', async () => {
      const { proposeTransaction } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(result).toBe(MOCK_DATA.safeTxHash)
      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
      expect(mockSafeSdk.createTransaction).toHaveBeenCalledWith({
        transactions: [
          {
            to: MOCK_DATA.transactionData.to,
            value: MOCK_DATA.transactionData.value,
            data: MOCK_DATA.transactionData.data,
            operation: 0 // Default operation
          }
        ]
      })
      expect(mockSafeSdk.getTransactionHash).toHaveBeenCalledWith(MOCK_DATA.safeTransaction)
      expect(mockSafeSdk.signHash).toHaveBeenCalledWith(MOCK_DATA.safeTxHash)
      expect(mockMutation.mutateAsync).toHaveBeenCalledWith({
        chainId: 137,
        safeAddress: MOCK_DATA.validSafeAddress,
        transactionData: MOCK_DATA.safeTransaction.data,
        signature: {
          data: MOCK_DATA.signature,
          signer: MOCK_DATA.connectedAddress
        }
      })
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Transaction proposed successfully')
    })

    it('should propose transaction successfully with custom operation', async () => {
      const transactionWithOperation = {
        ...MOCK_DATA.transactionData,
        operation: 1 // Delegate call
      }

      const { proposeTransaction } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, transactionWithOperation)

      expect(result).toBe(MOCK_DATA.safeTxHash)
      expect(mockSafeSdk.createTransaction).toHaveBeenCalledWith({
        transactions: [
          {
            to: transactionWithOperation.to,
            value: transactionWithOperation.value,
            data: transactionWithOperation.data,
            operation: 1
          }
        ]
      })
    })

    it('should handle different chain IDs correctly', async () => {
      const arbitrumChainId = 42161
      mockUseChainId.mockReturnValue(ref(arbitrumChainId))

      const { proposeTransaction } = useSafeProposal()

      await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(mockMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: arbitrumChainId
        })
      )
    })

    it('should handle zero-value transactions', async () => {
      const zeroValueTransaction = {
        ...MOCK_DATA.transactionData,
        value: '0'
      }

      const { proposeTransaction } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, zeroValueTransaction)

      expect(result).toBe(MOCK_DATA.safeTxHash)
      expect(mockSafeSdk.createTransaction).toHaveBeenCalledWith({
        transactions: [
          {
            to: zeroValueTransaction.to,
            value: '0',
            data: zeroValueTransaction.data,
            operation: 0
          }
        ]
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle Safe SDK loading errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const sdkError = new Error('Safe SDK initialization failed')
      mockLoadSafe.mockRejectedValue(sdkError)

      const { proposeTransaction, error } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Safe SDK initialization failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Safe SDK initialization failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Safe proposal error:', sdkError)

      consoleErrorSpy.mockRestore()
    })

    it('should handle transaction creation errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const txError = new Error('Transaction creation failed')
      mockSafeSdk.createTransaction.mockRejectedValue(txError)

      const { proposeTransaction, error } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Transaction creation failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Transaction creation failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle transaction hash generation errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const hashError = new Error('Hash generation failed')
      mockSafeSdk.getTransactionHash.mockRejectedValue(hashError)

      const { proposeTransaction, error } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Hash generation failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Hash generation failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle signature creation errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const signatureError = new Error('User rejected signature')
      mockSafeSdk.signHash.mockRejectedValue(signatureError)

      const { proposeTransaction, error } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('User rejected signature')
      expect(mockAddErrorToast).toHaveBeenCalledWith('User rejected signature')

      consoleErrorSpy.mockRestore()
    })

    it('should handle mutation submission errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mutationError = new Error('Network request failed')
      mockMutation.mutateAsync.mockRejectedValue(mutationError)

      const { proposeTransaction, error } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Network request failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Network request failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle unknown error types', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockLoadSafe.mockRejectedValue('Unknown error')

      const { proposeTransaction, error } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Failed to propose transaction')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to propose transaction')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('should manage loading state during proposal', async () => {
      let resolveTransaction: (value: SafeTransactionResponse) => void
      const transactionPromise = new Promise<SafeTransactionResponse>((resolve) => {
        resolveTransaction = resolve
      })

      mockSafeSdk.createTransaction.mockReturnValue(transactionPromise)

      const { proposeTransaction, isProposing } = useSafeProposal()

      // Start proposal
      const proposalPromise = proposeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.transactionData
      )

      // Check loading state
      expect(isProposing.value).toBe(true)

      // Complete proposal
      resolveTransaction!(MOCK_DATA.safeTransaction)
      await proposalPromise

      // Check loading state cleared
      expect(isProposing.value).toBe(false)
    })

    it('should clear loading state even when errors occur', async () => {
      mockLoadSafe.mockRejectedValue(new Error('Test error'))

      const { proposeTransaction, isProposing } = useSafeProposal()

      await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(isProposing.value).toBe(false)
    })

    it('should handle loading state during different async operations', async () => {
      let resolveSignature: (value: { data: string }) => void
      const signaturePromise = new Promise<{ data: string }>((resolve) => {
        resolveSignature = resolve
      })

      mockSafeSdk.signHash.mockReturnValue(signaturePromise)

      const { proposeTransaction, isProposing } = useSafeProposal()

      // Start proposal
      const proposalPromise = proposeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.transactionData
      )

      // Should be loading during signature
      expect(isProposing.value).toBe(true)

      // Complete signature
      resolveSignature!({ data: MOCK_DATA.signature })
      await proposalPromise

      // Should complete successfully
      expect(isProposing.value).toBe(false)
    })
  })

  describe('Integration with Safe SDK', () => {
    it('should use centralized Safe SDK', async () => {
      const { proposeTransaction } = useSafeProposal()

      await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(mockUseSafeSDK).toHaveBeenCalled()
      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
    })

    it('should pass correct transaction structure to SDK', async () => {
      const { proposeTransaction } = useSafeProposal()

      await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(mockSafeSdk.createTransaction).toHaveBeenCalledWith({
        transactions: [
          expect.objectContaining({
            to: MOCK_DATA.transactionData.to,
            value: MOCK_DATA.transactionData.value,
            data: MOCK_DATA.transactionData.data,
            operation: 0
          })
        ]
      })
    })

    it('should follow proper transaction workflow', async () => {
      const { proposeTransaction } = useSafeProposal()

      await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      // Verify the correct order of operations
      expect(mockSafeSdk.createTransaction).toHaveBeenCalledBefore(
        mockSafeSdk.getTransactionHash as vi.MockedFunction<typeof mockSafeSdk.getTransactionHash>
      )
      expect(mockSafeSdk.getTransactionHash).toHaveBeenCalledBefore(
        mockSafeSdk.signHash as vi.MockedFunction<typeof mockSafeSdk.signHash>
      )
      expect(mockSafeSdk.signHash).toHaveBeenCalledBefore(
        mockMutation.mutateAsync as vi.MockedFunction<typeof mockMutation.mutateAsync>
      )
    })
  })

  describe('Return Value Structure', () => {
    it('should return correct properties', () => {
      const result = useSafeProposal()

      expect(result).toHaveProperty('proposeTransaction')
      expect(result).toHaveProperty('isProposing')
      expect(result).toHaveProperty('error')
      expect(typeof result.proposeTransaction).toBe('function')
      expect(result.isProposing.value).toBe(false)
      expect(result.error.value).toBe(null)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty transaction data gracefully', async () => {
      const emptyTransaction = {
        to: '',
        value: '',
        data: ''
      }

      const { proposeTransaction } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, emptyTransaction)

      expect(result).toBe(MOCK_DATA.safeTxHash)
      expect(mockSafeSdk.createTransaction).toHaveBeenCalledWith({
        transactions: [
          {
            to: '',
            value: '',
            data: '',
            operation: 0
          }
        ]
      })
    })

    it('should handle consecutive proposal attempts', async () => {
      const { proposeTransaction } = useSafeProposal()

      // First proposal
      const result1 = await proposeTransaction(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.transactionData
      )
      expect(result1).toBe(MOCK_DATA.safeTxHash)

      // Second proposal with different data
      const differentTransaction = {
        to: '0x9876543210987654321098765432109876543210',
        value: '500000000000000000',
        data: '0x123456'
      }
      const result2 = await proposeTransaction(MOCK_DATA.validSafeAddress, differentTransaction)
      expect(result2).toBe(MOCK_DATA.safeTxHash)

      expect(mockMutation.mutateAsync).toHaveBeenCalledTimes(2)
    })

    it('should reset error state on new proposal attempt', async () => {
      // First proposal fails
      mockLoadSafe.mockRejectedValueOnce(new Error('First error'))

      const { proposeTransaction, error } = useSafeProposal()
      await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(error.value?.message).toBe('First error')

      // Second proposal succeeds
      mockLoadSafe.mockResolvedValue(mockSafeSdk)

      await proposeTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.transactionData)

      expect(error.value).toBe(null)
    })

    it('should handle complex transaction data', async () => {
      const complexTransaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: '0',
        data: '0xa9059cbb000000000000000000000000recipient000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a7640000',
        operation: 1
      }

      const { proposeTransaction } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, complexTransaction)

      expect(result).toBe(MOCK_DATA.safeTxHash)
      expect(mockSafeSdk.createTransaction).toHaveBeenCalledWith({
        transactions: [
          {
            to: complexTransaction.to,
            value: complexTransaction.value,
            data: complexTransaction.data,
            operation: 1
          }
        ]
      })
    })

    it('should handle large value transactions', async () => {
      const largeValueTransaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000000', // 1000 ETH
        data: '0x'
      }

      const { proposeTransaction } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, largeValueTransaction)

      expect(result).toBe(MOCK_DATA.safeTxHash)
      expect(mockSafeSdk.createTransaction).toHaveBeenCalledWith({
        transactions: [
          {
            to: largeValueTransaction.to,
            value: largeValueTransaction.value,
            data: largeValueTransaction.data,
            operation: 0
          }
        ]
      })
    })
  })

  describe('Transaction Data Validation', () => {
    it('should handle transactions with minimal data', async () => {
      const minimalTransaction = {
        to: MOCK_DATA.validSafeAddress,
        value: '0',
        data: '0x'
      }

      const { proposeTransaction } = useSafeProposal()

      const result = await proposeTransaction(MOCK_DATA.validSafeAddress, minimalTransaction)

      expect(result).toBe(MOCK_DATA.safeTxHash)
    })

    it('should preserve transaction operation type', async () => {
      const delegateCallTransaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: '0',
        data: '0xabcdef',
        operation: 1 // DelegateCall
      }

      const { proposeTransaction } = useSafeProposal()

      await proposeTransaction(MOCK_DATA.validSafeAddress, delegateCallTransaction)

      expect(mockSafeSdk.createTransaction).toHaveBeenCalledWith({
        transactions: [
          expect.objectContaining({
            operation: 1
          })
        ]
      })
    })
  })
})

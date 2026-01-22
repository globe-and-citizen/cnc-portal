import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useSafeApproval } from '../useSafeApproval'

// Define proper types for mocks
interface MockConnection {
  isConnected: Ref<boolean>
  address: Ref<string | null>
}

interface MockSafeSDK {
  signHash: (hash: string) => Promise<{ data: string }>
}

interface MockMutation {
  mutateAsync: (params: {
    chainId: number
    safeAddress: string
    safeTxHash: string
    signature: { data: string; signer: string }
  }) => Promise<void>
}

// Hoisted mock variables
const {
  mockUseConnection,
  mockUseChainId,
  mockUseSafeSDK,
  mockLoadSafe,
  mockMutation,
  mockAddSuccessToast,
  mockAddErrorToast
} = vi.hoisted(() => ({
  mockUseConnection: vi.fn<[], MockConnection>(),
  mockUseChainId: vi.fn(() => ref(137)),
  mockUseSafeSDK: vi.fn(),
  mockLoadSafe: vi.fn<[string], Promise<MockSafeSDK>>(),
  mockMutation: {
    mutateAsync: vi.fn<
      [
        {
          chainId: number
          safeAddress: string
          safeTxHash: string
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
  useApproveTransactionMutation: () => mockMutation
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
  safeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  connectedAddress: '0x0000000000000000000000000000000000000001',
  signature: '0xsig'
} as const

describe('useSafeApproval', () => {
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

    mockLoadSafe.mockResolvedValue({
      signHash: vi.fn().mockResolvedValue({
        data: MOCK_DATA.signature
      })
    })

    mockMutation.mutateAsync.mockResolvedValue(undefined)
  })

  describe('Input Validation', () => {
    it('should reject invalid Safe address', async () => {
      const { approveTransaction } = useSafeApproval()

      const result = await approveTransaction(MOCK_DATA.invalidSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid Safe address')
    })

    it('should reject empty transaction hash', async () => {
      const { approveTransaction } = useSafeApproval()

      const result = await approveTransaction(MOCK_DATA.validSafeAddress, '')

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Missing transaction hash')
    })

    it('should reject when wallet is not connected', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(false),
        address: ref(null)
      })

      const { approveTransaction } = useSafeApproval()

      const result = await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })
  })

  describe('Successful Approval', () => {
    it('should sign and submit approval successfully', async () => {
      const mockSignHash = vi.fn().mockResolvedValue({
        data: MOCK_DATA.signature
      })

      mockLoadSafe.mockResolvedValue({
        signHash: mockSignHash
      })

      const { approveTransaction } = useSafeApproval()

      const result = await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBe(MOCK_DATA.signature)
      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
      expect(mockSignHash).toHaveBeenCalledWith(MOCK_DATA.safeTxHash)
      expect(mockMutation.mutateAsync).toHaveBeenCalledWith({
        chainId: 137,
        safeAddress: MOCK_DATA.validSafeAddress,
        safeTxHash: MOCK_DATA.safeTxHash,
        signature: {
          data: MOCK_DATA.signature,
          signer: MOCK_DATA.connectedAddress
        }
      })
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Transaction approved successfully')
    })

    it('should handle different chain IDs correctly', async () => {
      const arbitrumChainId = 42161
      mockUseChainId.mockReturnValue(ref(arbitrumChainId))

      const { approveTransaction } = useSafeApproval()

      await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

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

      const { approveTransaction, error } = useSafeApproval()

      const result = await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Safe SDK initialization failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Safe SDK initialization failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Safe approval error:', sdkError)

      consoleErrorSpy.mockRestore()
    })

    it('should handle signature creation errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const signatureError = new Error('User rejected signature')

      mockLoadSafe.mockResolvedValue({
        signHash: vi.fn().mockRejectedValue(signatureError)
      })

      const { approveTransaction, error } = useSafeApproval()

      const result = await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('User rejected signature')
      expect(mockAddErrorToast).toHaveBeenCalledWith('User rejected signature')

      consoleErrorSpy.mockRestore()
    })

    it('should handle mutation submission errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mutationError = new Error('Network request failed')
      mockMutation.mutateAsync.mockRejectedValue(mutationError)

      const { approveTransaction, error } = useSafeApproval()

      const result = await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Network request failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Network request failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle unknown error types', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockLoadSafe.mockRejectedValue('Unknown error')

      const { approveTransaction, error } = useSafeApproval()

      const result = await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Failed to approve transaction')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to approve transaction')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('should manage loading state correctly', async () => {
      let resolveSign: (value: { data: string }) => void
      const signPromise = new Promise<{ data: string }>((resolve) => {
        resolveSign = resolve
      })

      mockLoadSafe.mockResolvedValue({
        signHash: vi.fn().mockReturnValue(signPromise)
      })

      const { approveTransaction, isApproving } = useSafeApproval()

      // Start approval
      const approvalPromise = approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      // Check loading state
      expect(isApproving.value).toBe(true)

      // Complete approval
      resolveSign!({ data: MOCK_DATA.signature })
      await approvalPromise

      // Check loading state cleared
      expect(isApproving.value).toBe(false)
    })

    it('should clear loading state even when errors occur', async () => {
      mockLoadSafe.mockRejectedValue(new Error('Test error'))

      const { approveTransaction, isApproving } = useSafeApproval()

      await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(isApproving.value).toBe(false)
    })
  })

  describe('Integration with Safe SDK', () => {
    it('should use centralized Safe SDK', async () => {
      const { approveTransaction } = useSafeApproval()

      await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(mockUseSafeSDK).toHaveBeenCalled()
      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
    })

    it('should pass correct parameters to SDK', async () => {
      const mockSignHash = vi.fn().mockResolvedValue({ data: MOCK_DATA.signature })
      mockLoadSafe.mockResolvedValue({ signHash: mockSignHash })

      const { approveTransaction } = useSafeApproval()

      await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(mockSignHash).toHaveBeenCalledWith(MOCK_DATA.safeTxHash)
    })
  })

  describe('Return Value Structure', () => {
    it('should return correct properties', () => {
      const result = useSafeApproval()

      expect(result).toHaveProperty('approveTransaction')
      expect(result).toHaveProperty('isApproving')
      expect(result).toHaveProperty('error')
      expect(typeof result.approveTransaction).toBe('function')
      expect(result.isApproving.value).toBe(false)
      expect(result.error.value).toBe(null)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing address in connection', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(true),
        address: ref(null)
      })

      const { approveTransaction } = useSafeApproval()

      const result = await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })

    it('should handle consecutive approval attempts', async () => {
      const { approveTransaction } = useSafeApproval()

      // First approval
      const result1 = await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)
      expect(result1).toBe(MOCK_DATA.signature)

      // Second approval with different hash
      const differentHash = '0x9876543210987654321098765432109876543210987654321098765432109876'
      const result2 = await approveTransaction(MOCK_DATA.validSafeAddress, differentHash)
      expect(result2).toBe(MOCK_DATA.signature)

      expect(mockMutation.mutateAsync).toHaveBeenCalledTimes(2)
    })

    it('should reset error state on new approval attempt', async () => {
      // First approval fails
      mockLoadSafe.mockRejectedValueOnce(new Error('First error'))

      const { approveTransaction, error } = useSafeApproval()
      await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(error.value?.message).toBe('First error')

      // Second approval succeeds
      mockLoadSafe.mockResolvedValue({
        signHash: vi.fn().mockResolvedValue({ data: MOCK_DATA.signature })
      })

      await approveTransaction(MOCK_DATA.validSafeAddress, MOCK_DATA.safeTxHash)

      expect(error.value).toBe(null)
    })
  })
})

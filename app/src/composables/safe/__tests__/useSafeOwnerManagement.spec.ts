import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useSafeOwnerManagement } from '../useSafeOwnerManagement'

// Define proper types for mocks following CNC Portal standards
interface MockConnection {
  isConnected: Ref<boolean>
  address: Ref<string | null>
}

interface MockSafeSDK {
  createAddOwnerTx: (newOwner: string, threshold?: number) => Promise<{ data: SafeTransaction }>
  createRemoveOwnerTx: (oldOwner: string, threshold?: number) => Promise<{ data: SafeTransaction }>
  createChangeThresholdTx: (threshold: number) => Promise<{ data: SafeTransaction }>
  createTransaction: (params: SafeTransaction) => Promise<{ data: SafeTransaction }>
  getTransactionHash: (transaction: SafeTransaction) => Promise<string>
  signHash: (hash: string) => Promise<{ data: string }>
  executeTransaction: (transaction: SafeTransaction) => Promise<{ hash: string }>
}

interface SafeTransaction {
  to: string
  value: string
  data: string
  operation: number
}

interface MockMutation {
  mutateAsync: (params: Record<string, unknown>) => Promise<void>
}

// Hoisted mock variables
const {
  mockUseConnection,
  mockUseChainId,
  mockUseSafeSDK,
  mockLoadSafe,
  mockSafeSdk,
  mockUpdateMutation,
  mockProposeMutation,
  mockAddSuccessToast,
  mockAddErrorToast,
  mockGetInjectedProvider
} = vi.hoisted(() => ({
  mockUseConnection: vi.fn<[], MockConnection>(),
  mockUseChainId: vi.fn(() => ref(137)),
  mockUseSafeSDK: vi.fn(),
  mockLoadSafe: vi.fn<[string], Promise<MockSafeSDK>>(),
  mockSafeSdk: {
    createAddOwnerTx: vi.fn(),
    createRemoveOwnerTx: vi.fn(),
    createChangeThresholdTx: vi.fn(),
    createTransaction: vi.fn(),
    getTransactionHash: vi.fn(),
    signHash: vi.fn(),
    executeTransaction: vi.fn()
  } as MockSafeSDK,
  mockUpdateMutation: {
    mutateAsync: vi.fn<[Record<string, unknown>], Promise<void>>()
  } as MockMutation,
  mockProposeMutation: {
    mutateAsync: vi.fn<[Record<string, unknown>], Promise<void>>()
  } as MockMutation,
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn(),
  mockGetInjectedProvider: vi.fn(() => ({}))
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useConnection: mockUseConnection,
  useChainId: mockUseChainId
}))

vi.mock('@/queries/safe.queries', () => ({
  useUpdateSafeOwnersMutation: () => mockUpdateMutation,
  useProposeTransactionMutation: () => mockProposeMutation
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

vi.mock('@/types/safe', () => ({
  TX_SERVICE_BY_CHAIN: {
    137: { url: 'https://tx.service' },
    1: { url: 'https://mainnet.tx.service' },
    42161: { url: 'https://arbitrum.tx.service' }
  }
}))

vi.mock('@/utils/safe', () => ({
  getInjectedProvider: mockGetInjectedProvider
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
  newOwner: '0x2222222222222222222222222222222222222222',
  existingOwner: '0x3333333333333333333333333333333333333333',
  txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  signature: '0xsig123456',
  executionHash: '0xexecuted789',
  safeTransaction: {
    to: '0x1234567890123456789012345678901234567890',
    value: '0',
    data: '0xabcdef',
    operation: 0
  } as SafeTransaction
} as const

describe('useSafeOwnerManagement', () => {
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
    mockSafeSdk.createAddOwnerTx.mockResolvedValue({ data: MOCK_DATA.safeTransaction })
    mockSafeSdk.createRemoveOwnerTx.mockResolvedValue({ data: MOCK_DATA.safeTransaction })
    mockSafeSdk.createChangeThresholdTx.mockResolvedValue({ data: MOCK_DATA.safeTransaction })
    mockSafeSdk.createTransaction.mockResolvedValue({ data: MOCK_DATA.safeTransaction })
    mockSafeSdk.getTransactionHash.mockResolvedValue(MOCK_DATA.txHash)
    mockSafeSdk.signHash.mockResolvedValue({ data: MOCK_DATA.signature })
    mockSafeSdk.executeTransaction.mockResolvedValue({ hash: MOCK_DATA.executionHash })

    mockUpdateMutation.mutateAsync.mockResolvedValue(undefined)
    mockProposeMutation.mutateAsync.mockResolvedValue(undefined)
  })

  describe('Input Validation', () => {
    it('should reject invalid Safe address', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.invalidSafeAddress, {})

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid Safe address')
    })

    it('should reject when wallet is not connected', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(false),
        address: ref(null)
      })

      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {})

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })

    it('should reject when no operations are specified', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {})

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('No owner management operations specified')
    })

    it('should validate owner addresses', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: ['invalid-address']
      })

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid owner address: invalid-address')
    })
  })

  describe.skip('Owner Addition', () => {
    it('should add new owner successfully when proposing', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createAddOwnerTx).toHaveBeenCalledWith(MOCK_DATA.newOwner, undefined)
      expect(mockProposeMutation.mutateAsync).toHaveBeenCalled()
      expect(mockAddSuccessToast).toHaveBeenCalledWith(
        'Owner management transaction proposed successfully'
      )
    })

    it('should add new owner with threshold successfully', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        newThreshold: 2,
        shouldPropose: true
      })

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createAddOwnerTx).toHaveBeenCalledWith(MOCK_DATA.newOwner, 2)
    })

    it('should execute owner addition directly when not proposing', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: false
      })

      expect(result).toBe(MOCK_DATA.executionHash)
      expect(mockSafeSdk.executeTransaction).toHaveBeenCalledWith(MOCK_DATA.safeTransaction)
      expect(mockAddSuccessToast).toHaveBeenCalledWith(
        'Owner management transaction executed successfully'
      )
    })
  })

  describe.skip('Owner Removal', () => {
    it('should remove owner successfully when proposing', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToRemove: [MOCK_DATA.existingOwner],
        shouldPropose: true
      })

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createRemoveOwnerTx).toHaveBeenCalledWith(
        MOCK_DATA.existingOwner,
        undefined
      )
      expect(mockProposeMutation.mutateAsync).toHaveBeenCalled()
    })

    it('should remove owner with threshold change', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToRemove: [MOCK_DATA.existingOwner],
        newThreshold: 1,
        shouldPropose: true
      })

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createRemoveOwnerTx).toHaveBeenCalledWith(MOCK_DATA.existingOwner, 1)
    })
  })

  describe('Threshold Changes', () => {
    it('should change threshold only', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        newThreshold: 3,
        shouldPropose: true
      })

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createChangeThresholdTx).toHaveBeenCalledWith(3)
      expect(mockProposeMutation.mutateAsync).toHaveBeenCalled()
    })
  })

  describe('Multiple Operations', () => {
    it('should handle adding and removing owners simultaneously', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        ownersToRemove: [MOCK_DATA.existingOwner],
        shouldPropose: true
      })

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createAddOwnerTx).toHaveBeenCalled()
      expect(mockSafeSdk.createRemoveOwnerTx).toHaveBeenCalled()
    })

    it('should add multiple owners', async () => {
      const newOwners = [MOCK_DATA.newOwner, '0x4444444444444444444444444444444444444444']
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: newOwners,
        shouldPropose: true
      })

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createAddOwnerTx).toHaveBeenCalledTimes(2)
    })

    it('should remove multiple owners', async () => {
      const ownersToRemove = [MOCK_DATA.existingOwner, '0x5555555555555555555555555555555555555555']
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToRemove,
        shouldPropose: true
      })

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createRemoveOwnerTx).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle Safe SDK loading errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const sdkError = new Error('Safe SDK initialization failed')
      mockLoadSafe.mockRejectedValue(sdkError)

      const { updateOwners, error } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Safe SDK initialization failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Safe SDK initialization failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Owner management error:', sdkError)

      consoleErrorSpy.mockRestore()
    })

    it('should handle transaction creation errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const txError = new Error('Transaction creation failed')
      mockSafeSdk.createAddOwnerTx.mockRejectedValue(txError)

      const { updateOwners, error } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Transaction creation failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Transaction creation failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle proposal submission errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const proposalError = new Error('Network request failed')
      mockProposeMutation.mutateAsync.mockRejectedValue(proposalError)

      const { updateOwners, error } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Network request failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Network request failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle execution errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const executionError = new Error('Execution failed')
      mockSafeSdk.executeTransaction.mockRejectedValue(executionError)

      const { updateOwners, error } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: false
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Execution failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Execution failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle unknown error types', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockLoadSafe.mockRejectedValue('Unknown error')

      const { updateOwners, error } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Failed to update Safe owners')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to update Safe owners')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('should manage loading state during proposal', async () => {
      let resolveProposal: () => void
      const proposalPromise = new Promise<void>((resolve) => {
        resolveProposal = resolve
      })

      mockProposeMutation.mutateAsync.mockReturnValue(proposalPromise)

      const { updateOwners, isUpdating } = useSafeOwnerManagement()

      // Start operation
      const updatePromise = updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      // Check loading state
      expect(isUpdating.value).toBe(true)

      // Complete operation
      resolveProposal!()
      await updatePromise

      // Check loading state cleared
      expect(isUpdating.value).toBe(false)
    })

    it('should clear loading state even when errors occur', async () => {
      mockLoadSafe.mockRejectedValue(new Error('Test error'))

      const { updateOwners, isUpdating } = useSafeOwnerManagement()

      await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(isUpdating.value).toBe(false)
    })
  })

  describe.skip('Integration with Safe SDK', () => {
    it('should use centralized Safe SDK', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(mockUseSafeSDK).toHaveBeenCalled()
      expect(mockLoadSafe).toHaveBeenCalledWith(MOCK_DATA.validSafeAddress)
    })

    it('should pass correct parameters to mutation', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(mockProposeMutation.mutateAsync).toHaveBeenCalledWith({
        chainId: 137,
        safeAddress: MOCK_DATA.validSafeAddress,
        safeTxHash: MOCK_DATA.txHash,
        safeTx: MOCK_DATA.safeTransaction,
        signature: MOCK_DATA.signature
      })

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        chainId: 137,
        safeAddress: MOCK_DATA.validSafeAddress,
        safeTxHash: MOCK_DATA.txHash,
        signature: MOCK_DATA.signature
      })
    })
  })

  describe('Return Value Structure', () => {
    it('should return correct properties', () => {
      const result = useSafeOwnerManagement()

      expect(result).toHaveProperty('updateOwners')
      expect(result).toHaveProperty('isUpdating')
      expect(result).toHaveProperty('error')
      expect(typeof result.updateOwners).toBe('function')
      expect(result.isUpdating.value).toBe(false)
      expect(result.error.value).toBe(null)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing address in connection', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(true),
        address: ref(null)
      })

      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })

    it('should handle consecutive operations', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      // First operation
      const result1 = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })
      expect(result1).toBe(MOCK_DATA.txHash)

      // Second operation
      const result2 = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToRemove: [MOCK_DATA.existingOwner],
        shouldPropose: true
      })
      expect(result2).toBe(MOCK_DATA.txHash)

      expect(mockProposeMutation.mutateAsync).toHaveBeenCalledTimes(2)
    })

    it('should reset error state on new operation attempt', async () => {
      // First operation fails
      mockLoadSafe.mockRejectedValueOnce(new Error('First error'))

      const { updateOwners, error } = useSafeOwnerManagement()
      await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(error.value?.message).toBe('First error')

      // Second operation succeeds
      mockLoadSafe.mockResolvedValue(mockSafeSdk)

      await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(error.value).toBe(null)
    })

    it('should handle different chain IDs correctly', async () => {
      mockUseChainId.mockReturnValue(ref(42161)) // Arbitrum

      const { updateOwners } = useSafeOwnerManagement()

      await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(mockProposeMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: 42161
        })
      )
    })
  })

  describe('Complex Ownership Scenarios', () => {
    it('should handle complex multi-step ownership changes', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner, '0x4444444444444444444444444444444444444444'],
        ownersToRemove: [MOCK_DATA.existingOwner],
        newThreshold: 2,
        shouldPropose: true
      })

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createAddOwnerTx).toHaveBeenCalledTimes(2)
      expect(mockSafeSdk.createRemoveOwnerTx).toHaveBeenCalledTimes(1)
    })

    it.skip('should validate threshold against final owner count', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      // This would result in negative threshold validation if implemented
      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        newThreshold: 0,
        shouldPropose: true
      })

      // Assuming the implementation validates threshold > 0
      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createAddOwnerTx).toHaveBeenCalledWith(MOCK_DATA.newOwner, 0)
    })
  })
})

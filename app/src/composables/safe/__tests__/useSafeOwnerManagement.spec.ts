import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useSafeOwnerManagement } from '../useSafeOwnerManagement'

// Define proper types for mocks following CNC Portal standards
interface MockConnection {
  isConnected: Ref<boolean>
  address: Ref<string | null>
}

interface MockSafeSDK {
  getThreshold: () => Promise<number>
  createAddOwnerTx: (params: {
    ownerAddress: string
    threshold?: number
  }) => Promise<SafeTransaction>
  createRemoveOwnerTx: (params: {
    ownerAddress: string
    threshold?: number
  }) => Promise<SafeTransaction>
  createChangeThresholdTx: (threshold: number) => Promise<SafeTransaction>
  createTransaction: (params: { transactions: SafeTransactionData[] }) => Promise<SafeTransaction>
  getTransactionHash: (transaction: SafeTransaction) => Promise<string>
  signHash: (hash: string) => Promise<{ data: string }>
  executeTransaction: (
    transaction: SafeTransaction
  ) => Promise<{ hash: string; transactionResponse?: { hash?: string } }>
}

interface SafeTransactionData {
  to: string
  value: string
  data: string
  operation: number
}

interface SafeTransaction {
  to?: string
  value?: string
  data: SafeTransactionData
  operation?: number
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
    getThreshold: vi.fn<[], Promise<number>>(),
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
  currentThreshold: 2,
  safeTransactionData: {
    to: '0x1234567890123456789012345678901234567890',
    value: '0',
    data: '0xabcdef',
    operation: 0
  } as SafeTransactionData,
  safeTransaction: {
    data: {
      to: '0x1234567890123456789012345678901234567890',
      value: '0',
      data: '0xabcdef',
      operation: 0
    }
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
    mockSafeSdk.getThreshold.mockResolvedValue(MOCK_DATA.currentThreshold)
    mockSafeSdk.createAddOwnerTx.mockResolvedValue(MOCK_DATA.safeTransaction)
    mockSafeSdk.createRemoveOwnerTx.mockResolvedValue(MOCK_DATA.safeTransaction)
    mockSafeSdk.createChangeThresholdTx.mockResolvedValue(MOCK_DATA.safeTransaction)
    mockSafeSdk.createTransaction.mockResolvedValue(MOCK_DATA.safeTransaction)
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
      expect(mockAddSuccessToast).toHaveBeenCalledWith(
        'Owner management transaction proposed successfully'
      )
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

  // describe('Error Handling', () => {
  //   it('should handle Safe SDK loading errors', async () => {
  //     const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  //     const sdkError = new Error('Safe SDK initialization failed')
  //     mockLoadSafe.mockRejectedValue(sdkError)

  //     const { updateOwners, error } = useSafeOwnerManagement()

  //     const result = await updateOwners(MOCK_DATA.validSafeAddress, {
  //       ownersToAdd: [MOCK_DATA.newOwner],
  //       shouldPropose: true
  //     })

  //     expect(result).toBeNull()
  //     expect(error.value?.message).toBe('Safe SDK initialization failed')
  //     expect(mockAddErrorToast).toHaveBeenCalledWith('Safe SDK initialization failed')
  //     expect(consoleErrorSpy).toHaveBeenCalledWith('Owner management error:', sdkError)

  //     consoleErrorSpy.mockRestore()
  //   })

  //   it('should handle transaction creation errors', async () => {
  //     const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  //     const txError = new Error('Transaction creation failed')

  //     // Mock getThreshold to succeed but createAddOwnerTx to fail
  //     mockSafeSdk.createAddOwnerTx.mockRejectedValue(txError)

  //     const { updateOwners, error } = useSafeOwnerManagement()

  //     const result = await updateOwners(MOCK_DATA.validSafeAddress, {
  //       ownersToAdd: [MOCK_DATA.newOwner],
  //       shouldPropose: true
  //     })

  //     expect(result).toBeNull()
  //     expect(error.value?.message).toBe('Transaction creation failed')
  //     expect(mockAddErrorToast).toHaveBeenCalledWith('Transaction creation failed')

  //     consoleErrorSpy.mockRestore()
  //   })

  //   it('should handle proposal submission errors', async () => {
  //     const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  //     const proposalError = new Error('Network request failed')
  //     mockProposeMutation.mutateAsync.mockRejectedValue(proposalError)

  //     const { updateOwners, error } = useSafeOwnerManagement()

  //     const result = await updateOwners(MOCK_DATA.validSafeAddress, {
  //       ownersToAdd: [MOCK_DATA.newOwner],
  //       shouldPropose: true
  //     })

  //     expect(result).toBeNull()
  //     expect(error.value?.message).toBe('Network request failed')
  //     expect(mockAddErrorToast).toHaveBeenCalledWith('Network request failed')

  //     consoleErrorSpy.mockRestore()
  //   })

  //   it('should handle execution errors', async () => {
  //     const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  //     const executionError = new Error('Execution failed')
  //     mockSafeSdk.executeTransaction.mockRejectedValue(executionError)

  //     const { updateOwners, error } = useSafeOwnerManagement()

  //     const result = await updateOwners(MOCK_DATA.validSafeAddress, {
  //       ownersToAdd: [MOCK_DATA.newOwner],
  //       shouldPropose: false
  //     })

  //     expect(result).toBeNull()
  //     expect(error.value?.message).toBe('Execution failed')
  //     expect(mockAddErrorToast).toHaveBeenCalledWith('Execution failed')

  //     consoleErrorSpy.mockRestore()
  //   })

  //   it('should handle unknown error types', async () => {
  //     const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  //     mockLoadSafe.mockRejectedValue('Unknown error')

  //     const { updateOwners, error } = useSafeOwnerManagement()

  //     const result = await updateOwners(MOCK_DATA.validSafeAddress, {
  //       ownersToAdd: [MOCK_DATA.newOwner],
  //       shouldPropose: true
  //     })

  //     expect(result).toBeNull()
  //     expect(error.value?.message).toBe('Failed to update Safe owners')
  //     expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to update Safe owners')

  //     consoleErrorSpy.mockRestore()
  //   })
  // })
})

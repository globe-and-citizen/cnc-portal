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
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useSafeTransfer } from '../useSafeTransfer'

// Define proper types for mocks following CNC Portal standards
interface MockConnection {
  isConnected: Ref<boolean>
  address: Ref<string | null>
}

interface MockSafeSDK {
  getThreshold: () => Promise<number>
  createTransaction: (params: { transactions: unknown[] }) => Promise<{ data: unknown }>
  getTransactionHash: (transaction: unknown) => Promise<string>
  executeTransaction: (
    transaction: unknown
  ) => Promise<{ hash: string; transactionResponse?: { hash?: string } }>
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
  mockExecuteMutation,
  mockProposeTransaction,
  mockGetTokenAddress,
  mockAddSuccessToast,
  mockAddErrorToast
} = vi.hoisted(() => ({
  mockUseConnection: vi.fn<[], MockConnection>(),
  mockUseChainId: vi.fn(() => ref(137)),
  mockUseSafeSDK: vi.fn(),
  mockLoadSafe: vi.fn<[string], Promise<MockSafeSDK>>(),
  mockSafeSdk: {
    getThreshold: vi.fn(),
    createTransaction: vi.fn(),
    getTransactionHash: vi.fn(),
    executeTransaction: vi.fn()
  } as MockSafeSDK,
  mockExecuteMutation: {
    mutateAsync: vi.fn()
  } as MockMutation,
  mockProposeTransaction: vi.fn(),
  mockGetTokenAddress: vi.fn(),
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn()
}))

// Mock external dependencies
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useConnection: mockUseConnection,
    useChainId: mockUseChainId
  }
})

vi.mock('@/queries/safe.queries', () => ({
  useExecuteTransactionMutation: () => mockExecuteMutation
}))

vi.mock('../useSafeSdk', () => ({
  useSafeSDK: mockUseSafeSDK
}))

vi.mock('../useSafeProposal', () => ({
  useSafeProposal: () => ({
    proposeTransaction: mockProposeTransaction
  })
}))

vi.mock('@/utils', () => ({
  getTokenAddress: mockGetTokenAddress
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
    isAddress: vi.fn((address: string) => /^0x[a-fA-F0-9]{40}$/.test(address)),
    parseEther: vi.fn((amount: string) => BigInt(parseFloat(amount) * 10 ** 18)),
    parseUnits: vi.fn((amount: string, decimals: number) => {
      const scale = BigInt(10) ** BigInt(decimals)
      const integer = BigInt(Math.round(parseFloat(amount) * Number(scale)))
      return integer
    }),
    encodeFunctionData: vi.fn(() => '0xmockedTransferData'),
    erc20Abi: []
  }
})

// Test constants
const MOCK_DATA = {
  validSafeAddress: '0x1111111111111111111111111111111111111111',
  validRecipient: '0x2222222222222222222222222222222222222222',
  validTokenAddress: '0x3333333333333333333333333333333333333333',
  invalidAddress: 'invalid-address',
  connectedAddress: '0x0000000000000000000000000000000000000001',
  amount: '1.5',
  safeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  txHash: '0x9876543210987654321098765432109876543210987654321098765432109876'
} as const

describe('useSafeTransfer (state & errors)', () => {
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
    mockSafeSdk.getThreshold.mockResolvedValue(2)
    mockSafeSdk.createTransaction.mockResolvedValue({ data: {} })
    mockSafeSdk.getTransactionHash.mockResolvedValue(MOCK_DATA.safeTxHash)
    mockSafeSdk.executeTransaction.mockResolvedValue({ hash: MOCK_DATA.txHash })

    mockProposeTransaction.mockResolvedValue(MOCK_DATA.safeTxHash)
    mockExecuteMutation.mutateAsync.mockResolvedValue(undefined)

    // Default token address resolution
    mockGetTokenAddress.mockImplementation((tokenId: string) =>
      tokenId === 'native' ? undefined : MOCK_DATA.validTokenAddress
    )
  })

  describe('Error Handling', () => {
    it('should handle Safe SDK loading errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const sdkError = new Error('Safe SDK initialization failed')
      mockLoadSafe.mockRejectedValue(sdkError)

      const { transferFromSafe, error } = useSafeTransfer()

      const result = await transferFromSafe(MOCK_DATA.validSafeAddress, {
        to: MOCK_DATA.validRecipient,
        amount: MOCK_DATA.amount
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Safe SDK initialization failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Safe SDK initialization failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Safe transfer error:', sdkError)

      consoleErrorSpy.mockRestore()
    })

    it('should handle unknown error types', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockLoadSafe.mockRejectedValue('Unknown error')

      const { transferFromSafe, error } = useSafeTransfer()

      const result = await transferFromSafe(MOCK_DATA.validSafeAddress, {
        to: MOCK_DATA.validRecipient,
        amount: MOCK_DATA.amount
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Failed to transfer from Safe')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to transfer from Safe')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('should manage loading state during transfer', async () => {
      let resolveProposal: () => void
      const proposalPromise = new Promise<string>((resolve) => {
        resolveProposal = resolve
      })

      mockProposeTransaction.mockReturnValue(proposalPromise)

      const { transferFromSafe, isTransferring } = useSafeTransfer()

      // Start operation
      const transferPromise = transferFromSafe(MOCK_DATA.validSafeAddress, {
        to: MOCK_DATA.validRecipient,
        amount: MOCK_DATA.amount
      })

      // Check loading state
      expect(isTransferring.value).toBe(true)

      // Complete operation
      resolveProposal!()
      await transferPromise

      // Check loading state cleared
      expect(isTransferring.value).toBe(false)
    })

    it('should clear loading state even when errors occur', async () => {
      mockLoadSafe.mockRejectedValue(new Error('Test error'))

      const { transferFromSafe, isTransferring } = useSafeTransfer()

      await transferFromSafe(MOCK_DATA.validSafeAddress, {
        to: MOCK_DATA.validRecipient,
        amount: MOCK_DATA.amount
      })

      expect(isTransferring.value).toBe(false)
    })
  })

  describe('Return Value Structure', () => {
    it('should return correct properties', () => {
      const result = useSafeTransfer()

      expect(result).toHaveProperty('transferFromSafe')
      expect(result).toHaveProperty('isTransferring')
      expect(result).toHaveProperty('error')
      expect(typeof result.transferFromSafe).toBe('function')
      expect(result.isTransferring.value).toBe(false)
      expect(result.error.value).toBe(null)
    })
  })
})

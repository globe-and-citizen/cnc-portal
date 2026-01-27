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
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn()
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useConnection: mockUseConnection,
  useChainId: mockUseChainId
}))

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

describe('useSafeTransfer', () => {
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
  })

  describe('Input Validation', () => {
    it('should reject invalid Safe address', async () => {
      const { transferFromSafe } = useSafeTransfer()

      const result = await transferFromSafe(MOCK_DATA.invalidAddress, {
        to: MOCK_DATA.validRecipient,
        amount: MOCK_DATA.amount
      })

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid Safe address')
    })

    it('should reject invalid recipient address', async () => {
      const { transferFromSafe } = useSafeTransfer()

      const result = await transferFromSafe(MOCK_DATA.validSafeAddress, {
        to: MOCK_DATA.invalidAddress,
        amount: MOCK_DATA.amount
      })

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid recipient address')
    })

    it('should reject invalid amount', async () => {
      const { transferFromSafe } = useSafeTransfer()

      const result = await transferFromSafe(MOCK_DATA.validSafeAddress, {
        to: MOCK_DATA.validRecipient,
        amount: '0'
      })

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid transfer amount')
    })

    it('should reject when wallet is not connected', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(false),
        address: ref(null)
      })

      const { transferFromSafe } = useSafeTransfer()

      const result = await transferFromSafe(MOCK_DATA.validSafeAddress, {
        to: MOCK_DATA.validRecipient,
        amount: MOCK_DATA.amount
      })

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })
  })

  describe('Transfer with Threshold >= 2 (Proposal)', () => {
    beforeEach(() => {
      mockSafeSdk.getThreshold.mockResolvedValue(2)
    })

    it('should propose native transfer successfully', async () => {
      const { transferNative } = useSafeTransfer()

      const result = await transferNative(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.validRecipient,
        MOCK_DATA.amount
      )

      expect(result).toBe(MOCK_DATA.safeTxHash)
      expect(mockProposeTransaction).toHaveBeenCalledWith(
        MOCK_DATA.validSafeAddress,
        expect.objectContaining({
          to: MOCK_DATA.validRecipient,
          value: expect.any(String),
          data: '0x',
          operation: 0
        })
      )
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Transfer proposed successfully (Native)')
    })

    it('should propose token transfer successfully', async () => {
      const { transferToken } = useSafeTransfer()

      const result = await transferToken(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.validRecipient,
        MOCK_DATA.amount,
        MOCK_DATA.validTokenAddress
      )

      expect(result).toBe(MOCK_DATA.safeTxHash)
      expect(mockProposeTransaction).toHaveBeenCalledWith(
        MOCK_DATA.validSafeAddress,
        expect.objectContaining({
          to: MOCK_DATA.validTokenAddress,
          value: '0',
          data: '0xmockedTransferData',
          operation: 0
        })
      )
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Transfer proposed successfully (Token)')
    })
  })

  describe('Transfer with Threshold = 1 (Direct Execution)', () => {
    beforeEach(() => {
      mockSafeSdk.getThreshold.mockResolvedValue(1)
    })

    it('should execute native transfer directly', async () => {
      const { transferNative } = useSafeTransfer()

      const result = await transferNative(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.validRecipient,
        MOCK_DATA.amount
      )

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.executeTransaction).toHaveBeenCalled()
      expect(mockExecuteMutation.mutateAsync).toHaveBeenCalled()
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Transfer executed successfully (Native)')
    })

    it('should execute token transfer directly', async () => {
      const { transferToken } = useSafeTransfer()

      const result = await transferToken(
        MOCK_DATA.validSafeAddress,
        MOCK_DATA.validRecipient,
        MOCK_DATA.amount,
        MOCK_DATA.validTokenAddress
      )

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.executeTransaction).toHaveBeenCalled()
      expect(mockExecuteMutation.mutateAsync).toHaveBeenCalled()
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Transfer executed successfully (Token)')
    })
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
      expect(result).toHaveProperty('transferNative')
      expect(result).toHaveProperty('transferToken')
      expect(result).toHaveProperty('isTransferring')
      expect(result).toHaveProperty('error')
      expect(typeof result.transferFromSafe).toBe('function')
      expect(typeof result.transferNative).toBe('function')
      expect(typeof result.transferToken).toBe('function')
      expect(result.isTransferring.value).toBe(false)
      expect(result.error.value).toBe(null)
    })
  })
})

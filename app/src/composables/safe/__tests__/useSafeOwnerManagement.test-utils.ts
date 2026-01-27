import { ref, type Ref } from 'vue'
import { vi } from 'vitest'

export interface MockConnection {
  isConnected: Ref<boolean>
  address: Ref<string | null>
}

export interface SafeTransactionData {
  to: string
  value: string
  data: string
  operation: number
}

export interface SafeTransaction {
  to?: string
  value?: string
  data: SafeTransactionData
  operation?: number
}

export interface MockSafeSDK {
  getThreshold: () => Promise<number>
  getNonce: () => Promise<number>
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

export interface MockMutation {
  mutateAsync: (params: Record<string, unknown>) => Promise<void>
}

export const mocks = {
  mockUseConnection: vi.fn<[], MockConnection>(),
  mockUseChainId: vi.fn(() => ref(137)),
  mockUseSafeSDK: vi.fn(),
  mockUseSafeProposal: vi.fn(),
  mockLoadSafe: vi.fn<[string], Promise<MockSafeSDK>>(),
  mockSafeSdk: {
    getThreshold: vi.fn<[], Promise<number>>(),
    getNonce: vi.fn<[], Promise<number>>(),
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
}

const {
  mockUseConnection,
  mockUseChainId,
  mockUseSafeSDK,
  mockUseSafeProposal,
  mockLoadSafe,
  mockSafeSdk,
  mockUpdateMutation,
  mockProposeMutation,
  mockAddSuccessToast,
  mockAddErrorToast,
  mockGetInjectedProvider
} = mocks

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

vi.mock('../useSafeProposal', () => ({
  useSafeProposal: mockUseSafeProposal
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

export const MOCK_DATA = {
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

export const setupDefaultMocks = () => {
  mockUseConnection.mockReturnValue({
    isConnected: ref(true),
    address: ref(MOCK_DATA.connectedAddress)
  })

  mockUseChainId.mockReturnValue(ref(137))

  mockUseSafeSDK.mockReturnValue({
    loadSafe: mockLoadSafe
  })

  mockUseSafeProposal.mockReturnValue({
    proposeTransaction: vi.fn().mockImplementation(async () => {
      await mockProposeMutation.mutateAsync({ chainId: mockUseChainId().value })
      return MOCK_DATA.txHash
    })
  })

  mockLoadSafe.mockResolvedValue(mockSafeSdk)

  mockSafeSdk.getThreshold.mockResolvedValue(MOCK_DATA.currentThreshold)
  mockSafeSdk.createAddOwnerTx.mockResolvedValue(MOCK_DATA.safeTransaction)
  mockSafeSdk.createRemoveOwnerTx.mockResolvedValue(MOCK_DATA.safeTransaction)
  mockSafeSdk.createChangeThresholdTx.mockResolvedValue(MOCK_DATA.safeTransaction)
  mockSafeSdk.createTransaction.mockResolvedValue(MOCK_DATA.safeTransaction)
  mockSafeSdk.getTransactionHash.mockResolvedValue(MOCK_DATA.txHash)
  mockSafeSdk.signHash.mockResolvedValue({ data: MOCK_DATA.signature })
  mockSafeSdk.getNonce.mockResolvedValue(0)
  mockSafeSdk.executeTransaction.mockResolvedValue({ hash: MOCK_DATA.executionHash })

  mockUpdateMutation.mutateAsync.mockResolvedValue(undefined)
  mockProposeMutation.mutateAsync.mockResolvedValue(undefined)
}

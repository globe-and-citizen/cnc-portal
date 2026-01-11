import { ref } from 'vue'
import type { Address } from 'viem'
import { vi } from 'vitest'

// Shared mock data
export const MOCK_DATA = {
  safeAddress: '0x9876543210987654321098765432109876543210' as Address,
  owners: [
    '0x1234567890123456789012345678901234567890' as Address,
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address
  ],
  threshold: 2,
  txHash: '0xabc123def456',
  safeTxHash: '0x123456789abcdef',
  deploymentTx: {
    to: '0x1111111111111111111111111111111111111111',
    data: '0xdeadbeef',
    value: '0'
  },
  balance: BigInt('1000000000000000000'), // 1 ETH
  signature: { data: '0xsignaturedata' }
} as const

// Core mocks shared across test files
export const mockConnection = {
  address: ref(MOCK_DATA.owners[0]),
  isConnected: ref(true)
}
export const mockChainId = ref(137) // Polygon
export const mockSafeInit = vi.fn()
export const mockCreatePublicClient = vi.fn()
export const mockGetInjectedProvider = vi.fn()
export const mockIsAddress = vi.fn()
export const mockFormatEther = vi.fn()

export const mockSafeSdk = {
  createSafeDeploymentTransaction: vi.fn(),
  getSafeProvider: vi.fn(() => ({
    getExternalSigner: vi.fn(),
    getExternalProvider: vi.fn()
  })),
  getAddress: vi.fn(),
  signHash: vi.fn(),
  executeTransaction: vi.fn()
}

export const mockWalletClient = {
  account: MOCK_DATA.owners[0],
  sendTransaction: vi.fn()
}

export const mockPublicClient = {
  getBalance: vi.fn(),
  waitForTransactionReceipt: vi.fn()
}

// Hoisted mocks for external modules
vi.mock('@wagmi/vue', () => ({
  useConnection: vi.fn(() => mockConnection),
  useChainId: vi.fn(() => mockChainId)
}))

vi.mock('@safe-global/protocol-kit', () => {
  return {
    default: {
      init: mockSafeInit
    }
  }
})

vi.mock('viem', () => {
  return {
    createPublicClient: mockCreatePublicClient,
    custom: vi.fn(),
    formatEther: mockFormatEther,
    isAddress: mockIsAddress
  }
})

/**
 * Prepare a fresh test context for Safe writes tests.
 */
export async function setupWritesTest() {
  vi.clearAllMocks()
  vi.resetModules()

  mockConnection.address.value = MOCK_DATA.owners[0]
  mockConnection.isConnected.value = true
  mockChainId.value = 137

  mockIsAddress.mockImplementation((address: string) => {
    return typeof address === 'string' && address.startsWith('0x') && address.length === 42
  })
  mockFormatEther.mockReturnValue('1.0')

  mockSafeInit.mockResolvedValue(mockSafeSdk)

  mockCreatePublicClient.mockReturnValue(mockPublicClient)
  mockPublicClient.getBalance.mockResolvedValue(MOCK_DATA.balance)
  mockPublicClient.waitForTransactionReceipt.mockResolvedValue({})

  mockSafeSdk.getSafeProvider.mockReturnValue({
    getExternalSigner: vi.fn().mockResolvedValue(mockWalletClient),
    getExternalProvider: vi.fn().mockReturnValue(mockPublicClient)
  })
  mockSafeSdk.createSafeDeploymentTransaction.mockResolvedValue(MOCK_DATA.deploymentTx)
  mockSafeSdk.getAddress.mockResolvedValue(MOCK_DATA.safeAddress)

  mockWalletClient.sendTransaction.mockResolvedValue(MOCK_DATA.txHash)

  const fetchMock = vi.fn()
  global.fetch = fetchMock as unknown as typeof fetch

  const mockProvider = { request: vi.fn() }
  Object.defineProperty(globalThis.window, 'ethereum', {
    value: mockProvider,
    writable: true
  })
  mockGetInjectedProvider.mockReturnValue(mockProvider)

  const mockBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
  Object.defineProperty(global, 'crypto', {
    value: {
      getRandomValues: vi.fn().mockReturnValue(mockBytes)
    },
    writable: true
  })

  const mod = await import('../writes')

  return {
    useSafeWrites: mod.useSafeWrites,
    fetchMock
  }
}

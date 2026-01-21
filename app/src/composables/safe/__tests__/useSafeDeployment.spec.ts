import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useSafeDeployment } from '../useSafeDeployment'

// Hoisted mocks
const {
  mockUseConnection,
  mockSafeInit,
  mockAddSuccessToast,
  mockAddErrorToast,
  mockSendTransaction,
  mockWaitForReceipt,
  mockGetAddress
} = vi.hoisted(() => ({
  mockUseConnection: vi.fn(),
  mockSafeInit: vi.fn(),
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn(),
  mockSendTransaction: vi.fn(),
  mockWaitForReceipt: vi.fn(),
  mockGetAddress: vi.fn()
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useConnection: mockUseConnection
}))

vi.mock('@safe-global/protocol-kit', () => ({
  __esModule: true,
  default: {
    init: mockSafeInit
  }
}))

vi.mock('@/stores', () => ({
  useToastStore: () => ({
    addSuccessToast: mockAddSuccessToast,
    addErrorToast: mockAddErrorToast
  })
}))

vi.mock('@/utils/safe', () => ({
  getInjectedProvider: vi.fn(() => ({ provider: true })),
  randomSaltNonce: vi.fn(() => '0xsalt')
}))

describe('useSafeDeployment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null and shows toast when wallet is not connected', async () => {
    mockUseConnection.mockReturnValue({
      isConnected: ref(false),
      address: ref(null)
    })

    const { deploySafe } = useSafeDeployment()
    const result = await deploySafe(['0xowner'], 1)

    expect(result).toBeNull()
    expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
  })

  it('deploys a Safe and returns address', async () => {
    mockUseConnection.mockReturnValue({
      isConnected: ref(true),
      address: ref('0x1234567890123456789012345678901234567890')
    })

    mockSafeInit.mockResolvedValue({
      createSafeDeploymentTransaction: vi.fn().mockResolvedValue({
        to: '0x1111111111111111111111111111111111111111',
        data: '0x',
        value: '0'
      }),
      getSafeProvider: () => ({
        getExternalSigner: () => ({
          account: '0x1234567890123456789012345678901234567890',
          sendTransaction: mockSendTransaction.mockResolvedValue('0xtxhash')
        }),
        getExternalProvider: () => ({
          waitForTransactionReceipt: mockWaitForReceipt
        })
      }),
      getAddress: mockGetAddress.mockResolvedValue('0xSAFEADDRESS')
    })

    const { deploySafe } = useSafeDeployment()
    const result = await deploySafe(['0x1234567890123456789012345678901234567890'], 1)

    expect(result).toBe('0xSAFEADDRESS')
    expect(mockSendTransaction).toHaveBeenCalled()
    expect(mockWaitForReceipt).toHaveBeenCalledWith({ hash: '0xtxhash' })
    expect(mockAddSuccessToast).toHaveBeenCalledWith('Safe deployed successfully at 0xSAFEADDRESS')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSafeSDK } from '../useSafeSdk'

const { mockSafeInit, mockUseConnection, mockIsAddress, mockGetInjectedProvider } = vi.hoisted(
  () => ({
    mockSafeInit: vi.fn(),
    mockUseConnection: vi.fn(),
    mockIsAddress: vi.fn(),
    mockGetInjectedProvider: vi.fn()
  })
)

vi.mock('@safe-global/protocol-kit', () => ({
  default: {
    init: mockSafeInit
  }
}))

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wagmi/vue')>()
  return {
    ...actual,
    useConnection: mockUseConnection
  }
})

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>()
  return {
    ...actual,
    isAddress: mockIsAddress
  }
})

vi.mock('@/utils/safe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/safe')>()
  return {
    ...actual,
    getInjectedProvider: mockGetInjectedProvider
  }
})

const createConnection = (isConnected: boolean, address: string | null) => ({
  isConnected: { value: isConnected },
  address: { value: address }
})

describe('useSafeSDK deploySafe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseConnection.mockReturnValue(
      createConnection(true, '0x1111111111111111111111111111111111111111')
    )
    mockGetInjectedProvider.mockReturnValue('mock-provider')
    mockIsAddress.mockImplementation(
      (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address) || address === '0xSafe'
    )
    mockSafeInit.mockResolvedValue({ sdk: 'safe' })
  })

  it('throws when wallet is not connected', async () => {
    mockUseConnection.mockReturnValue(createConnection(false, null))
    const { deploySafe } = useSafeSDK()

    await expect(
      deploySafe(
        {
          owners: ['0x1111111111111111111111111111111111111111'],
          threshold: 1
        },
        {
          saltNonce: '0x01',
          safeVersion: '1.4.1'
        }
      )
    ).rejects.toThrow('Wallet not connected')
  })

  it('throws when owners list is empty', async () => {
    const { deploySafe } = useSafeSDK()

    await expect(
      deploySafe(
        {
          owners: [],
          threshold: 1
        },
        {
          saltNonce: '0x01',
          safeVersion: '1.4.1'
        }
      )
    ).rejects.toThrow('At least one owner required')
  })

  it('throws when threshold is out of bounds', async () => {
    const { deploySafe } = useSafeSDK()

    await expect(
      deploySafe(
        {
          owners: ['0x1111111111111111111111111111111111111111'],
          threshold: 2
        },
        {
          saltNonce: '0x01',
          safeVersion: '1.4.1'
        }
      )
    ).rejects.toThrow('Threshold must be between 1 and 1')
  })

  it('throws when owner address is invalid', async () => {
    const { deploySafe } = useSafeSDK()

    await expect(
      deploySafe(
        {
          owners: ['invalid-owner'],
          threshold: 1
        },
        {
          saltNonce: '0x01',
          safeVersion: '1.4.1'
        }
      )
    ).rejects.toThrow('Invalid owner address [0]: invalid-owner')
  })

  it('initializes safe sdk with predicted safe config for valid inputs', async () => {
    const { deploySafe } = useSafeSDK()
    await deploySafe(
      {
        owners: [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222'
        ],
        threshold: 2
      },
      {
        saltNonce: '0xfeed',
        safeVersion: '1.4.1'
      }
    )

    expect(mockSafeInit).toHaveBeenCalledWith({
      provider: 'mock-provider',
      signer: '0x1111111111111111111111111111111111111111',
      predictedSafe: {
        safeAccountConfig: {
          owners: [
            '0x1111111111111111111111111111111111111111',
            '0x2222222222222222222222222222222222222222'
          ],
          threshold: 2
        },
        safeDeploymentConfig: {
          saltNonce: '0xfeed',
          safeVersion: '1.4.1'
        }
      }
    })
  })
})

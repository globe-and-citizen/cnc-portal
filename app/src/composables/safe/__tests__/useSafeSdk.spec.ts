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

describe('useSafeSDK', () => {
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
    useSafeSDK().clearCache()
  })

  describe('createPredictedSafeSdk', () => {
    it('throws when wallet is not connected', async () => {
      mockUseConnection.mockReturnValue(createConnection(false, null))
      const { createPredictedSafeSdk } = useSafeSDK()

      await expect(
        createPredictedSafeSdk(
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
      const { createPredictedSafeSdk } = useSafeSDK()

      await expect(
        createPredictedSafeSdk(
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
      const { createPredictedSafeSdk } = useSafeSDK()

      await expect(
        createPredictedSafeSdk(
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
      const { createPredictedSafeSdk } = useSafeSDK()

      await expect(
        createPredictedSafeSdk(
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
      const { createPredictedSafeSdk } = useSafeSDK()

      await createPredictedSafeSdk(
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

  describe('loadSafe', () => {
    it('throws for invalid safe addresses', async () => {
      const { loadSafe } = useSafeSDK()

      await expect(loadSafe('invalid-safe')).rejects.toThrow('Invalid Safe address')
    })

    it('caches SDK instances by safe address and signer', async () => {
      const { loadSafe } = useSafeSDK()

      const firstPromise = loadSafe('0x1111111111111111111111111111111111111111')
      const secondPromise = loadSafe('0x1111111111111111111111111111111111111111')

      const [firstSdk, secondSdk] = await Promise.all([firstPromise, secondPromise])

      expect(mockSafeInit).toHaveBeenCalledTimes(1)
      expect(firstSdk).toEqual(secondSdk)
      expect(mockSafeInit).toHaveBeenCalledWith({
        provider: 'mock-provider',
        signer: '0x1111111111111111111111111111111111111111',
        safeAddress: '0x1111111111111111111111111111111111111111'
      })
    })

    it('removes rejected cache entries so a later retry reinitializes', async () => {
      mockSafeInit.mockRejectedValueOnce(new Error('init failed'))
      const { loadSafe } = useSafeSDK()

      await expect(loadSafe('0x1111111111111111111111111111111111111111')).rejects.toThrow(
        'init failed'
      )

      mockSafeInit.mockResolvedValueOnce({ sdk: 'safe-retry' })

      await expect(loadSafe('0x1111111111111111111111111111111111111111')).resolves.toEqual({
        sdk: 'safe-retry'
      })
      expect(mockSafeInit).toHaveBeenCalledTimes(2)
    })
  })
})

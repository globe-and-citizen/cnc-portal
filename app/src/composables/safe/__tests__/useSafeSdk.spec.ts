import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSafeSDK } from '../useSafeSdk'
import { mockUseConnection } from '@/tests/mocks'

const LOWERCASE_SAFE_ADDRESS = '0x0557f280d9da274254e85ee70c2936694e494275'
const CHECKSUM_SAFE_ADDRESS = '0x0557F280D9DA274254e85Ee70c2936694e494275'

const { mockSafeInit, mockGetInjectedProvider } = vi.hoisted(() => ({
  mockSafeInit: vi.fn(),
  mockGetInjectedProvider: vi.fn()
}))

vi.mock('@safe-global/protocol-kit', () => ({
  default: {
    init: mockSafeInit
  }
}))

vi.mock('@/lib/safe/browser', () => {
  return { getInjectedProvider: mockGetInjectedProvider }
})

describe('useSafeSDK', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseConnection.isConnected.value = true
    mockUseConnection.address.value = '0x1111111111111111111111111111111111111111'
    mockGetInjectedProvider.mockReturnValue('mock-provider')
    mockSafeInit.mockResolvedValue({ sdk: 'safe' })
    useSafeSDK().clearCache()
  })

  describe('loadSafe', () => {
    it('throws for invalid safe addresses', async () => {
      const { loadSafe } = useSafeSDK()

      await expect(loadSafe('invalid-safe')).rejects.toThrow('Invalid Safe address')
    })

    it('normalizes Safe addresses and caches equivalent casing as one SDK instance', async () => {
      const { loadSafe } = useSafeSDK()

      const firstPromise = loadSafe(LOWERCASE_SAFE_ADDRESS)
      const secondPromise = loadSafe(CHECKSUM_SAFE_ADDRESS)

      const [firstSdk, secondSdk] = await Promise.all([firstPromise, secondPromise])

      expect(mockSafeInit).toHaveBeenCalledTimes(1)
      expect(firstSdk).toEqual(secondSdk)
      expect(mockSafeInit).toHaveBeenCalledWith({
        provider: 'mock-provider',
        signer: '0x1111111111111111111111111111111111111111',
        safeAddress: CHECKSUM_SAFE_ADDRESS
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

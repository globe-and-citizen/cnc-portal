import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deriveSafeFromEoa, checkSafeDeployed } from '../safeDeploymentUtils'
import {
  getContractConfig,
  type ContractConfig,
  type SafeContractConfig
} from '@polymarket/builder-relayer-client/dist/config'
import { deriveSafe } from '@polymarket/builder-relayer-client/dist/builder/derive'
import { getPublicClient } from '@/utils'
import type { RelayClient } from '@polymarket/builder-relayer-client'

// 1. Mock External Dependencies
vi.mock('@polymarket/builder-relayer-client/dist/config', () => ({
  getContractConfig: vi.fn()
}))

vi.mock('@polymarket/builder-relayer-client/dist/builder/derive', () => ({
  deriveSafe: vi.fn()
}))

vi.mock('@/utils', () => ({
  getPublicClient: vi.fn()
}))

// Mock the networks JSON
vi.mock('@/networks/networks.json', () => ({
  default: {
    polygon: { chainId: '0x89' } // 137 in decimal
  }
}))

describe('Safe Utility Utils', () => {
  const mockEoa = '0xEOA_ADDRESS'
  const mockSafe = '0xSAFE_ADDRESS'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('deriveSafeFromEoa', () => {
    it('successfully derives a safe address', () => {
      vi.mocked(getContractConfig).mockReturnValue({
        SafeContracts: { SafeFactory: '0xFactory' } as SafeContractConfig
      } as ContractConfig)
      vi.mocked(deriveSafe).mockReturnValue(mockSafe)

      const result = deriveSafeFromEoa(mockEoa)

      expect(getContractConfig).toHaveBeenCalledWith(137)
      expect(deriveSafe).toHaveBeenCalledWith(mockEoa, '0xFactory')
      expect(result).toBe(mockSafe)
    })

    it('returns null and logs error on failure', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(getContractConfig).mockImplementation(() => {
        throw new Error('Config Error')
      })

      const result = deriveSafeFromEoa(mockEoa)

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('checkSafeDeployed', () => {
    const mockGetDeployed = vi.fn()
    const mockRelayClient = {
      getDeployed: mockGetDeployed
    } as unknown as RelayClient

    it('returns true if relayClient confirms deployment', async () => {
      mockGetDeployed.mockResolvedValue(true)

      const result = await checkSafeDeployed(mockRelayClient, mockSafe)

      expect(result).toBe(true)
      expect(mockGetDeployed).toHaveBeenCalledWith(mockSafe)
    })

    it('returns false if RPC returns empty bytecode (0x)', async () => {
      mockGetDeployed.mockRejectedValue(new Error('API Down'))
      const mockGetCode = vi.fn().mockResolvedValue('0x')
      vi.mocked(getPublicClient).mockReturnValue({ getCode: mockGetCode } as unknown as ReturnType<
        typeof getPublicClient
      >)

      const result = await checkSafeDeployed(mockRelayClient, mockSafe)

      expect(result).toBe(false)
    })

    it('returns false if publicClient is unavailable', async () => {
      mockGetDeployed.mockRejectedValue(new Error('API Down'))
      vi.mocked(getPublicClient).mockReturnValue(
        null as unknown as ReturnType<typeof getPublicClient>
      )

      const result = await checkSafeDeployed(mockRelayClient, mockSafe)

      expect(result).toBe(false)
    })
  })
})

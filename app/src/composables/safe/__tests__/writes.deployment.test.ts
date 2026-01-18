import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { Address } from 'viem'
import {
  setupWritesTest,
  MOCK_DATA,
  mockConnection,
  mockFormatEther,
  mockSafeInit,
  mockSafeSdk,
  mockPublicClient,
  mockQueryClient,
  mockWalletClient,
  mockChainId
} from './writes.test.utils'

let ctx: Awaited<ReturnType<typeof setupWritesTest>>

beforeEach(async () => {
  ctx = await setupWritesTest()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useSafeWrites - Deployment & State', () => {
  it('initializes with idle state', () => {
    const { isBusy } = ctx.useSafeWrites()
    expect(isBusy.value).toBe(false)
  })

  it('clears cache when wallet address changes', async () => {
    const { loadSafe } = ctx.useSafeWrites()

    await loadSafe(MOCK_DATA.safeAddress)
    expect(mockSafeInit).toHaveBeenCalledTimes(1)

    mockConnection.address.value = '0x0000000000000000000000000000000000000001' as Address
    await nextTick()

    await loadSafe(MOCK_DATA.safeAddress)
    expect(mockSafeInit).toHaveBeenCalledTimes(2)
  })

  describe('deploySafe', () => {
    it('deploys a new Safe successfully', async () => {
      const { deploySafe, isBusy } = ctx.useSafeWrites()

      const promise = deploySafe(MOCK_DATA.owners, MOCK_DATA.threshold)
      expect(isBusy.value).toBe(true)

      const safeAddress = await promise
      expect(isBusy.value).toBe(false)
      expect(safeAddress).toBe(MOCK_DATA.safeAddress)
      expect(mockSafeInit).toHaveBeenCalledWith(
        expect.objectContaining({
          signer: MOCK_DATA.owners[0],
          predictedSafe: expect.objectContaining({
            safeAccountConfig: {
              owners: MOCK_DATA.owners,
              threshold: MOCK_DATA.threshold
            },
            safeDeploymentConfig: {
              saltNonce: expect.stringMatching(/^0x[0-9a-f]{32}$/),
              safeVersion: '1.4.1'
            }
          })
        })
      )
      // Should invalidate Safe queries for new address (including transactions default filter "all")
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['safeInfo', mockChainId.value, MOCK_DATA.safeAddress]
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['safeTransactions', mockChainId.value, MOCK_DATA.safeAddress, 'all']
      })
    })

    it('validates wallet connection', async () => {
      mockConnection.isConnected.value = false
      const { deploySafe } = ctx.useSafeWrites()

      await expect(deploySafe(MOCK_DATA.owners, MOCK_DATA.threshold)).rejects.toThrow(
        'Wallet not connected'
      )
    })

    it('validates owners array', async () => {
      const { deploySafe } = ctx.useSafeWrites()
      await expect(deploySafe([], 1)).rejects.toThrow('At least one owner required')
    })

    it('validates threshold bounds', async () => {
      const { deploySafe } = ctx.useSafeWrites()
      await expect(deploySafe(MOCK_DATA.owners, 0)).rejects.toThrow(
        'Threshold must be between 1 and 2'
      )
      await expect(deploySafe(MOCK_DATA.owners, 3)).rejects.toThrow(
        'Threshold must be between 1 and 2'
      )
    })

    it('validates owner addresses', async () => {
      const { deploySafe } = ctx.useSafeWrites()
      const invalidOwners = ['invalid-address', MOCK_DATA.owners[1]]

      await expect(deploySafe(invalidOwners, 1)).rejects.toThrow(
        'Invalid owner address [0]: invalid-address'
      )
    })

    it('handles deployment transaction creation failure', async () => {
      mockSafeSdk.createSafeDeploymentTransaction.mockRejectedValueOnce(
        new Error('Deployment failed')
      )
      const { deploySafe } = ctx.useSafeWrites()

      await expect(deploySafe(MOCK_DATA.owners, MOCK_DATA.threshold)).rejects.toThrow(
        'Deployment failed'
      )
    })

    it('handles wallet signer not available', async () => {
      mockSafeSdk.getSafeProvider.mockReturnValueOnce({
        getExternalSigner: vi.fn().mockResolvedValue(null),
        getExternalProvider: vi.fn().mockReturnValue(mockPublicClient)
      })

      const { deploySafe } = ctx.useSafeWrites()
      await expect(deploySafe(MOCK_DATA.owners, MOCK_DATA.threshold)).rejects.toThrow(
        'Wallet signer not available'
      )
    })

    it('fails when injected provider lacks request', async () => {
      const original = (globalThis.window as { ethereum?: unknown }).ethereum
      ;(globalThis.window as { ethereum?: unknown }).ethereum = {}
      const { deploySafe } = ctx.useSafeWrites()

      await expect(deploySafe(MOCK_DATA.owners, MOCK_DATA.threshold)).rejects.toThrow(
        'Injected provider does not implement EIP-1193 request method'
      )
      ;(globalThis.window as { ethereum?: unknown }).ethereum = original
    })
  })

  describe('loadSafe', () => {
    it('loads an existing Safe', async () => {
      const { loadSafe } = ctx.useSafeWrites()
      const safe = await loadSafe(MOCK_DATA.safeAddress)

      expect(safe).toBe(mockSafeSdk)
      expect(mockSafeInit).toHaveBeenCalledWith(
        expect.objectContaining({
          safeAddress: MOCK_DATA.safeAddress,
          signer: MOCK_DATA.owners[0]
        })
      )
    })

    it('validates Safe address', async () => {
      const { loadSafe } = ctx.useSafeWrites()
      await expect(loadSafe('invalid-address')).rejects.toThrow('Invalid Safe address')
    })

    it('validates wallet connection for loading', async () => {
      mockConnection.isConnected.value = false
      const { loadSafe } = ctx.useSafeWrites()

      await expect(loadSafe(MOCK_DATA.safeAddress)).rejects.toThrow('Wallet not connected')
    })

    it('caches Safe instances', async () => {
      const { loadSafe } = ctx.useSafeWrites()
      await loadSafe(MOCK_DATA.safeAddress)
      await loadSafe(MOCK_DATA.safeAddress)

      expect(mockSafeInit).toHaveBeenCalledTimes(1)
    })

    it('handles Safe initialization failure and clears cache', async () => {
      mockSafeInit.mockRejectedValueOnce(new Error('Init failed'))
      const { loadSafe } = ctx.useSafeWrites()

      await expect(loadSafe(MOCK_DATA.safeAddress)).rejects.toThrow('Init failed')

      mockSafeInit.mockResolvedValueOnce(mockSafeSdk)
      const safe = await loadSafe(MOCK_DATA.safeAddress)
      expect(safe).toBe(mockSafeSdk)
      expect(mockSafeInit).toHaveBeenCalledTimes(2)
    })
  })

  describe('getDeployerInfo', () => {
    it('returns deployer address and balance', async () => {
      const { getDeployerInfo } = ctx.useSafeWrites()
      const info = await getDeployerInfo()

      expect(info).toEqual({
        address: MOCK_DATA.owners[0],
        balanceEth: '1.0'
      })
      expect(mockPublicClient.getBalance).toHaveBeenCalledWith({ address: MOCK_DATA.owners[0] })
      expect(mockFormatEther).toHaveBeenCalledWith(MOCK_DATA.balance)
    })

    it('validates wallet connection for deployer info', async () => {
      mockConnection.isConnected.value = false
      const { getDeployerInfo } = ctx.useSafeWrites()

      await expect(getDeployerInfo()).rejects.toThrow('Wallet not connected')
    })

    it('handles balance fetch failure', async () => {
      mockPublicClient.getBalance.mockRejectedValueOnce(new Error('Balance fetch failed'))
      const { getDeployerInfo } = ctx.useSafeWrites()

      await expect(getDeployerInfo()).rejects.toThrow('Balance fetch failed')
    })
  })

  describe('Busy State Management', () => {
    it('tracks busy state during deploy operation', async () => {
      const { deploySafe, isBusy } = ctx.useSafeWrites()

      let resolver: (value: unknown) => void
      mockSafeSdk.createSafeDeploymentTransaction.mockReturnValue(
        new Promise((resolve) => {
          resolver = resolve
        })
      )

      const deployPromise = deploySafe(MOCK_DATA.owners, MOCK_DATA.threshold)
      expect(isBusy.value).toBe(true)

      resolver!(MOCK_DATA.deploymentTx)
      await deployPromise
      expect(isBusy.value).toBe(false)
    })

    it('resets busy state on deploy error', async () => {
      mockSafeSdk.createSafeDeploymentTransaction.mockRejectedValueOnce(new Error('Deploy failed'))
      const { deploySafe, isBusy } = ctx.useSafeWrites()

      await expect(deploySafe(MOCK_DATA.owners, MOCK_DATA.threshold)).rejects.toThrow(
        'Deploy failed'
      )
      expect(isBusy.value).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('handles window.ethereum not available on initialization', () => {
      Object.defineProperty(globalThis.window, 'ethereum', {
        value: undefined,
        writable: true
      })

      expect(() => ctx.useSafeWrites()).not.toThrow()
    })

    it('handles missing window.ethereum during deploy', async () => {
      Object.defineProperty(globalThis.window, 'ethereum', {
        value: undefined,
        writable: true
      })

      const { deploySafe } = ctx.useSafeWrites()
      await expect(deploySafe(MOCK_DATA.owners, MOCK_DATA.threshold)).rejects.toThrow(
        'No injected Ethereum provider (window.ethereum) found'
      )
    })
  })

  describe('Integration', () => {
    it('runs complete deployment flow', async () => {
      const { deploySafe, getDeployerInfo } = ctx.useSafeWrites()

      const info = await getDeployerInfo()
      expect(info.address).toBe(MOCK_DATA.owners[0])

      const safeAddress = await deploySafe(MOCK_DATA.owners, MOCK_DATA.threshold)
      expect(safeAddress).toBe(MOCK_DATA.safeAddress)

      expect(mockSafeSdk.createSafeDeploymentTransaction).toHaveBeenCalled()
      expect(mockWalletClient.sendTransaction).toHaveBeenCalled()
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalled()
    })
  })
})

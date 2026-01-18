import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  setupWritesTest,
  MOCK_DATA,
  mockChainId,
  mockSafeInit,
  mockSafeSdk
} from './writes.test.utils'

let ctx: Awaited<ReturnType<typeof setupWritesTest>>

beforeEach(async () => {
  ctx = await setupWritesTest()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useSafeWrites - Transactions', () => {
  describe('approveTransaction', () => {
    beforeEach(() => {
      ctx.axiosPostMock.mockResolvedValue({ data: {} })
      mockSafeSdk.signHash.mockResolvedValue(MOCK_DATA.signature)
    })

    it('approves a Safe transaction successfully', async () => {
      const { approveTransaction } = ctx.useSafeWrites()

      const signature = await approveTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)

      expect(signature).toBe(MOCK_DATA.signature.data)
      expect(ctx.axiosPostMock).toHaveBeenCalledWith(
        `https://safe-transaction-polygon.safe.global/api/v1/multisig-transactions/${MOCK_DATA.safeTxHash}/confirmations/`,
        { signature: MOCK_DATA.signature.data },
        expect.objectContaining({ headers: expect.any(Object) })
      )
    })

    it('validates Safe address for approval', async () => {
      const { approveTransaction } = ctx.useSafeWrites()
      await expect(approveTransaction('invalid-address', MOCK_DATA.safeTxHash)).rejects.toThrow(
        'Invalid Safe address'
      )
    })

    it('validates transaction hash', async () => {
      const { approveTransaction } = ctx.useSafeWrites()
      await expect(approveTransaction(MOCK_DATA.safeAddress, '')).rejects.toThrow(
        'Missing Safe transaction hash'
      )
    })

    it('handles unsupported chain', async () => {
      mockChainId.value = 999
      const { approveTransaction } = ctx.useSafeWrites()

      await expect(approveTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)).rejects.toThrow(
        'Unsupported chainId: 999'
      )
    })

    it('handles API error response', async () => {
      ctx.axiosPostMock.mockRejectedValueOnce({
        isAxiosError: true,
        response: { statusText: 'API Error', data: 'API Error' },
        message: 'API Error'
      })
      const { approveTransaction } = ctx.useSafeWrites()

      await expect(approveTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)).rejects.toThrow(
        'API Error'
      )
    })

    it('handles signature creation failure', async () => {
      mockSafeSdk.signHash.mockRejectedValueOnce(new Error('Signing failed'))
      const { approveTransaction } = ctx.useSafeWrites()

      await expect(approveTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)).rejects.toThrow(
        'Signing failed'
      )
    })
  })

  describe('executeTransaction', () => {
    const mockServiceTx = {
      safe: MOCK_DATA.safeAddress,
      to: '0x1111111111111111111111111111111111111111',
      data: '0xdeadbeef',
      value: '0',
      nonce: 1
    }

    const mockTxResponse = {
      hash: MOCK_DATA.txHash,
      transactionResponse: {
        hash: MOCK_DATA.txHash,
        wait: vi.fn().mockResolvedValue({})
      }
    }

    beforeEach(() => {
      ctx.axiosGetMock.mockResolvedValue({ data: mockServiceTx })
      mockSafeSdk.executeTransaction.mockResolvedValue(mockTxResponse)
    })

    it('executes a Safe transaction successfully', async () => {
      const { executeTransaction } = ctx.useSafeWrites()

      const txHash = await executeTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)

      expect(txHash).toBe(MOCK_DATA.txHash)
      expect(ctx.axiosGetMock).toHaveBeenCalledWith(
        `https://safe-transaction-polygon.safe.global/api/v1/multisig-transactions/${MOCK_DATA.safeTxHash}/`
      )
      expect(mockSafeSdk.executeTransaction).toHaveBeenCalledWith(mockServiceTx)
      expect(mockTxResponse.transactionResponse.wait).toHaveBeenCalled()
    })

    it('validates Safe address for execution', async () => {
      const { executeTransaction } = ctx.useSafeWrites()
      await expect(executeTransaction('invalid-address', MOCK_DATA.safeTxHash)).rejects.toThrow(
        'Invalid Safe address'
      )
    })

    it('handles transaction not found', async () => {
      ctx.axiosGetMock.mockRejectedValueOnce({
        isAxiosError: true,
        response: { statusText: 'Transaction not found', data: 'Transaction not found' },
        message: 'Transaction not found'
      })
      const { executeTransaction } = ctx.useSafeWrites()

      await expect(executeTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)).rejects.toThrow(
        'Transaction not found'
      )
    })

    it('handles execution without wait function', async () => {
      mockSafeSdk.executeTransaction.mockResolvedValueOnce({
        hash: MOCK_DATA.txHash,
        transactionResponse: {
          hash: MOCK_DATA.txHash
        }
      })

      const { executeTransaction } = ctx.useSafeWrites()
      const txHash = await executeTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)
      expect(txHash).toBe(MOCK_DATA.txHash)
    })

    it('handles execution failure', async () => {
      mockSafeSdk.executeTransaction.mockRejectedValueOnce(new Error('Execution failed'))
      const { executeTransaction } = ctx.useSafeWrites()

      await expect(executeTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)).rejects.toThrow(
        'Execution failed'
      )
    })
  })

  describe('Chain Support', () => {
    it('builds chain-specific transaction service URLs', async () => {
      const testCases = [
        { chainId: 137, chain: 'polygon' },
        { chainId: 11155111, chain: 'sepolia' },
        { chainId: 80002, chain: 'amoy' },
        { chainId: 42161, chain: 'arbitrum' }
      ]

      ctx.axiosPostMock.mockResolvedValue({ data: {} })
      mockSafeSdk.signHash.mockResolvedValue(MOCK_DATA.signature)

      const { approveTransaction } = ctx.useSafeWrites()

      for (const testCase of testCases) {
        mockChainId.value = testCase.chainId
        await approveTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)
        expect(ctx.axiosPostMock).toHaveBeenCalledWith(
          expect.stringContaining(`safe-transaction-${testCase.chain}.safe.global`),
          expect.any(Object),
          expect.any(Object)
        )
        ctx.axiosPostMock.mockClear()
      }
    })
  })

  describe('Error Handling', () => {
    it('handles cache cleanup on init errors', async () => {
      mockSafeInit.mockRejectedValueOnce(new Error('Init failed'))
      const { loadSafe } = ctx.useSafeWrites()

      await expect(loadSafe(MOCK_DATA.safeAddress)).rejects.toThrow('Init failed')

      mockSafeInit.mockResolvedValueOnce(mockSafeSdk)
      const safe = await loadSafe(MOCK_DATA.safeAddress)
      expect(safe).toBe(mockSafeSdk)
    })

    it('handles network request failures gracefully', async () => {
      ctx.axiosPostMock.mockRejectedValueOnce(new Error('Network error'))
      const { approveTransaction } = ctx.useSafeWrites()

      await expect(approveTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('Integration', () => {
    it('handles Safe interaction flow (approve + execute)', async () => {
      ctx.axiosPostMock.mockResolvedValueOnce({ data: {} })
      ctx.axiosGetMock.mockResolvedValueOnce({
        data: {
          safe: MOCK_DATA.safeAddress,
          to: '0x1111111111111111111111111111111111111111',
          data: '0xdeadbeef'
        }
      })

      mockSafeSdk.signHash.mockResolvedValue(MOCK_DATA.signature)
      mockSafeSdk.executeTransaction.mockResolvedValue({
        hash: MOCK_DATA.txHash,
        transactionResponse: { hash: MOCK_DATA.txHash }
      })

      const { approveTransaction, executeTransaction } = ctx.useSafeWrites()

      const signature = await approveTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)
      expect(signature).toBe(MOCK_DATA.signature.data)

      const txHash = await executeTransaction(MOCK_DATA.safeAddress, MOCK_DATA.safeTxHash)
      expect(txHash).toBe(MOCK_DATA.txHash)
    })
  })
})

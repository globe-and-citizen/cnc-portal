import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Address } from 'viem'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import { SENTRY_WEB3_BOUNDARY_META_KEY } from '@/lib/sentry'
import { useMutationFn } from '@/tests/mocks/composables.mock'

let useSafeSendTransaction: typeof import('../useSafeSendTransaction').useSafeSendTransaction
let executeSendTransaction: typeof import('../useSafeSendTransaction').executeSendTransaction

const RECIPIENT = '0x1111111111111111111111111111111111111111' as Address

describe('useSafeSendTransaction', () => {
  beforeAll(async () => {
    vi.doUnmock('@/composables/transactions/useSafeSendTransaction')
    const module = await import('../useSafeSendTransaction')
    useSafeSendTransaction = module.useSafeSendTransaction
    executeSendTransaction = module.executeSendTransaction
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks the mutation as a specialized Web3 Sentry boundary', () => {
    useSafeSendTransaction({ to: RECIPIENT })

    const options = vi.mocked(useMutationFn).mock.calls[0]?.[0] as {
      meta?: Record<string, unknown>
    }

    expect(options.meta).toEqual({ [SENTRY_WEB3_BOUNDARY_META_KEY]: true })
  })

  it('[AC-US-AUTH-004-07] pins native estimation, submission and receipt to the configured network', async () => {
    mockWagmiCore.sendTransaction.mockResolvedValueOnce('0x123')
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValueOnce({ status: 'success' })
    await executeSendTransaction({ to: RECIPIENT, value: 1n })

    expect(mockWagmiCore.estimateGas).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ chainId: 31337 })
    )
    expect(mockWagmiCore.sendTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ chainId: 31337 })
    )
    expect(mockWagmiCore.waitForTransactionReceipt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ chainId: 31337 })
    )
  })

  it('rejects native sends targeting another network before submitting', async () => {
    await expect(executeSendTransaction({ to: RECIPIENT, value: 1n, chainId: 1 })).rejects.toThrow(
      'not connected to the requested chain'
    )
    expect(mockWagmiCore.sendTransaction).not.toHaveBeenCalled()
  })
})

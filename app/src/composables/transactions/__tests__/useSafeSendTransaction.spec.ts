import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Address } from 'viem'
import { SENTRY_WEB3_BOUNDARY_META_KEY } from '@/lib/sentry'
import { useMutationFn } from '@/tests/mocks/composables.mock'

let useSafeSendTransaction: typeof import('../useSafeSendTransaction').useSafeSendTransaction

const RECIPIENT = '0x1111111111111111111111111111111111111111' as Address

describe('useSafeSendTransaction', () => {
  beforeAll(async () => {
    vi.doUnmock('@/composables/transactions/useSafeSendTransaction')
    const module = await import('../useSafeSendTransaction')
    useSafeSendTransaction = module.useSafeSendTransaction
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
})

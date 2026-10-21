import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseError } from 'viem'
import { SENTRY_WEB3_BOUNDARY_META_KEY } from '@/lib/sentry'

const sentryMocks = vi.hoisted(() => ({
  captureWeb3Error: vi.fn(),
  SENTRY_WEB3_BOUNDARY_META_KEY: 'sentryWeb3Boundary'
}))

vi.mock('@/lib/sentry', () => sentryMocks)

import { queryClient } from '../queryClient'

describe('queryClient Web3 mutation capture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('leaves capture priority to a specialized Web3 mutation boundary', async () => {
    const error = new BaseError('RPC unavailable')
    const mutation = queryClient.getMutationCache().build(queryClient, {
      meta: { [SENTRY_WEB3_BOUNDARY_META_KEY]: true },
      mutationFn: async () => {
        throw error
      },
      onError: (boundaryError) => {
        sentryMocks.captureWeb3Error(boundaryError, { operation: 'contract-write', force: true })
      }
    })

    await expect(mutation.execute()).rejects.toBe(error)

    expect(sentryMocks.captureWeb3Error).toHaveBeenCalledTimes(1)
    expect(sentryMocks.captureWeb3Error).toHaveBeenCalledWith(error, {
      operation: 'contract-write',
      force: true
    })
  })

  it('captures an unclassified Web3 mutation through the shared fallback', async () => {
    const error = new BaseError('RPC unavailable')
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => {
        throw error
      }
    })

    await expect(mutation.execute()).rejects.toBe(error)

    expect(sentryMocks.captureWeb3Error).toHaveBeenCalledWith(error, { operation: 'mutation' })
  })
})

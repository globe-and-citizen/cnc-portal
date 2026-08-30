import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks'

vi.unmock('@/composables/fixedReturn/reads')

import { useFixedReturnAllOffers } from '../reads'

type CapturedQuery = {
  queryFn: () => Promise<unknown>
}

describe('useFixedReturnAllOffers', () => {
  let capturedQuery: CapturedQuery | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    capturedQuery = null
    useQueryFn.mockImplementation((options: unknown) => {
      capturedQuery = options as CapturedQuery
      return {
        data: ref(undefined),
        isLoading: ref(false),
        isError: ref(false),
        error: ref(null),
        refetch: vi.fn()
      }
    })
  })

  function getQuery(): CapturedQuery {
    if (!capturedQuery) throw new Error('Expected the offering query to be registered')
    return capturedQuery
  }

  it('rejects an offer-detail failure instead of presenting a partial list as complete', async () => {
    const readError = new Error('FixedReturn offer read unavailable')
    mockWagmiCore.readContract
      .mockResolvedValueOnce(1n)
      .mockRejectedValueOnce(readError)
      .mockResolvedValueOnce([])

    useFixedReturnAllOffers()

    await expect(getQuery().queryFn()).rejects.toThrow(readError)
  })

  it('returns an empty list only after the contract confirms no offerings', async () => {
    mockWagmiCore.readContract.mockResolvedValueOnce(0n)

    useFixedReturnAllOffers()

    await expect(getQuery().queryFn()).resolves.toEqual([])
  })
})

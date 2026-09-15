import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks'

vi.unmock('@/composables/fixedReturn/reads')

import { useFixedReturnMyLenderPositions } from '../reads'

type CapturedQuery = {
  queryFn: () => Promise<Map<number, unknown>>
}

const OFFERS = [
  { offerId: 1, offer: {}, decimals: 6, lenderAddresses: [] },
  { offerId: 2, offer: {}, decimals: 6, lenderAddresses: [] }
]

function scopeOf(options: unknown): unknown {
  const { queryKey } = options as { queryKey: unknown }
  const key = toValue(queryKey) as readonly unknown[]
  return key[1]
}

describe('useFixedReturnMyLenderPositions', () => {
  let capturedQuery: CapturedQuery | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    capturedQuery = null
    // useFixedReturnMyLenderPositions internally calls useFixedReturnAllOffers, which
    // registers its own useQuery — key off the fixedReturnKeys scope segment to feed
    // that inner call a fixed offer list without it re-registering as the query under
    // test below.
    useQueryFn.mockImplementation((options: unknown) => {
      if (scopeOf(options) === 'allOffers') {
        return {
          data: ref(OFFERS),
          isLoading: ref(false),
          isError: ref(false),
          error: ref(null),
          refetch: vi.fn()
        }
      }
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
    if (!capturedQuery) throw new Error('Expected the my-lender-positions query to be registered')
    return capturedQuery
  }

  it('preserves a successful entry for one offer while marking another as an error, instead of fabricating a zero position', async () => {
    mockWagmiCore.readContract
      // offer 1: allocation, deposited — both succeed
      .mockResolvedValueOnce(500n)
      .mockResolvedValueOnce(100n)
      // offer 2: allocation read fails
      .mockRejectedValueOnce(new Error('RPC timeout'))

    useFixedReturnMyLenderPositions()

    const result = await getQuery().queryFn()

    expect(result.get(1)).toEqual({ status: 'ok', allocation: 500n, deposited: 100n })
    expect(result.get(2)).toMatchObject({ status: 'error' })
  })

  it('returns an empty map with no RPC calls when there are no offers to check', async () => {
    useQueryFn.mockImplementation((options: unknown) => {
      if (scopeOf(options) === 'allOffers') {
        return {
          data: ref([]),
          isLoading: ref(false),
          isError: ref(false),
          error: ref(null),
          refetch: vi.fn()
        }
      }
      capturedQuery = options as CapturedQuery
      return {
        data: ref(undefined),
        isLoading: ref(false),
        isError: ref(false),
        error: ref(null),
        refetch: vi.fn()
      }
    })

    useFixedReturnMyLenderPositions()

    await expect(getQuery().queryFn()).resolves.toEqual(new Map())
    expect(mockWagmiCore.readContract).not.toHaveBeenCalled()
  })
})

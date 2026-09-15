import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks'
import { USDC_ADDRESS } from '@/constant'

vi.unmock('@/composables/fixedReturn/reads')

import { useFixedReturnOfferLenders } from '../reads'

type CapturedQuery = {
  queryFn: () => Promise<unknown>
}

describe('useFixedReturnOfferLenders', () => {
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
    if (!capturedQuery) throw new Error('Expected the offer-lenders query to be registered')
    return capturedQuery
  }

  it('rejects a per-lender read failure instead of returning a partial-looking empty list', async () => {
    const readError = new Error('FixedReturn lender read unavailable')
    mockWagmiCore.readContract
      .mockResolvedValueOnce(['0x1111111111111111111111111111111111111111'])
      .mockRejectedValueOnce(readError)

    useFixedReturnOfferLenders('1', USDC_ADDRESS)

    await expect(getQuery().queryFn()).rejects.toThrow(readError)
  })

  it('resolves an empty list only after the contract confirms there are no lenders', async () => {
    mockWagmiCore.readContract.mockResolvedValueOnce([])

    useFixedReturnOfferLenders('1', USDC_ADDRESS)

    await expect(getQuery().queryFn()).resolves.toEqual([])
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { QueryClient } from '@tanstack/vue-query'
import { fixedReturnKeys } from '../reads'
import {
  invalidateAfterAcceptPartialFunding,
  invalidateAfterCreateLendingOffer,
  invalidateAfterLend,
  invalidateAfterRefund,
  invalidateAfterRepay,
  retryFixedReturnReads,
  retryMyLenderPositions
} from '../invalidation'

const TOKEN_ADDRESS = '0x2222222222222222222222222222222222222222' as const
const EVENTS_LOG_KEY = ['fixed-return-events-logs']

function makeQueryClient() {
  return { invalidateQueries: vi.fn().mockResolvedValue(undefined) } as unknown as QueryClient
}

describe.each([
  ['invalidateAfterLend', invalidateAfterLend],
  ['invalidateAfterRepay', invalidateAfterRepay],
  ['invalidateAfterRefund', invalidateAfterRefund],
  ['invalidateAfterAcceptPartialFunding', invalidateAfterAcceptPartialFunding]
] as const)('%s', (_name, invalidate) => {
  it('invalidates every FixedReturn read, the events log, and the token contract reads', async () => {
    const queryClient = makeQueryClient()

    await invalidate(queryClient, TOKEN_ADDRESS)

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: fixedReturnKeys.all })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: EVENTS_LOG_KEY })

    // The third call passes a predicate built from the given token address — assert
    // its actual matching behaviour (the real contractReadsOfAddress) rather than
    // mocking it away, since a stale predicate that stops matching is the failure
    // mode this test exists to catch.
    const predicateCall = (
      queryClient.invalidateQueries as ReturnType<typeof vi.fn>
    ).mock.calls.find(([args]) => typeof args.predicate === 'function')
    expect(predicateCall).toBeDefined()
    const predicate = predicateCall![0].predicate as (query: {
      queryKey: readonly unknown[]
    }) => boolean

    expect(
      predicate({
        queryKey: ['readContract', { address: TOKEN_ADDRESS, functionName: 'balanceOf' }]
      })
    ).toBe(true)
    expect(
      predicate({
        queryKey: ['readContract', { address: '0x9999999999999999999999999999999999999999' }]
      })
    ).toBe(false)
  })
})

describe('invalidateAfterCreateLendingOffer', () => {
  it('invalidates only the overview list, not the full FixedReturn scope', () => {
    const queryClient = makeQueryClient()

    invalidateAfterCreateLendingOffer(queryClient)

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: fixedReturnKeys.allOffers
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1)
  })
})

describe('retryFixedReturnReads', () => {
  it('invalidates the broad FixedReturn prefix, not the events log or any token', () => {
    const queryClient = makeQueryClient()

    retryFixedReturnReads(queryClient)

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: fixedReturnKeys.all })
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1)
  })
})

describe('retryMyLenderPositions', () => {
  it('invalidates only the connected-lender-positions query', () => {
    const queryClient = makeQueryClient()

    retryMyLenderPositions(queryClient)

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: fixedReturnKeys.myLenderPositions
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1)
  })
})

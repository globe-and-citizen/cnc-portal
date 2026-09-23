import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks'

vi.unmock('@/composables/fixedReturn/reads')

import { useFixedReturnAllOffers, useFixedReturnOfferLenders } from '../reads'

/**
 * Regression guard for F5 (issue #2767): the overview's combined read cost is
 * documented as `1 + 4N` on-chain calls for N offers (1 getTotalOfferings, then
 * getLendingOffer + getOfferLenders per offer for the list, plus
 * getLenderAllocation + getLenderDeposits per offer for the connected wallet's
 * positions) — and a single offer's lender breakdown is `1 + 2L` for L lenders
 * (getOfferLenders, then getLenderDeposits + totalEntitlementOf per lender).
 *
 * Before this slice, RoundView.vue additionally re-ran the ENTIRE overview
 * computation above (another 1+4N calls) just to read one Map entry for the
 * current round — eliminated by the new useFixedReturnMyLenderPosition, which
 * reads only that one offer's allocation/deposits via the existing
 * useReadContract-wrapped hooks (outside this readContract-call-counting scope,
 * and already auto-invalidated by useContractWritesV3's write predicate).
 */

type CapturedQuery = { queryFn: () => Promise<unknown> }

function scopeOf(options: unknown): unknown {
  const { queryKey } = options as { queryKey: unknown }
  const key = toValue(queryKey) as readonly unknown[]
  return key[1]
}

function countCallsByFunctionName() {
  const counts: Record<string, number> = {}
  const readContract = mockWagmiCore.readContract as unknown as {
    mock: { calls: [unknown, { functionName: string }][] }
  }
  for (const [, params] of readContract.mock.calls) {
    counts[params.functionName] = (counts[params.functionName] ?? 0) + 1
  }
  return counts
}

describe('FixedReturn RPC budget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads the overview (all offers + all lender positions) in exactly 1 + 4N on-chain calls', async () => {
    const OFFER_COUNT = 3
    // useFixedReturnMyLenderPositions internally calls useFixedReturnAllOffers again —
    // share one data ref across every 'allOffers'-scoped registration so both the
    // standalone call below and that internal one see the same resolved offer list.
    const allOffersData = ref<unknown>(undefined)
    const capturedPositions: CapturedQuery[] = []
    let capturedAllOffers: CapturedQuery | null = null

    useQueryFn.mockImplementation((options: unknown) => {
      if (scopeOf(options) === 'allOffers') capturedAllOffers ??= options as CapturedQuery
      if (scopeOf(options) === 'myLenderPositions') capturedPositions.push(options as CapturedQuery)
      return {
        data: allOffersData,
        isLoading: ref(false),
        isError: ref(false),
        error: ref(null),
        refetch: vi.fn()
      }
    })

    mockWagmiCore.readContract.mockImplementation(
      async (_config: unknown, params: { functionName: string; args?: readonly unknown[] }) => {
        const { functionName, args } = params
        if (functionName === 'getTotalOfferings') return BigInt(OFFER_COUNT)
        if (functionName === 'getLendingOffer') return { token: '0x0' }
        if (functionName === 'getOfferLenders') return []
        if (functionName === 'getLenderAllocation' || functionName === 'getLenderDeposits')
          return 0n
        throw new Error(`Unexpected functionName in test: ${functionName} ${args}`)
      }
    )

    useFixedReturnAllOffers()
    allOffersData.value = await capturedAllOffers!.queryFn()

    const { useFixedReturnMyLenderPositions } = await import('../reads')
    useFixedReturnMyLenderPositions()
    await capturedPositions[0].queryFn()

    const counts = countCallsByFunctionName()
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

    expect(counts.getTotalOfferings).toBe(1)
    expect(counts.getLendingOffer).toBe(OFFER_COUNT)
    expect(counts.getOfferLenders).toBe(OFFER_COUNT)
    expect(counts.getLenderAllocation).toBe(OFFER_COUNT)
    expect(counts.getLenderDeposits).toBe(OFFER_COUNT)
    expect(total).toBe(1 + 4 * OFFER_COUNT)
  })

  it("reads a single offer's lender breakdown in exactly 1 + 2L on-chain calls", async () => {
    const LENDER_COUNT = 2
    let captured: CapturedQuery | null = null
    useQueryFn.mockImplementation((options: unknown) => {
      captured = options as CapturedQuery
      return {
        data: ref(undefined),
        isLoading: ref(false),
        isError: ref(false),
        error: ref(null),
        refetch: vi.fn()
      }
    })

    const lenders = Array.from(
      { length: LENDER_COUNT },
      (_, i) => `0x${String(i + 1).padStart(40, '0')}`
    )
    mockWagmiCore.readContract.mockImplementation(
      async (_config: unknown, params: { functionName: string }) => {
        const { functionName } = params
        if (functionName === 'getOfferLenders') return lenders
        if (functionName === 'getLenderDeposits' || functionName === 'totalEntitlementOf') return 0n
        throw new Error(`Unexpected functionName in test: ${functionName}`)
      }
    )

    useFixedReturnOfferLenders('1', '0x0000000000000000000000000000000000000000')
    await captured!.queryFn()

    const counts = countCallsByFunctionName()
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

    expect(counts.getOfferLenders).toBe(1)
    expect(counts.getLenderDeposits).toBe(LENDER_COUNT)
    expect(counts.totalEntitlementOf).toBe(LENDER_COUNT)
    expect(total).toBe(1 + 2 * LENDER_COUNT)
  })
})

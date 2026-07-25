import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { CreditRound, LendingOfferStruct } from '@/types'
import { USDC_ADDRESS } from '@/constant'
import { MINUTES_PER_DAY } from '@/utils'

// vue-router is globally mocked (composables.setup.ts); useRouter().push is
// mockRouterPush and useRoute() reads the shared reactive mockRoute.
import {
  mockRouterPush,
  setMockRoute,
  useQueryClientFn,
  mockInvalidateQueries,
  mockFixedReturnReads,
  mockBankWrites
} from '@/tests/mocks'

// The Community Credit store is the contract-backed read hub — mocked so the panel can
// be driven deterministically, mirroring the RoundView/IndexView test convention (see
// communityCreditViews.spec.ts).
const { store } = vi.hoisted(() => {
  const store = {
    isLoading: false,
    isOwner: true,
    rounds: [] as CreditRound[],
    getRound: (id: string): CreditRound | undefined => store.rounds.find((r) => r.id === id)
  }
  return { store }
})

vi.mock('@/stores/communityCredit', () => ({
  useCommunityCreditStore: () => store
}))

import CreditRepayPanel from '../CreditRepayPanel.vue'

function sampleRound(over: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 40000,
    raised: 23400,
    totalRepaid: 0,
    rate: 5,
    period: 90 * MINUTES_PER_DAY,
    termLabel: '90 days',
    status: 'active',
    fundable: false,
    opened: 'Jun 1',
    deadline: 'Jun 28',
    maturity: 'Oct 26',
    restricted: false,
    cap: null,
    desc: 'Working capital.',
    lenders: [],
    ...over
  }
}

function offerStruct(over: Partial<LendingOfferStruct> = {}): LendingOfferStruct {
  return {
    token: USDC_ADDRESS,
    fundingTarget: 40_000_000000n,
    interestRateBps: 500n,
    maturityDate: 1_700_000_000n + BigInt(90 * 86_400),
    subscriptionDeadline: 1_700_000_000n,
    fundingAccess: 0,
    isCapEnabled: false,
    lenderCap: 0n,
    totalFunded: 23_400_000000n,
    totalRepaidByIssuer: 0n,
    state: 0,
    ...over
  }
}

describe('CreditRepayPanel', () => {
  beforeEach(() => {
    store.isLoading = false
    store.isOwner = true
    store.rounds = []
    mockRouterPush.mockClear()
    mockInvalidateQueries.mockClear()
    mockFixedReturnReads.getLendingOffer.data.value = null
    mockFixedReturnReads.offerLenders.data.value = []
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
    setMockRoute({ params: { id: '1' } })
  })

  it('redirects to the list when the round is unknown', async () => {
    setMockRoute({ params: { id: '1', roundId: '99' } })
    mount(CreditRepayPanel)
    await flushPromises()
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'community-credit' })
    )
  })

  it('repays every lender their principal + interest on confirm', async () => {
    store.rounds = [sampleRound()]
    mockFixedReturnReads.getLendingOffer.data.value = offerStruct()
    mockFixedReturnReads.offerLenders.data.value = [
      { address: '0x00000000000000000000000000000000000000a1', principal: 5000, expected: 5250 }
    ]
    setMockRoute({ params: { id: '1', roundId: '1' } })
    const wrapper = mount(CreditRepayPanel)
    await flushPromises()

    expect(wrapper.text()).toContain('Repayment breakdown')
    await wrapper.find('[data-test="confirm-repay"]').trigger('click')
    await flushPromises()

    expect(mockBankWrites.fundFixedReturnRepayment.mutateAsync).toHaveBeenCalledWith({
      args: [1n, 5250_000000n]
    })
    // Regression: `offer` is a separate wagmi-managed read, not covered by the
    // ['fixedReturnAllOffers', …] invalidation above — without an explicit refetch,
    // alreadyRepaid/outstanding would stay stale on a same-session installment repay
    // while the breakdown table's per-lender "Paid so far" (sourced from `round`)
    // updates immediately, showing inconsistent figures on the same page.
    expect(mockFixedReturnReads.getLendingOffer.refetch).toHaveBeenCalled()
  })

  it("shows each lender's paid-so-far share in the breakdown table", async () => {
    store.rounds = [sampleRound({ raised: 5000, totalRepaid: 1000 })]
    mockFixedReturnReads.getLendingOffer.data.value = offerStruct()
    mockFixedReturnReads.offerLenders.data.value = [
      { address: '0x00000000000000000000000000000000000000a1', principal: 5000, expected: 5250 }
    ]
    setMockRoute({ params: { id: '1', roundId: '1' } })
    const wrapper = mount(CreditRepayPanel)
    await flushPromises()

    expect(wrapper.text()).toContain('Paid so far')
    // Sole lender holds 100% of raised, so their share of totalRepaid (1000) is 1000.
    expect(wrapper.text()).toContain('1,000 USDC')
  })

  it('grays out and disables the Repay button once nothing is left outstanding', async () => {
    store.rounds = [sampleRound()]
    mockFixedReturnReads.getLendingOffer.data.value = offerStruct({
      totalRepaidByIssuer: 5_250_000000n
    })
    mockFixedReturnReads.offerLenders.data.value = [
      { address: '0x00000000000000000000000000000000000000a1', principal: 5000, expected: 5250 }
    ]
    setMockRoute({ params: { id: '1', roundId: '1' } })
    const wrapper = mount(CreditRepayPanel)
    await flushPromises()

    expect(wrapper.text()).toContain('0 USDC')
    const button = wrapper.findComponent('[data-test="confirm-repay"]')
    expect(button.props('disabled')).toBe(true)
    expect(button.props('color')).toBe('neutral')
  })

  it('surfaces a repay error when the treasury transaction fails', async () => {
    mockBankWrites.fundFixedReturnRepayment.mutateAsync.mockRejectedValueOnce(new Error('boom'))
    store.rounds = [sampleRound()]
    mockFixedReturnReads.getLendingOffer.data.value = offerStruct()
    mockFixedReturnReads.offerLenders.data.value = [
      { address: '0x00000000000000000000000000000000000000a1', principal: 5000, expected: 5250 }
    ]
    setMockRoute({ params: { id: '1', roundId: '1' } })
    const wrapper = mount(CreditRepayPanel)
    await flushPromises()
    await wrapper.find('[data-test="confirm-repay"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="repay-error"]').exists()).toBe(true)
  })

  it('shows only the breakdown table for a non-owner, with no repay form', async () => {
    store.isOwner = false
    store.rounds = [sampleRound()]
    mockFixedReturnReads.getLendingOffer.data.value = offerStruct()
    mockFixedReturnReads.offerLenders.data.value = [
      { address: '0x00000000000000000000000000000000000000a1', principal: 5000, expected: 5250 }
    ]
    setMockRoute({ params: { id: '1', roundId: '1' } })
    const wrapper = mount(CreditRepayPanel)
    await flushPromises()

    expect(wrapper.text()).toContain('Repayment breakdown')
    expect(wrapper.find('[data-test="confirm-repay"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Outstanding')
  })
})

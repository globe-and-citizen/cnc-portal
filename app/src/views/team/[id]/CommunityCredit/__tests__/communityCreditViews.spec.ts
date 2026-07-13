import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { CreditRound, LendingOfferStruct } from '@/types'
import { USDC_ADDRESS } from '@/constant'

// vue-router is globally mocked (composables.setup.ts); useRouter().push is
// mockRouterPush and useRoute() reads the shared reactive mockRoute.
import {
  mockRouterPush,
  setMockRoute,
  useQueryClientFn,
  mockInvalidateQueries,
  mockFixedReturnReads,
  mockFixedReturnWrites
} from '@/tests/mocks'
import { mockToast } from '@/tests/mocks/store.mock'

// The Community Credit store is the contract-backed read hub. We mock it so the views
// can be driven deterministically; mocking the submodule propagates through the
// `@/stores` barrel (see tests/setup/store.setup.ts convention). The fixedReturn / erc20
// composables the views call directly are already mocked globally.
const { store } = vi.hoisted(() => {
  const store = {
    hasContract: true,
    isLoading: false,
    isError: false,
    isOwner: true,
    isLender: false,
    variant: 'ledger' as const,
    rounds: [] as CreditRound[],
    activeRounds: [] as CreditRound[],
    historyRounds: [] as CreditRound[],
    outstandingPrincipal: 0,
    interestDue: 0,
    raisedLifetime: 0,
    repaidLifetime: 0,
    nextMaturity: '—',
    members: [] as unknown[],
    setVariant: vi.fn(),
    getRound: (id: string): CreditRound | undefined => store.rounds.find((r) => r.id === id)
  }
  return { store }
})

vi.mock('@/stores/communityCredit', () => ({
  useCommunityCreditStore: () => store
}))

import IndexView from '../IndexView.vue'
import RoundView from '../RoundView.vue'
import CreditRoundCard from '@/components/sections/CommunityCreditView/CreditRoundCard.vue'
import CreditLendModal from '@/components/sections/CommunityCreditView/CreditLendModal.vue'

function sampleRound(over: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 40000,
    raised: 23400,
    totalRepaid: 0,
    rate: 5,
    period: 90,
    status: 'open',
    fundable: true,
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

/** A raw on-chain offer, as useFixedReturnGetLendingOffer returns it. Defaults are USDC,
 * Open, with a subscription deadline in the past (so canMarkRefundable holds). */
function offerStruct(over: Partial<LendingOfferStruct> = {}): LendingOfferStruct {
  return {
    token: USDC_ADDRESS,
    fundingTarget: 40_000_000000n,
    interestRateBps: 500n,
    termDuration: 90,
    termUnit: 0,
    startDate: 1_700_000_000n,
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

function resetStore() {
  Object.assign(store, {
    hasContract: true,
    isLoading: false,
    isError: false,
    isOwner: true,
    isLender: false,
    variant: 'ledger',
    rounds: [],
    activeRounds: [],
    historyRounds: [],
    nextMaturity: '—',
    members: []
  })
}

describe('Community Credit views', () => {
  beforeEach(() => {
    resetStore()
    mockRouterPush.mockClear()
    mockInvalidateQueries.mockClear()
    mockFixedReturnReads.getLendingOffer.data.value = null
    mockFixedReturnReads.offerLenders.data.value = []
    mockFixedReturnReads.allOffers.data.value = []
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
    setMockRoute({ params: { id: '1' } })
  })

  describe('IndexView', () => {
    it('shows the no-contract empty state when the team has no Credit Account', () => {
      store.hasContract = false
      const wrapper = mount(IndexView)
      expect(wrapper.find('[data-test="credit-no-contract"]').exists()).toBe(true)
      expect(wrapper.findAllComponents(CreditRoundCard)).toHaveLength(0)
    })

    it('renders a card per active round and the owner new-call button', () => {
      store.activeRounds = [sampleRound(), sampleRound({ id: '2', name: 'Hardware' })]
      const wrapper = mount(IndexView)
      expect(wrapper.findAllComponents(CreditRoundCard)).toHaveLength(2)
      expect(wrapper.find('[data-test="new-credit-call"]').exists()).toBe(true)
    })

    it('shows the loading skeletons while offers load', () => {
      store.isLoading = true
      const wrapper = mount(IndexView)
      expect(wrapper.find('[data-test="credit-rounds-loading"]').exists()).toBe(true)
    })

    it('opens the lend modal and routes from round-card events', async () => {
      store.activeRounds = [sampleRound()]
      const wrapper = mount(IndexView)
      const card = wrapper.findComponent(CreditRoundCard)

      card.vm.$emit('open')
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'community-credit-round' })
      )
      card.vm.$emit('repay')
      expect(store.setVariant).toHaveBeenCalledWith('repay')
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'community-credit-round' })
      )
      card.vm.$emit('lend')
      await nextTick()
      expect(wrapper.findComponent(CreditLendModal).props('round')).not.toBeNull()
    })

    it('shows a hint toast when a non-owner clicks "Lend to a round"', async () => {
      store.isOwner = false
      const wrapper = mount(IndexView)

      expect(wrapper.find('[data-test="new-credit-call"]').exists()).toBe(false)
      await wrapper.find('[data-test="lend-hint-button"]').trigger('click')

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Pick an open round below to lend' })
      )
    })

    it('renders the history table for settled rounds', () => {
      store.historyRounds = [sampleRound({ id: '9', status: 'repaid', repaidOn: 'Apr 10' })]
      const wrapper = mount(IndexView)
      expect(wrapper.find('[data-test="credit-history-table"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('History')
    })

    it('lists a funded round in history too, labeled as awaiting repayment rather than repaid', () => {
      store.historyRounds = [sampleRound({ id: '9', status: 'funded', maturity: 'Oct 26' })]
      const wrapper = mount(IndexView)
      const row = wrapper.find('tbody tr').text()
      expect(row).toContain('Awaiting repayment')
      expect(row).toContain('Oct 26')
      expect(row).not.toContain('Repaid')
    })

    it('lists a stalled round in history labeled as awaiting a refund/accept decision, not Repaid', () => {
      store.historyRounds = [sampleRound({ id: '9', status: 'stalled' })]
      const wrapper = mount(IndexView)
      const row = wrapper.find('tbody tr').text()
      expect(row).toContain('Action needed')
      expect(row).toContain('awaiting refund or acceptance')
      expect(row).not.toContain('Repaid')
    })
  })

  describe('RoundView', () => {
    function mountRound(round: CreditRound, offer: LendingOfferStruct = offerStruct()) {
      store.rounds = [round]
      mockFixedReturnReads.getLendingOffer.data.value = offer
      setMockRoute({ params: { id: '1', roundId: round.id } })
      return mount(RoundView)
    }

    it('redirects to the list when the round is unknown', async () => {
      setMockRoute({ params: { id: '1', roundId: '99' } })
      mount(RoundView)
      await flushPromises()
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'community-credit' })
      )
    })

    it('switches to the Repay layout variant for a round in repayment, same as the switcher pill', async () => {
      store.isOwner = true
      const wrapper = mountRound(sampleRound({ status: 'active' }))
      await flushPromises()
      await wrapper.find('[data-test="round-cta-repay"]').trigger('click')
      expect(store.setVariant).toHaveBeenCalledWith('repay')
    })

    it('lets the owner push refunds to every lender on a stalled round in one step', async () => {
      store.isOwner = true
      const wrapper = mountRound(sampleRound({ status: 'stalled' }), offerStruct({ state: 0 }))
      await flushPromises()
      await wrapper.find('[data-test="round-cta-refundable"]').trigger('click')
      await flushPromises()
      expect(mockFixedReturnWrites.refundLenders.mutateAsync).toHaveBeenCalledWith({
        args: [1n]
      })
    })

    it('lets the owner accept partial funding on a stalled round instead of refunding', async () => {
      store.isOwner = true
      const wrapper = mountRound(
        sampleRound({ status: 'stalled', raised: 23400 }),
        offerStruct({ state: 0 })
      )
      await flushPromises()
      await wrapper.find('[data-test="round-cta-accept-partial"]').trigger('click')
      await flushPromises()
      expect(mockFixedReturnWrites.acceptPartialFunding.mutateAsync).toHaveBeenCalledWith({
        args: [1n]
      })
    })

    it('hides the accept-partial-funding action when nothing was raised', async () => {
      store.isOwner = true
      const wrapper = mountRound(
        sampleRound({ status: 'stalled', raised: 0 }),
        offerStruct({ state: 0, totalFunded: 0n })
      )
      await flushPromises()
      expect(wrapper.find('[data-test="round-cta-accept-partial"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="round-cta-refundable"]').exists()).toBe(true)
    })

    it('does not offer to lend into a stalled round even though it is still Open on-chain', async () => {
      store.isOwner = false
      const wrapper = mountRound(sampleRound({ status: 'stalled' }), offerStruct({ state: 0 }))
      await flushPromises()
      expect(wrapper.find('[data-test="round-cta-lend"]').exists()).toBe(false)
    })

    it('offers Repay as a fourth layout-exploration option, rendering the same panel as the Repay round button', async () => {
      store.isOwner = true
      store.variant = 'repay'
      mockFixedReturnReads.offerLenders.data.value = [
        { address: '0x00000000000000000000000000000000000000a1', principal: 5000, expected: 5250 }
      ]
      const wrapper = mountRound(sampleRound({ status: 'active' }))
      await flushPromises()

      expect(wrapper.find('[data-test="variant-repay"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Repayment breakdown')
      expect(wrapper.text()).toContain('5,250')
      expect(wrapper.find('[data-test="confirm-repay"]').exists()).toBe(true)
    })
  })
})

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
  mockFixedReturnWrites,
  mockBankWrites,
  mockWagmiCore
} from '@/tests/mocks'

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

// NewView persists off-chain metadata through this mutation — stub it so mounting the
// wizard doesn't reach the real query layer.
vi.mock('@/queries/fixedReturnOffering.queries', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCreateFixedReturnOfferingMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: { value: false }
  })
}))

import IndexView from '../IndexView.vue'
import RoundView from '../RoundView.vue'
import RepayView from '../RepayView.vue'
import NewView from '../NewView.vue'
import CreditRoundCard from '@/components/sections/CommunityCreditView/CreditRoundCard.vue'
import CreditLendModal from '@/components/sections/CommunityCreditView/CreditLendModal.vue'

function sampleRound(over: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 40000,
    raised: 23400,
    rate: 5,
    period: 90,
    status: 'open',
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
    mockWagmiCore.readContract.mockReset()
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
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'community-credit-repay' })
      )
      card.vm.$emit('lend')
      await nextTick()
      expect(wrapper.findComponent(CreditLendModal).props('round')).not.toBeNull()
    })

    it('renders the history table for settled rounds', () => {
      store.historyRounds = [sampleRound({ id: '9', status: 'repaid', repaidOn: 'Apr 10' })]
      const wrapper = mount(IndexView)
      expect(wrapper.find('[data-test="credit-history-table"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('History')
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

    it('routes the owner to the repay screen for a round in repayment', async () => {
      store.isOwner = true
      const wrapper = mountRound(sampleRound({ status: 'active' }))
      await flushPromises()
      await wrapper.find('[data-test="round-cta-repay"]').trigger('click')
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'community-credit-repay' })
      )
    })

    it('lets the owner mark an expired open round refundable', async () => {
      store.isOwner = true
      const wrapper = mountRound(sampleRound({ status: 'open' }), offerStruct({ state: 0 }))
      await flushPromises()
      await wrapper.find('[data-test="round-cta-refundable"]').trigger('click')
      await flushPromises()
      expect(mockFixedReturnWrites.markAsRefundable.mutateAsync).toHaveBeenCalledWith({
        args: [1n]
      })
    })

    it('lets a lender claim a refund on a refundable round', async () => {
      store.isOwner = false
      const wrapper = mountRound(sampleRound({ status: 'refundable' }), offerStruct({ state: 2 }))
      await flushPromises()
      await wrapper.find('[data-test="round-cta-claim"]').trigger('click')
      await flushPromises()
      expect(mockFixedReturnWrites.claimRefund.mutateAsync).toHaveBeenCalledWith({ args: [1n] })
    })
  })

  describe('RepayView', () => {
    it('redirects to the list when the round is unknown', async () => {
      setMockRoute({ params: { id: '1', roundId: '99' } })
      mount(RepayView)
      await flushPromises()
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'community-credit' })
      )
    })

    it('repays every lender their principal + interest on confirm', async () => {
      store.rounds = [sampleRound({ id: '1', status: 'active' })]
      mockFixedReturnReads.getLendingOffer.data.value = offerStruct()
      mockFixedReturnReads.offerLenders.data.value = [
        { address: '0x00000000000000000000000000000000000000a1', principal: 5000, expected: 5250 }
      ]
      setMockRoute({ params: { id: '1', roundId: '1' } })
      const wrapper = mount(RepayView)
      await flushPromises()

      expect(wrapper.text()).toContain('Repayment breakdown')
      await wrapper.find('[data-test="confirm-repay"]').trigger('click')
      await flushPromises()

      expect(mockBankWrites.fundFixedReturnRepayment.mutateAsync).toHaveBeenCalledWith({
        args: [1n, 5250_000000n]
      })
    })

    it('surfaces a repay error when the treasury transaction fails', async () => {
      mockBankWrites.fundFixedReturnRepayment.mutateAsync.mockRejectedValueOnce(new Error('boom'))
      store.rounds = [sampleRound({ id: '1', status: 'active' })]
      mockFixedReturnReads.getLendingOffer.data.value = offerStruct()
      mockFixedReturnReads.offerLenders.data.value = [
        { address: '0x00000000000000000000000000000000000000a1', principal: 5000, expected: 5250 }
      ]
      setMockRoute({ params: { id: '1', roundId: '1' } })
      const wrapper = mount(RepayView)
      await flushPromises()
      await wrapper.find('[data-test="confirm-repay"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="repay-error"]').exists()).toBe(true)
    })
  })

  describe('NewView', () => {
    it('renders the credit-call wizard', () => {
      const wrapper = mount(NewView)
      expect(wrapper.text()).toContain('New credit call')
      expect(wrapper.find('[data-test="cc-name"]').exists()).toBe(true)
    })

    it('creates the offer on-chain and returns to the list on publish', async () => {
      mockWagmiCore.readContract.mockResolvedValue(1n) // totalOfferings after create
      const wrapper = mount(NewView)

      // Basics → Terms → Access → Publish
      await wrapper.find('[data-test="cc-next"]').trigger('click')
      await wrapper.find('[data-test="cc-next"]').trigger('click')
      await wrapper.find('[data-test="cc-next"]').trigger('click')
      await flushPromises()

      expect(mockFixedReturnWrites.createLendingOffer.mutateAsync).toHaveBeenCalled()
      expect(mockRouterPush).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'community-credit' })
      )
    })

    it('surfaces an error and stays on the wizard when publishing fails', async () => {
      mockWagmiCore.readContract.mockResolvedValue(1n)
      mockFixedReturnWrites.createLendingOffer.mutateAsync.mockRejectedValueOnce(new Error('boom'))
      const wrapper = mount(NewView)

      await wrapper.find('[data-test="cc-next"]').trigger('click')
      await wrapper.find('[data-test="cc-next"]').trigger('click')
      await wrapper.find('[data-test="cc-next"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="cc-error"]').exists()).toBe(true)
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { CreditRound } from '@/types'

// vue-router is globally mocked (composables.setup.ts); useRouter().push is
// mockRouterPush and useRoute() reads the shared reactive mockRoute.
import {
  mockRouterPush,
  setMockRoute,
  useQueryClientFn,
  mockInvalidateQueries
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
  })

  describe('RoundView', () => {
    it('redirects to the list when the round is unknown', async () => {
      setMockRoute({ params: { id: '1', roundId: '99' } })
      mount(RoundView)
      await flushPromises()
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'community-credit' })
      )
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
  })

  describe('NewView', () => {
    it('renders the credit-call wizard', () => {
      const wrapper = mount(NewView)
      expect(wrapper.text()).toContain('New credit call')
      expect(wrapper.find('[data-test="cc-name"]').exists()).toBe(true)
    })
  })
})

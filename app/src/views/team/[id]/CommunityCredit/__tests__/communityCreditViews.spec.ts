import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

// vue-router is globally mocked (composables.setup.ts); useRouter().push is
// mockRouterPush and useRoute() reads the shared reactive mockRoute. The views
// navigate imperatively and render no <RouterLink>, so this is all we need.
import { mockRouterPush, setMockRoute } from '@/tests/mocks'
import IndexView from '../IndexView.vue'
import RoundView from '../RoundView.vue'
import NewView from '../NewView.vue'
import RepayView from '../RepayView.vue'
import { useCommunityCreditStore } from '@/stores/communityCredit'
import CreditRoundCard from '@/components/sections/CommunityCreditView/CreditRoundCard.vue'
import CreditHistoryTable from '@/components/sections/CommunityCreditView/CreditHistoryTable.vue'
import CreditLendModal from '@/components/sections/CommunityCreditView/CreditLendModal.vue'
import type { CreditRound } from '@/types'

const mockPush = mockRouterPush
const setRoute = (params: Record<string, string>) => setMockRoute({ params })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mountView = (view: any) => mount(view)

describe('Community Credit views', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockClear()
    setRoute({ id: '1' })
  })

  describe('IndexView', () => {
    it('renders the hero figures and both active round cards', () => {
      const wrapper = mountView(IndexView)
      expect(wrapper.text()).toContain('48,400 USDC')
      expect(wrapper.findAllComponents(CreditRoundCard)).toHaveLength(2)
    })

    it('routes from round-card events', async () => {
      const wrapper = mountView(IndexView)
      const card = wrapper.findAllComponents(CreditRoundCard)[0]!

      card.vm.$emit('open')
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'community-credit-round' })
      )
      card.vm.$emit('repay')
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'community-credit-repay' })
      )
      card.vm.$emit('lend')
      await nextTick()
      expect(wrapper.findComponent(CreditLendModal).props('round')).not.toBeNull()
    })

    it('handles history select/continue for drafts and repaid rounds', () => {
      const wrapper = mountView(IndexView)
      const store = useCommunityCreditStore()
      const table = wrapper.findComponent(CreditHistoryTable)

      table.vm.$emit('select', store.getRound('audit') as CreditRound) // draft → new
      expect(mockPush).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'community-credit-new' })
      )
      table.vm.$emit('select', store.getRound('spring') as CreditRound) // repaid → detail
      expect(mockPush).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'community-credit-round' })
      )
      table.vm.$emit('continue', store.getRound('audit') as CreditRound)
      expect(mockPush).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'community-credit-new' })
      )
    })

    it('lends through the modal and updates the store', async () => {
      const wrapper = mountView(IndexView)
      const store = useCommunityCreditStore()
      const before = store.getRound('q3')!.raised
      const openModal = async () => {
        wrapper.findAllComponents(CreditRoundCard)[0]!.vm.$emit('lend')
        await nextTick()
        return wrapper.findComponent(CreditLendModal)
      }

      // Each lend closes the modal, so reopen between emits.
      ;(await openModal()).vm.$emit('lend', 1500)
      await nextTick()
      expect(store.getRound('q3')!.raised).toBe(before + 1500)
      expect(wrapper.findComponent(CreditLendModal).props('round')).toBeNull()
      ;(await openModal()).vm.$emit('lend', 0) // no-op branch, no toast
      await nextTick()
      expect(store.getRound('q3')!.raised).toBe(before + 1500)
    })

    it('switches owner/lender actions but lets the owner lend too', async () => {
      const wrapper = mountView(IndexView)
      const store = useCommunityCreditStore()
      expect(wrapper.find('[data-test="new-credit-call"]').exists()).toBe(true)
      // Owner is a member: the open round card offers BOTH Manage and Lend.
      const ownerCard = wrapper.findAllComponents(CreditRoundCard)[0]!
      expect(ownerCard.find('[data-test="round-cta-open"]').exists()).toBe(true) // Manage
      expect(ownerCard.find('[data-test="round-cta-lend"]').exists()).toBe(true) // Lend

      await wrapper.find('[data-test="role-lender"]').trigger('click')
      expect(store.isLender).toBe(true)
      expect(wrapper.find('[data-test="new-credit-call"]').exists()).toBe(false)
      // A plain lender only gets the Lend action — no Manage.
      const lenderCard = wrapper.findAllComponents(CreditRoundCard)[0]!
      expect(lenderCard.find('[data-test="round-cta-open"]').exists()).toBe(false)
      expect(lenderCard.find('[data-test="round-cta-lend"]').exists()).toBe(true)
    })
  })

  describe('RoundView', () => {
    it('renders each layout variant', () => {
      for (const variant of ['ledger', 'gauge', 'timeline'] as const) {
        setActivePinia(createPinia())
        useCommunityCreditStore().setVariant(variant)
        setRoute({ id: '1', roundId: 'hw' })
        const wrapper = mountView(RoundView)
        expect(wrapper.find('[data-test="credit-layout-switcher"]').exists()).toBe(true)
        expect(wrapper.text()).toContain('Hardware refresh round')
      }
    })

    it('redirects to the list when the round is unknown', () => {
      setRoute({ id: '1', roundId: 'nope' })
      mountView(RoundView)
      expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ name: 'community-credit' }))
    })

    it('owner repay CTA navigates to the repay screen', async () => {
      useCommunityCreditStore().setRole('owner')
      setRoute({ id: '1', roundId: 'hw' })
      const wrapper = mountView(RoundView)
      await wrapper.find('[data-test="round-cta-repay"]').trigger('click')
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'community-credit-repay' })
      )
    })

    it('lets the owner both lend to and edit an open round', async () => {
      useCommunityCreditStore().setRole('owner')
      setRoute({ id: '1', roundId: 'q3' })
      const wrapper = mountView(RoundView)
      // Owner is a member too: an open round offers both actions.
      expect(wrapper.find('[data-test="round-cta-edit"]').exists()).toBe(true)
      await wrapper.find('[data-test="round-cta-lend"]').trigger('click')
      expect(wrapper.findComponent(CreditLendModal).props('round')).not.toBeNull()
    })

    it('lender lend-now CTA opens the modal; view-receipt toasts', async () => {
      useCommunityCreditStore().setRole('lender')
      setRoute({ id: '1', roundId: 'q3' })
      const lendWrapper = mountView(RoundView)
      expect(lendWrapper.find('[data-test="round-cta-edit"]').exists()).toBe(false)
      await lendWrapper.find('[data-test="round-cta-lend"]').trigger('click')
      expect(lendWrapper.findComponent(CreditLendModal).props('round')).not.toBeNull()
      lendWrapper.findComponent(CreditLendModal).vm.$emit('lend', 500)
      await nextTick()

      setActivePinia(createPinia())
      useCommunityCreditStore().setRole('lender')
      setRoute({ id: '1', roundId: 'spring' })
      const receiptWrapper = mountView(RoundView)
      await receiptWrapper.find('[data-test="round-cta-receipt"]').trigger('click')
      expect(receiptWrapper.text()).toContain('Spring infra round')
    })
  })

  describe('NewView', () => {
    it('steps through the wizard and publishes a round', async () => {
      setRoute({ id: '1' })
      const store = useCommunityCreditStore()
      const wrapper = mountView(NewView)
      const before = store.rounds.length

      await wrapper.find('[data-test="cc-name"]').setValue('Q4 ops bridge')
      await wrapper.find('[data-test="cc-back"]').trigger('click') // no-op on step 0
      await wrapper.find('[data-test="cc-next"]').trigger('click') // → Terms
      await wrapper.find('[data-test="cc-back"]').trigger('click') // → Basics
      await wrapper.find('[data-test="cc-next"]').trigger('click') // → Terms
      await wrapper.find('[data-test="cc-next"]').trigger('click') // → Access
      await wrapper.find('[data-test="cc-next"]').trigger('click') // publish

      expect(store.rounds.length).toBe(before + 1)
      expect(store.rounds[0]!.name).toBe('Q4 ops bridge')
      expect(mockPush).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'community-credit' })
      )
    })
  })

  describe('RepayView', () => {
    it('shows the breakdown and repays on confirm', async () => {
      setRoute({ id: '1', roundId: 'hw' })
      const store = useCommunityCreditStore()
      const wrapper = mountView(RepayView)
      expect(wrapper.text()).toContain('Repayment breakdown')

      await wrapper.find('[data-test="confirm-repay"]').trigger('click')
      expect(store.getRound('hw')!.status).toBe('repaid')
      expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ name: 'community-credit' }))
    })

    it('redirects when the round is unknown', () => {
      setRoute({ id: '1', roundId: 'nope' })
      mountView(RepayView)
      expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ name: 'community-credit' }))
    })
  })
})

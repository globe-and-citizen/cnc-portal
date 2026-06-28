import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import LenderMarketplace from '../LenderMarketplace.vue'
import {
  mockFixedReturnReads,
  mockFixedReturnWrites,
  mockERC20Reads,
  mockERC20Writes
} from '@/tests/mocks'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockToast } from '@/tests/mocks/store.mock'
import type { FixedReturnOfferingResponse } from '@/types'

const mockOfferingMetadata = ref<FixedReturnOfferingResponse[]>([])

vi.mock('@/queries', () => ({
  useGetFixedReturnOfferingsQuery: () => ({ data: mockOfferingMetadata })
}))

function generalOffer(offerId: number, overrides: Record<string, unknown> = {}) {
  return {
    offerId,
    decimals: 6,
    offer: {
      token: '0x1111111111111111111111111111111111111111',
      fundingTarget: 100000_000000n,
      interestRateBps: 800n,
      termDuration: 12,
      termUnit: 1,
      startDate: 1893456000n,
      subscriptionDeadline: 1893369600n,
      fundingAccess: 0,
      isCapEnabled: false,
      lenderCap: 0n,
      totalFunded: 30000_000000n,
      totalRepaidByIssuer: 0n,
      state: 0,
      ...overrides
    }
  }
}

describe('LenderMarketplace.vue', () => {
  beforeEach(() => {
    mockFixedReturnReads.allOffers.data.value = []
    mockFixedReturnReads.allOffers.isLoading.value = false
    mockOfferingMetadata.value = []
    useQueryFn.mockReturnValue({ data: ref(new Map()), isLoading: ref(false), error: ref(null) })
  })

  // ApplyOfferingModal teleports to the real document.body regardless of attachTo,
  // and Vue Test Utils doesn't auto-unmount between tests — without this, a modal
  // left open by one test is still in the DOM (and gets clicked) by the next.
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows a loading state while offerings are loading', () => {
    mockFixedReturnReads.allOffers.isLoading.value = true
    const wrapper = mount(LenderMarketplace)
    expect(wrapper.find('[data-test="marketplace-loading"]').exists()).toBe(true)
  })

  it('shows an empty state when there are no open offerings', () => {
    const wrapper = mount(LenderMarketplace)
    expect(wrapper.find('[data-test="marketplace-empty"]').exists()).toBe(true)
  })

  it('only lists offers in the Open state', () => {
    mockFixedReturnReads.allOffers.data.value = [
      generalOffer(1, { state: 0 }),
      generalOffer(2, { state: 1 })
    ]
    const wrapper = mount(LenderMarketplace)

    expect(wrapper.text()).toContain('1 open')
  })

  it('enables Apply to lend for an offer with general access', () => {
    mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { fundingAccess: 0 })]
    const wrapper = mount(LenderMarketplace)

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).toBe('Apply to lend')
  })

  it('disables the button for a whitelist offer with no allocation', () => {
    mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { fundingAccess: 1 })]
    const wrapper = mount(LenderMarketplace)

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Whitelist only')
  })

  it('opens the apply modal when Apply to lend is clicked', async () => {
    mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { fundingAccess: 0 })]
    const wrapper = mount(LenderMarketplace)

    await wrapper.find('button').trigger('click')

    expect(wrapper.findComponent({ name: 'ApplyOfferingModal' }).exists()).toBe(true)
  })

  it('disables the button and shows Cap reached for a General offer already at the cap', () => {
    mockFixedReturnReads.allOffers.data.value = [
      generalOffer(1, { fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n })
    ]
    useQueryFn.mockReturnValue({
      data: ref(new Map([[1, { allocation: 0n, deposited: 5000_000000n }]])),
      isLoading: ref(false),
      error: ref(null)
    })
    const wrapper = mount(LenderMarketplace)

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Cap reached')
  })

  it('shows Cap reached (not Whitelist only) once a whitelisted lender uses their full allocation', () => {
    mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { fundingAccess: 1 })]
    useQueryFn.mockReturnValue({
      data: ref(new Map([[1, { allocation: 3000_000000n, deposited: 3000_000000n }]])),
      isLoading: ref(false),
      error: ref(null)
    })
    const wrapper = mount(LenderMarketplace)

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Cap reached')
  })

  it("shows the lender's already-deposited amount in the Loan amount tile", () => {
    mockFixedReturnReads.allOffers.data.value = [
      generalOffer(1, { fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n })
    ]
    useQueryFn.mockReturnValue({
      data: ref(new Map([[1, { allocation: 0n, deposited: 2000_000000n }]])),
      isLoading: ref(false),
      error: ref(null)
    })
    const wrapper = mount(LenderMarketplace)

    expect(wrapper.text()).toContain('$2,000 of $5,000 cap')
  })

  it('limits the apply amount validation to the remaining room, not the total cap', async () => {
    mockFixedReturnReads.allOffers.data.value = [
      generalOffer(1, { fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n })
    ]
    useQueryFn.mockReturnValue({
      data: ref(new Map([[1, { allocation: 0n, deposited: 3000_000000n }]])),
      isLoading: ref(false),
      error: ref(null)
    })
    const wrapper = mount(LenderMarketplace, { attachTo: document.body })
    await wrapper.find('button').trigger('click')
    const modal = new DOMWrapper(document.body)
    await modal.find('input[type="number"]').setValue(3000)

    expect(modal.text()).toContain('Maximum loan amount is $2,000')
  })

  describe('submitApplication', () => {
    // ApplyOfferingModal teleports to document.body, outside wrapper.element's
    // subtree — attachTo puts the wrapper in the real DOM, and a DOMWrapper around
    // document.body is what can actually find the teleported content.
    async function openModal(amount = 1000) {
      mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { fundingAccess: 0 })]
      const wrapper = mount(LenderMarketplace, { attachTo: document.body })
      await wrapper.find('button').trigger('click')
      const modal = new DOMWrapper(document.body)
      await modal.find('input[type="number"]').setValue(amount)
      return { wrapper, modal }
    }

    it('skips approve and calls lendFunds when allowance is already sufficient', async () => {
      mockERC20Reads.allowance.data.value = 1_000_000_000000n
      const { wrapper, modal } = await openModal(1000)

      await modal.find('[data-test="apply-offering-submit-button"]').trigger('click')
      await flushPromises()

      expect(mockERC20Writes.approve.mutateAsync).not.toHaveBeenCalled()
      expect(mockFixedReturnWrites.lendFunds.mutateAsync).toHaveBeenCalledWith({
        args: [1n, 1000_000000n]
      })
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('You lent'), color: 'success' })
      )
      expect(wrapper.findComponent({ name: 'ApplyOfferingModal' }).exists()).toBe(false)
    })

    it('approves the FixedReturn contract before calling lendFunds when allowance is insufficient', async () => {
      mockERC20Reads.allowance.data.value = 0n
      const { modal } = await openModal(1000)

      await modal.find('[data-test="apply-offering-submit-button"]').trigger('click')
      await flushPromises()

      expect(mockERC20Writes.approve.mutateAsync).toHaveBeenCalledWith({
        args: [expect.anything(), 1000_000000n]
      })
      expect(mockFixedReturnWrites.lendFunds.mutateAsync).toHaveBeenCalledWith({
        args: [1n, 1000_000000n]
      })
    })

    it('shows an inline error and keeps the modal open when lendFunds is rejected', async () => {
      mockERC20Reads.allowance.data.value = 1_000_000_000000n
      mockFixedReturnWrites.lendFunds.mutateAsync.mockRejectedValueOnce(
        new Error('User rejected the request')
      )
      const { wrapper, modal } = await openModal(1000)

      await modal.find('[data-test="apply-offering-submit-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.findComponent({ name: 'ApplyOfferingModal' }).exists()).toBe(true)
      expect(modal.text()).toContain('User rejected the request')
      expect(mockToast.add).not.toHaveBeenCalled()
    })
  })
})

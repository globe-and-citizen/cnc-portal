import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import LenderMarketplace from '../LenderMarketplace.vue'
import { mockFixedReturnReads } from '@/tests/mocks'
import { useQueryFn } from '@/tests/mocks/composables.mock'
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
})

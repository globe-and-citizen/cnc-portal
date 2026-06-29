import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import LenderMarketplace from '../LenderMarketplace.vue'
import { mockFixedReturnReads } from '@/tests/mocks'
import { USDC_ADDRESS } from '@/constant'
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
      token: USDC_ADDRESS,
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
    mockFixedReturnReads.myLenderPositions.data.value = new Map()
    mockOfferingMetadata.value = []
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

  it('does not list an Open offer after its subscription deadline', () => {
    mockFixedReturnReads.allOffers.data.value = [
      generalOffer(1, {
        subscriptionDeadline: BigInt(Math.floor(Date.now() / 1000) - 1)
      })
    ]
    const wrapper = mount(LenderMarketplace)

    expect(wrapper.find('[data-test="marketplace-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="marketplace-apply-button"]').exists()).toBe(false)
  })

  it('enables Apply to lend for an offer with general access', () => {
    mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { fundingAccess: 0 })]
    const wrapper = mount(LenderMarketplace)

    const button = wrapper.find('[data-test="marketplace-apply-button"]')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).toBe('Apply to lend')
    expect(wrapper.find('[data-test="marketplace-offering-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="marketplace-funding-progress"]').exists()).toBe(true)
  })

  it('disables the button for a whitelist offer with no allocation', () => {
    mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { fundingAccess: 1 })]
    const wrapper = mount(LenderMarketplace)

    const button = wrapper.find('[data-test="marketplace-apply-button"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Whitelist only')
  })

  it('opens the apply modal when Apply to lend is clicked', async () => {
    mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { fundingAccess: 0 })]
    const wrapper = mount(LenderMarketplace)

    await wrapper.find('[data-test="marketplace-apply-button"]').trigger('click')

    expect(wrapper.findComponent({ name: 'ApplyOfferingModal' }).exists()).toBe(true)
  })

  it('cleans up the apply modal after its close transition', async () => {
    mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { fundingAccess: 0 })]
    const wrapper = mount(LenderMarketplace)

    await wrapper.find('[data-test="marketplace-apply-button"]').trigger('click')
    await wrapper.find('[data-test="apply-offering-close-button"]').trigger('click')

    expect(wrapper.findComponent({ name: 'ApplyOfferingModal' }).exists()).toBe(false)
  })

  it('disables the button and shows Cap reached for a General offer already at the cap', () => {
    mockFixedReturnReads.allOffers.data.value = [
      generalOffer(1, { fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n })
    ]
    mockFixedReturnReads.myLenderPositions.data.value = new Map([
      [1, { allocation: 0n, deposited: 5000_000000n }]
    ])
    const wrapper = mount(LenderMarketplace)

    const button = wrapper.find('[data-test="marketplace-apply-button"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Cap reached')
  })

  it('shows Cap reached (not Whitelist only) once a whitelisted lender uses their full allocation', () => {
    mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { fundingAccess: 1 })]
    mockFixedReturnReads.myLenderPositions.data.value = new Map([
      [1, { allocation: 3000_000000n, deposited: 3000_000000n }]
    ])
    const wrapper = mount(LenderMarketplace)

    const button = wrapper.find('[data-test="marketplace-apply-button"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Cap reached')
  })

  it("shows the lender's already-deposited amount on its own line, separate from the cap", () => {
    mockFixedReturnReads.allOffers.data.value = [
      generalOffer(1, { fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n })
    ]
    mockFixedReturnReads.myLenderPositions.data.value = new Map([
      [1, { allocation: 0n, deposited: 2000_000000n }]
    ])
    const wrapper = mount(LenderMarketplace)

    expect(wrapper.text()).toContain('5,000 USDC cap')
    expect(wrapper.text()).toContain('Lent 2,000 USDC')
  })

  it('does not show a Lent line when the lender has not deposited anything yet', () => {
    mockFixedReturnReads.allOffers.data.value = [
      generalOffer(1, { fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n })
    ]
    const wrapper = mount(LenderMarketplace)

    expect(wrapper.text()).not.toContain('Lent ')
  })

  it('preserves a fractional deposited amount instead of rounding it', () => {
    mockFixedReturnReads.allOffers.data.value = [
      generalOffer(1, { fundingAccess: 0, isCapEnabled: true, lenderCap: 2_000000n })
    ]
    mockFixedReturnReads.myLenderPositions.data.value = new Map([
      [1, { allocation: 0n, deposited: 500000n }]
    ])
    const wrapper = mount(LenderMarketplace)

    expect(wrapper.text()).toContain('Lent 0.5 USDC')
    expect(wrapper.text()).not.toContain('Lent 1 USDC')
  })

  it('disables lending when the offer-wide funding target has no room left', () => {
    mockFixedReturnReads.allOffers.data.value = [generalOffer(1, { totalFunded: 100000_000000n })]
    const wrapper = mount(LenderMarketplace)

    const button = wrapper.find('[data-test="marketplace-apply-button"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Offering filled')
  })
})

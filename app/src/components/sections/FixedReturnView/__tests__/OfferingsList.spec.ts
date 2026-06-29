import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import OfferingsList from '../OfferingsList.vue'
import { mockFixedReturnReads } from '@/tests/mocks'
import type { FixedReturnOfferingResponse } from '@/types'

const mockOfferingMetadata = ref<FixedReturnOfferingResponse[]>([])

vi.mock('@/queries', () => ({
  useGetFixedReturnOfferingsQuery: () => ({ data: mockOfferingMetadata })
}))

const RAW_OFFER = {
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
  state: 0
}

describe('OfferingsList.vue', () => {
  beforeEach(() => {
    mockFixedReturnReads.allOffers.data.value = []
    mockFixedReturnReads.allOffers.isLoading.value = false
    mockOfferingMetadata.value = []
  })

  it('shows a loading row while offerings are loading', () => {
    mockFixedReturnReads.allOffers.isLoading.value = true
    const wrapper = mount(OfferingsList)

    expect(wrapper.find('[data-test="offerings-loading"]').exists()).toBe(true)
  })

  it('shows an empty state when there are no offerings', () => {
    const wrapper = mount(OfferingsList)
    expect(wrapper.find('[data-test="offerings-empty"]').exists()).toBe(true)
  })

  it('renders a row per offering with a generic title fallback', () => {
    mockFixedReturnReads.allOffers.data.value = [{ offerId: 3, offer: RAW_OFFER, decimals: 6 }]
    const wrapper = mount(OfferingsList)

    const rows = wrapper.findAll('[data-test="offering-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('Offering #3')
  })

  it('uses the off-chain title when metadata is available', () => {
    mockFixedReturnReads.allOffers.data.value = [{ offerId: 3, offer: RAW_OFFER, decimals: 6 }]
    mockOfferingMetadata.value = [
      {
        id: 1,
        teamId: 1,
        offerId: 3,
        title: 'Riverside Note',
        purpose: null,
        createdAt: '',
        updatedAt: ''
      }
    ]
    const wrapper = mount(OfferingsList)

    expect(wrapper.find('[data-test="offering-row"]').text()).toContain('Riverside Note')
  })

  it('emits manage with the offering when its button is clicked', async () => {
    mockFixedReturnReads.allOffers.data.value = [{ offerId: 3, offer: RAW_OFFER, decimals: 6 }]
    const wrapper = mount(OfferingsList)

    await wrapper.find('[data-test="offering-manage-button"]').trigger('click')

    expect(wrapper.emitted('manage')?.[0]?.[0]).toMatchObject({ id: '3' })
  })
})

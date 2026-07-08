import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import OfferingsList from '../OfferingsList.vue'
import { mockFixedReturnReads, mockUserStore } from '@/tests/mocks'
import type { FixedReturnOfferingResponse } from '@/types'

const mockOfferingMetadata = ref<FixedReturnOfferingResponse[]>([])
const OWNER_ADDRESS = '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886'
const NON_OWNER_ADDRESS = '0x0000000000000000000000000000000000000001'

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

function mountList(isOwner: boolean) {
  mockUserStore.address = isOwner ? OWNER_ADDRESS : NON_OWNER_ADDRESS
  return mount(OfferingsList)
}

describe('OfferingsList.vue', () => {
  beforeEach(() => {
    mockFixedReturnReads.allOffers.data.value = []
    mockFixedReturnReads.allOffers.isLoading.value = false
    mockFixedReturnReads.myLenderPositions.data.value = new Map()
    mockFixedReturnReads.owner.data.value = OWNER_ADDRESS
    mockOfferingMetadata.value = []
  })

  it('shows a loading row while offerings are loading', () => {
    mockFixedReturnReads.allOffers.isLoading.value = true
    const wrapper = mountList(true)

    expect(wrapper.find('[data-test="offerings-loading"]').exists()).toBe(true)
  })

  it('shows an empty state when there are no offerings', () => {
    const wrapper = mountList(true)
    expect(wrapper.find('[data-test="offerings-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No offerings yet.')
  })

  it('renders a row per offering with a generic title fallback', () => {
    mockFixedReturnReads.allOffers.data.value = [{ offerId: 3, offer: RAW_OFFER, decimals: 6 }]
    const wrapper = mountList(true)

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
    const wrapper = mountList(true)

    expect(wrapper.find('[data-test="offering-row"]').text()).toContain('Riverside Note')
  })

  it('emits manage with the offering when its button is clicked', async () => {
    mockFixedReturnReads.allOffers.data.value = [{ offerId: 3, offer: RAW_OFFER, decimals: 6 }]
    const wrapper = mountList(true)

    await wrapper.find('[data-test="offering-manage-button"]').trigger('click')

    expect(wrapper.emitted('manage')?.[0]?.[0]).toMatchObject({ id: '3' })
  })

  it('shows only offerings funded by the connected lender when isOwner is false', () => {
    mockFixedReturnReads.allOffers.data.value = [
      { offerId: 1, offer: RAW_OFFER, decimals: 6 },
      { offerId: 2, offer: RAW_OFFER, decimals: 6 }
    ]
    mockFixedReturnReads.myLenderPositions.data.value = new Map([
      [1, { allocation: 0n, deposited: 500000n }],
      [2, { allocation: 0n, deposited: 0n }]
    ])

    const wrapper = mountList(false)

    const rows = wrapper.findAll('[data-test="offering-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('Offering #1')
  })

  it('uses lender-specific empty copy when isOwner is false', () => {
    const wrapper = mountList(false)

    expect(wrapper.text()).toContain("You haven't participated in any offerings yet.")
  })
})

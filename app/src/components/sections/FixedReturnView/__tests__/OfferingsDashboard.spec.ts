import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import OfferingsDashboard from '../OfferingsDashboard.vue'
import { mockFixedReturnReads } from '@/tests/mocks'
import type { FixedReturnOfferingResponse } from '@/types'
import { USDC_ADDRESS } from '@/constant'

const mockOfferingMetadata = ref<FixedReturnOfferingResponse[]>([])

vi.mock('@/queries', () => ({
  useGetFixedReturnOfferingsQuery: () => ({ data: mockOfferingMetadata })
}))

const OfferingsListStub = defineComponent({
  name: 'OfferingsList',
  emits: ['manage'],
  template:
    '<button data-test="select-offering" @click="$emit(\'manage\', { id: \'1\' })">Select</button>'
})

const OfferingDetailStub = defineComponent({
  name: 'OfferingDetail',
  emits: ['back'],
  template: '<div data-test="offering-detail" />'
})

const RAW_OFFER = {
  token: USDC_ADDRESS,
  fundingTarget: 10_000000n,
  interestRateBps: 800n,
  termDuration: 1,
  termUnit: 1,
  startDate: 1893455999n,
  subscriptionDeadline: 1893455999n,
  fundingAccess: 0,
  isCapEnabled: false,
  lenderCap: 0n,
  totalFunded: 5_000000n,
  totalRepaidByIssuer: 0n,
  state: 0
} as const

describe('OfferingsDashboard.vue', () => {
  beforeEach(() => {
    mockFixedReturnReads.allOffers.data.value = [{ offerId: 1, offer: RAW_OFFER, decimals: 6 }]
    mockOfferingMetadata.value = []
  })

  it('opens the selected offering detail', async () => {
    const wrapper = mount(OfferingsDashboard, {
      global: {
        stubs: {
          OfferingsList: OfferingsListStub,
          OfferingDetail: OfferingDetailStub,
          FixedReturnBalanceSection: true,
          GenericTokenHoldingsSection: true
        }
      }
    })

    await wrapper.find('[data-test="select-offering"]').trigger('click')
    expect(wrapper.find('[data-test="offering-detail"]').exists()).toBe(true)
  })
})

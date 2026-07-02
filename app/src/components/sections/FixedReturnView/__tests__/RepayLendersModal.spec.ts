import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RepayLendersModal from '../RepayLendersModal.vue'
import { mockERC20Reads, mockFixedReturnWrites } from '@/tests/mocks'
import { USDC_ADDRESS } from '@/constant'
import type { OfferingSummary } from '@/types'

const ModalStub = {
  name: 'UModal',
  props: ['open'],
  emits: ['update:open'],
  template: '<div v-if="open"><slot name="content" /></div>'
}

const OFFERING: OfferingSummary = {
  id: '1',
  title: 'Riverside Note',
  rate: 8,
  term: 1,
  termUnit: 'months',
  startDate: '2030-01-01',
  access: 'general',
  raised: 100,
  target: 100,
  totalRepaid: 20,
  status: 'funded',
  token: USDC_ADDRESS
}

describe('RepayLendersModal.vue', () => {
  beforeEach(() => {
    mockERC20Reads.balanceOf.data.value = 200_000000n
    mockERC20Reads.allowance.data.value = 200_000000n
  })

  it('submits a repayment amount in token units', async () => {
    const wrapper = mount(RepayLendersModal, {
      props: { open: true, offering: OFFERING },
      global: { stubs: { UModal: ModalStub } }
    })

    expect(wrapper.text()).toContain('Outstanding')
    expect(wrapper.text()).toContain('88 USDC')

    await wrapper.find('[data-test="repay-amount-input"]').setValue(10)
    await wrapper.find('[data-test="repay-confirm-button"]').trigger('click')
    await flushPromises()

    expect(mockFixedReturnWrites.repayLenders.mutateAsync).toHaveBeenCalledWith({
      args: [1n, 10_000000n]
    })
  })
})

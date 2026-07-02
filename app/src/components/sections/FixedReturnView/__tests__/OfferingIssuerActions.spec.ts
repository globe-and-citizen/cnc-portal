import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import OfferingIssuerActions from '../OfferingIssuerActions.vue'
import { USDC_ADDRESS } from '@/constant'
import { mockFixedReturnWrites, mockToast } from '@/tests/mocks'
import type { OfferingSummary } from '@/types'

const RepayLendersModalStub = {
  name: 'RepayLendersModal',
  props: ['open'],
  emits: ['update:open'],
  template: '<div v-if="open" data-test="repay-modal-stub" />'
}

function offering(overrides: Partial<OfferingSummary> = {}): OfferingSummary {
  return {
    id: '1',
    title: 'Riverside Note',
    rate: 8,
    term: 1,
    termUnit: 'months',
    startDate: '2030-01-01',
    access: 'general',
    raised: 10,
    target: 10,
    totalRepaid: 0,
    status: 'open',
    token: USDC_ADDRESS,
    ...overrides
  }
}

describe('OfferingIssuerActions.vue', () => {
  beforeEach(() => {
    mockFixedReturnWrites.markAsRefundable.isPending.value = false
    mockToast.add.mockClear()
  })

  it('marks an open offering as refundable', async () => {
    const wrapper = mount(OfferingIssuerActions, { props: { offering: offering() } })

    await wrapper.find('[data-test="mark-refundable-button"]').trigger('click')

    expect(mockFixedReturnWrites.markAsRefundable.mutate).toHaveBeenCalledWith(
      { args: [1n] },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('shows a success message after marking an offering as refundable', async () => {
    const wrapper = mount(OfferingIssuerActions, { props: { offering: offering() } })

    await wrapper.find('[data-test="mark-refundable-button"]').trigger('click')
    const mutationOptions = mockFixedReturnWrites.markAsRefundable.mutate.mock.calls.at(-1)?.[1]
    expect(mutationOptions).toEqual(expect.objectContaining({ onSuccess: expect.any(Function) }))
    mutationOptions!.onSuccess!()

    expect(mockToast.add).toHaveBeenCalledWith({
      title: 'Offering marked as refundable',
      description: 'Lenders can now claim their principal.',
      color: 'success'
    })
  })

  it('shows a loading state while marking an offering as refundable', () => {
    mockFixedReturnWrites.markAsRefundable.isPending.value = true
    const wrapper = mount(OfferingIssuerActions, { props: { offering: offering() } })

    expect(wrapper.findComponent({ name: 'UButton' }).props('loading')).toBe(true)
  })

  it('opens the repayment modal for a funded offering', async () => {
    const wrapper = mount(OfferingIssuerActions, {
      props: { offering: offering({ status: 'funded' }) },
      global: { stubs: { RepayLendersModal: RepayLendersModalStub } }
    })

    await wrapper.find('[data-test="repay-lenders-button"]').trigger('click')

    expect(wrapper.find('[data-test="repay-modal-stub"]').exists()).toBe(true)
  })
})

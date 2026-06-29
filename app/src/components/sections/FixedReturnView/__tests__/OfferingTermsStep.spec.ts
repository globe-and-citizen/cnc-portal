import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import OfferingTermsStep from '../OfferingTermsStep.vue'
import type { OfferingForm } from '@/types'

function createForm(overrides: Partial<OfferingForm> = {}): OfferingForm {
  return {
    title: 'Test offering',
    purpose: '',
    principal: 100000,
    rate: 8,
    termValue: 12,
    termUnit: 'months',
    startDate: '2026-07-01',
    deadline: '2026-06-30',
    access: 'general',
    capOn: false,
    cap: 0,
    token: 'USDC',
    ...overrides
  }
}

const DEADLINE_ERROR = 'Deadline must be on or before the start date'

describe('OfferingTermsStep.vue', () => {
  it('shows the cross-field deadline error when the deadline is edited past the start date', async () => {
    const form = reactive(createForm())
    const wrapper = mount(OfferingTermsStep, { props: { form } })

    await wrapper.find('[data-test="offering-deadline-input"]').setValue('2026-07-05')
    await flushPromises()

    expect(wrapper.text()).toContain(DEADLINE_ERROR)
  })

  it('clears the deadline error when the start date is edited to fix the mismatch, not just the deadline', async () => {
    const form = reactive(createForm())
    const wrapper = mount(OfferingTermsStep, { props: { form } })

    // Trigger the error via a real input event on the deadline field, same as a user typing.
    await wrapper.find('[data-test="offering-deadline-input"]').setValue('2026-07-05')
    await flushPromises()
    expect(wrapper.text()).toContain(DEADLINE_ERROR)

    // Fix the mismatch via a real input event on startDate — the OTHER field, which
    // the cross-field error isn't directly attached to.
    await wrapper.find('[data-test="offering-start-date-input"]').setValue('2026-07-10')
    await flushPromises()

    expect(wrapper.text()).not.toContain(DEADLINE_ERROR)
  })
})

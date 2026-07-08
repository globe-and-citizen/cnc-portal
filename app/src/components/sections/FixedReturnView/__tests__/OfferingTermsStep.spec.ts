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
    deadline: '2026-06-30',
    access: 'general',
    capOn: false,
    cap: 0,
    token: 'USDC',
    ...overrides
  }
}

describe('OfferingTermsStep.vue', () => {
  it('updates the subscription deadline', async () => {
    const form = reactive(createForm())
    const wrapper = mount(OfferingTermsStep, { props: { form } })

    await wrapper.find('[data-test="offering-deadline-input"]').setValue('2030-07-05')
    await flushPromises()

    expect(form.deadline).toBe('2030-07-05')
  })

  it('shows an error when the deadline is in the past', async () => {
    const form = reactive(createForm())
    const wrapper = mount(OfferingTermsStep, { props: { form } })

    await wrapper.find('[data-test="offering-deadline-input"]').setValue('2020-01-01')
    await flushPromises()

    expect(wrapper.text()).toContain('Subscription deadline cannot be in the past')
  })
})

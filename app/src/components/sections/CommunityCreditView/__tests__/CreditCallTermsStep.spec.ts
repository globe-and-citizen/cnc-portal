import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CreditCallTermsStep from '../CreditCallTermsStep.vue'
import type { CreditCallForm } from '@/types'

function makeForm(overrides: Partial<CreditCallForm> = {}): CreditCallForm {
  return reactive({
    name: '',
    desc: '',
    target: '25000',
    token: 'USDC',
    rate: '6',
    period: 90,
    periodMode: 'preset',
    periodVal: '90',
    periodUnit: 'days',
    deadline: '2026-07-31',
    access: 'everyone',
    whitelist: {},
    capOn: false,
    cap: '10000',
    ...overrides
  })
}

function mountStep(form: CreditCallForm) {
  return mount(CreditCallTermsStep, { props: { form } })
}

describe('CreditCallTermsStep', () => {
  it('selects a preset term and stays in preset mode', async () => {
    const form = makeForm()
    const wrapper = mountStep(form)
    await wrapper.find('[data-test="cc-term-30"]').trigger('click')
    expect(form.period).toBe(30)
    expect(form.periodMode).toBe('preset')
    // The custom inputs are hidden in preset mode.
    expect(wrapper.find('[data-test="cc-term-value"]').exists()).toBe(false)
  })

  it('reveals the value + unit inputs when switching to custom', async () => {
    const form = makeForm()
    const wrapper = mountStep(form)
    await wrapper.find('[data-test="cc-term-custom"]').trigger('click')
    expect(form.periodMode).toBe('custom')
    expect(form.periodVal).toBe('90') // seeded from the current period
    expect(wrapper.find('[data-test="cc-term-value"]').exists()).toBe(true)
  })

  it('converts a custom value + unit into whole days', async () => {
    const form = makeForm({ periodMode: 'custom', periodVal: '6' })
    const wrapper = mountStep(form)
    await wrapper.find('[data-test="cc-unit-months"]').trigger('click')
    expect(form.periodUnit).toBe('months')
    expect(form.period).toBe(180) // 6 * 30
  })

  it('shows a friendly term label in the preview for non-day units', async () => {
    const form = makeForm({
      periodMode: 'custom',
      periodVal: '6',
      periodUnit: 'months',
      period: 180
    })
    const wrapper = mountStep(form)
    expect(wrapper.text()).toContain('6 months (180 days)')
  })

  it('weeks and years convert correctly', async () => {
    const form = makeForm({ periodMode: 'custom', periodVal: '2' })
    const wrapper = mountStep(form)
    await wrapper.find('[data-test="cc-unit-weeks"]').trigger('click')
    expect(form.period).toBe(14)
    await wrapper.find('[data-test="cc-unit-years"]').trigger('click')
    expect(form.period).toBe(730)
  })
})

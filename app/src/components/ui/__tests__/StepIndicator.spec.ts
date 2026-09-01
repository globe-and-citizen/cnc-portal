import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StepIndicator from '@/components/ui/StepIndicator.vue'

const steps = ['Basics', 'Terms', 'Access']

describe('StepIndicator.vue', () => {
  it('renders one step per label with the correct text', () => {
    const wrapper = mount(StepIndicator, { props: { steps, current: 1 } })
    const items = wrapper.findAll('[data-test="step-indicator"]')

    expect(items).toHaveLength(steps.length)
    steps.forEach((label, i) => {
      expect(items[i]?.text()).toContain(label)
    })
  })

  it('shows a check icon for every completed step, and the step number otherwise', () => {
    const wrapper = mount(StepIndicator, { props: { steps, current: 1 } })
    const items = wrapper.findAll('[data-test="step-indicator"]')

    // Step 0 is before `current` (1) — completed, so it renders a check icon, no "1".
    expect(items[0]?.find('[data-icon="heroicons:check"]').exists()).toBe(true)
    expect(items[0]?.text()).not.toContain('1')

    // Step 1 is `current` — shown as its 1-indexed number, not a check.
    expect(items[1]?.find('[data-icon="heroicons:check"]').exists()).toBe(false)
    expect(items[1]?.text()).toContain('2')

    // Step 2 is after `current` — also its number, not a check.
    expect(items[2]?.find('[data-icon="heroicons:check"]').exists()).toBe(false)
    expect(items[2]?.text()).toContain('3')
  })

  it('shows no check icon when current is the first step', () => {
    const wrapper = mount(StepIndicator, { props: { steps, current: 0 } })
    expect(wrapper.find('[data-icon="heroicons:check"]').exists()).toBe(false)
  })

  it('shows a check icon for every step before the last when current is the last step', () => {
    const wrapper = mount(StepIndicator, { props: { steps, current: steps.length - 1 } })
    const items = wrapper.findAll('[data-test="step-indicator"]')

    items.slice(0, -1).forEach((item) => {
      expect(item.find('[data-icon="heroicons:check"]').exists()).toBe(true)
    })
    expect(items.at(-1)?.find('[data-icon="heroicons:check"]').exists()).toBe(false)
  })
})

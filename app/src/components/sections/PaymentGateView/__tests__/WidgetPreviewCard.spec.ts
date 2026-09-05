import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WidgetPreviewCard from '../WidgetPreviewCard.vue'

describe('WidgetPreviewCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render a preview-outcome toggle', () => {
    const wrapper = mount(WidgetPreviewCard, { props: { selectedToken: 'USDC' } })

    expect(wrapper.find('[data-test="payment-gate-preview-outcome-toggle"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Preview outcome on Pay')
  })

  it('shows the configured amount and facture ID before paying', () => {
    const wrapper = mount(WidgetPreviewCard, { props: { selectedToken: 'USDC' } })

    expect(wrapper.text()).toContain('order_8842')
    expect(wrapper.get('[data-test="cnc-pay-widget-pay-button"]').exists()).toBe(true)
  })

  it('walks through the simulated payment on a timer and always lands on success', async () => {
    const wrapper = mount(WidgetPreviewCard, { props: { selectedToken: 'USDC' } })

    await wrapper.get('[data-test="cnc-pay-widget-pay-button"]').trigger('click')

    // Pay button is gone the instant the simulated "paying" pane takes over.
    expect(wrapper.find('[data-test="cnc-pay-widget-pay-button"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Waiting for confirmation')

    await vi.advanceTimersByTimeAsync(1500)

    expect(wrapper.text()).toContain('Payment captured')
    expect(wrapper.text()).toContain('order_8842')
    expect(wrapper.text()).toContain('0x4f2a')
  })
})

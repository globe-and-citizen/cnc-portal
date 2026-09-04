import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import IntegrationCard from '../IntegrationCard.vue'
import { mockTeamStore } from '@/tests/mocks/store.mock'

describe('IntegrationCard', () => {
  it('shows a "no Bank contract" alert instead of a snippet when the team has no Bank yet', () => {
    mockTeamStore.getContractAddressByType = vi.fn(() => undefined)
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDC' } })

    expect(wrapper.find('[data-test="payment-gate-no-bank-alert"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Embed snippet')
  })

  it('shows a "not available" alert instead of a snippet when the widget URL is unconfigured', async () => {
    vi.resetModules()
    vi.doMock('@/constant', async (importOriginal) => {
      const actual: object = await importOriginal()
      return { ...actual, WIDGET_SCRIPT_URL: '' }
    })
    const { default: IntegrationCardNoUrl } = await import('../IntegrationCard.vue')
    const wrapper = mount(IntegrationCardNoUrl, { props: { selectedToken: 'USDC' } })

    expect(wrapper.find('[data-test="payment-gate-no-widget-url-alert"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Embed snippet')
    vi.doUnmock('@/constant')
  })

  it('shows the Bank address and embed snippet when properly configured', () => {
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDC' } })

    expect(wrapper.find('[data-test="payment-gate-no-bank-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="payment-gate-no-widget-url-alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Embed snippet')
    expect(wrapper.text()).toContain('data-token')
  })
})

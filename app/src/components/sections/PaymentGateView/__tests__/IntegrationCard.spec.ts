import { describe, expect, it, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockTeamStore } from '@/tests/mocks/store.mock'

// `IntegrationCard.vue` reads `WIDGET_SCRIPT_URL` at module load — mocking it
// explicitly per test (rather than relying on whatever `VITE_APP_WIDGET_URL`
// happens to be set to in the ambient .env) keeps these tests deterministic
// across environments, instead of only passing wherever that env var happens
// to already be set.
async function loadIntegrationCard(widgetScriptUrl: string) {
  vi.resetModules()
  vi.doMock('@/constant', async (importOriginal) => {
    const actual: object = await importOriginal()
    return { ...actual, WIDGET_SCRIPT_URL: widgetScriptUrl }
  })
  const { default: IntegrationCard } = await import('../IntegrationCard.vue')
  return IntegrationCard
}

describe('IntegrationCard', () => {
  afterEach(() => {
    vi.doUnmock('@/constant')
  })

  it('shows a "no Bank contract" alert instead of a snippet when the team has no Bank yet', async () => {
    mockTeamStore.getContractAddressByType = vi.fn(() => undefined)
    const IntegrationCard = await loadIntegrationCard('https://widget.example/widget.js')
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDC' } })

    expect(wrapper.find('[data-test="payment-gate-no-bank-alert"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Embed snippet')
  })

  it('shows a "not available" alert instead of a snippet when the widget URL is unconfigured', async () => {
    const IntegrationCard = await loadIntegrationCard('')
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDC' } })

    expect(wrapper.find('[data-test="payment-gate-no-widget-url-alert"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Embed snippet')
  })

  it('shows the Bank address and embed snippet when properly configured', async () => {
    const IntegrationCard = await loadIntegrationCard('https://widget.example/widget.js')
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDC' } })

    expect(wrapper.find('[data-test="payment-gate-no-bank-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="payment-gate-no-widget-url-alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Embed snippet')
    expect(wrapper.text()).toContain('data-token')
  })
})

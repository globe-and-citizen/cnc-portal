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

const BANK_ADDRESS = '0x000000000000000000000000000000000000bA4c'

describe('IntegrationCard', () => {
  afterEach(() => {
    vi.doUnmock('@/constant')
    vi.unstubAllGlobals()
  })

  it('[AC-US-PAYGATE-002-04] shows a "no Bank contract" alert instead of a snippet when the team has no Bank yet', async () => {
    mockTeamStore.getContractAddressByType = vi.fn(() => undefined)
    const IntegrationCard = await loadIntegrationCard('https://widget.example/widget.js')
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDC' } })

    expect(wrapper.find('[data-test="payment-gate-no-bank-alert"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Embed snippet')
  })

  it('[AC-US-PAYGATE-002-05] shows a "not available" alert instead of a snippet when the widget URL is unconfigured', async () => {
    const IntegrationCard = await loadIntegrationCard('')
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDC' } })

    expect(wrapper.find('[data-test="payment-gate-no-widget-url-alert"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Embed snippet')
  })

  it('[AC-US-PAYGATE-002-02] shows the Bank address and embed snippet when properly configured', async () => {
    const IntegrationCard = await loadIntegrationCard('https://widget.example/widget.js')
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDC' } })

    expect(wrapper.find('[data-test="payment-gate-no-bank-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="payment-gate-no-widget-url-alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Embed snippet')
    expect(wrapper.text()).toContain('data-token')
  })
  it('[AC-US-PAYGATE-002-06] defaults to the HTML snippet and switches to the selected framework', async () => {
    mockTeamStore.getContractAddressByType = vi.fn(() => BANK_ADDRESS)
    const IntegrationCard = await loadIntegrationCard('https://widget.example/widget.js')
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDCe' } })
    const snippet = () => wrapper.find('[data-test="payment-gate-snippet"]').text()
    const languageButtons = wrapper.findAll('[data-test="payment-gate-snippet-languages"] button')

    expect(languageButtons.map((button) => button.text())).toEqual([
      'HTML / JavaScript',
      'Vue 3',
      'React'
    ])
    expect(snippet()).toContain(`data-bank="${BANK_ADDRESS}" data-token="USDCe"`)

    await languageButtons[1].trigger('click')
    expect(snippet()).toContain('<script setup lang="ts">')
    expect(snippet()).toContain(`script.setAttribute('data-bank', '${BANK_ADDRESS}')`)

    await languageButtons[2].trigger('click')
    expect(snippet()).toContain('useEffect(')
    expect(snippet()).toContain("script.setAttribute('data-token', 'USDCe')")
  })

  it('[AC-US-PAYGATE-002-06] copies the snippet for the currently selected framework', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    mockTeamStore.getContractAddressByType = vi.fn(() => BANK_ADDRESS)
    const IntegrationCard = await loadIntegrationCard('https://widget.example/widget.js')
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDC' } })

    await wrapper.findAll('[data-test="payment-gate-snippet-languages"] button')[2].trigger('click')
    const copyButton = wrapper.findAll('button').find((button) => button.text() === 'Copy snippet')
    await copyButton!.trigger('click')

    expect(writeText).toHaveBeenCalledWith(
      wrapper.find('[data-test="payment-gate-snippet"]').text()
    )
    expect(writeText.mock.calls[0][0]).toContain('useEffect(')
  })
})

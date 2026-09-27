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
    const part = (key: 'setup' | 'usage') =>
      wrapper.find(`[data-test="payment-gate-snippet-${key}"]`).text()
    const filename = () => wrapper.find('[data-test="payment-gate-snippet-setup-filename"]')
    const languageButtons = wrapper.findAll('[data-test="payment-gate-snippet-languages"] button')

    expect(languageButtons.map((button) => button.text())).toEqual([
      'HTML / JavaScript',
      'Vue 3',
      'React'
    ])
    expect(part('setup')).toContain(`data-bank="${BANK_ADDRESS}" data-token="USDCe"`)
    expect(part('usage')).toContain('CncPay.setFactureId(factureId)')
    expect(filename().exists()).toBe(false)
    expect(wrapper.text()).toContain('Step 1 · Add the widget to your page')
    expect(wrapper.text()).toContain('Step 2 · Start a payment')

    await languageButtons[1].trigger('click')
    expect(filename().text()).toBe('CncPayCheckout.vue')
    expect(wrapper.text()).toContain('Step 1 · Create the component')
    expect(wrapper.text()).toContain('Step 2 · Use it in your checkout')
    expect(part('setup')).toContain(`script.setAttribute('data-bank', '${BANK_ADDRESS}')`)
    expect(part('usage')).toContain(':facture-id="factureId"')

    await languageButtons[2].trigger('click')
    expect(filename().text()).toBe('CncPayCheckout.tsx')
    expect(part('setup')).toContain("script.setAttribute('data-token', 'USDCe')")
    expect(part('usage')).toContain('factureId={factureId}')
  })

  it('[AC-US-PAYGATE-002-06] copies each part of the selected framework separately', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    mockTeamStore.getContractAddressByType = vi.fn(() => BANK_ADDRESS)
    const IntegrationCard = await loadIntegrationCard('https://widget.example/widget.js')
    const wrapper = mount(IntegrationCard, { props: { selectedToken: 'USDC' } })

    await wrapper.findAll('[data-test="payment-gate-snippet-languages"] button')[2].trigger('click')
    await wrapper.find('[data-test="payment-gate-snippet-setup-copy"]').trigger('click')
    await wrapper.find('[data-test="payment-gate-snippet-usage-copy"]').trigger('click')

    expect(writeText).toHaveBeenNthCalledWith(
      1,
      wrapper.find('[data-test="payment-gate-snippet-setup"]').text()
    )
    expect(writeText).toHaveBeenNthCalledWith(
      2,
      wrapper.find('[data-test="payment-gate-snippet-usage"]').text()
    )
    expect(writeText.mock.calls[0][0]).toContain('useEffect(')
    expect(writeText.mock.calls[1][0]).toContain('<CncPayCheckout factureId={factureId}')
  })
})

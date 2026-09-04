import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// `main.ts` reads its config off the widget's own <script data-bank> tag and
// assigns `window.CncPay` as a side effect of being imported — so each case
// needs a fresh module instance with its own DOM state set up beforehand.
async function loadWidget(scriptAttrs: Record<string, string>) {
  document.body.innerHTML = ''
  const script = document.createElement('script')
  for (const [name, value] of Object.entries(scriptAttrs)) script.dataset[name] = value
  document.body.appendChild(script)

  const mount = document.createElement('div')
  document.body.appendChild(mount)

  vi.resetModules()
  await import('../main')
  return { mount }
}

describe('widget main', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('logs a console error and renders a fallback card when data-bank/data-token are missing', async () => {
    const { mount } = await loadWidget({})

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[CNC Pay] missing data-bank/data-token on the widget <script> tag'
    )

    window.CncPay.setFactureId('order_1')
    window.CncPay.setAmount('10.00')
    window.CncPay.show(mount)

    expect(mount.shadowRoot?.textContent).toContain('Payment unavailable')
  })

  it('renders the real payment card when the script tag is configured', async () => {
    const { mount } = await loadWidget({
      bank: '0x1111111111111111111111111111111111111111',
      token: 'USDC'
    })

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      '[CNC Pay] missing data-bank/data-token on the widget <script> tag'
    )

    window.CncPay.setFactureId('order_1')
    window.CncPay.setAmount('10.00')
    window.CncPay.show(mount)

    expect(mount.shadowRoot?.textContent).not.toContain('Payment unavailable')
    expect(mount.shadowRoot?.textContent).toContain('CNC Pay')
  })

  it('logs a console error instead of throwing when the show() target is not found', async () => {
    await loadWidget({
      bank: '0x1111111111111111111111111111111111111111',
      token: 'USDC'
    })

    window.CncPay.setFactureId('order_1')
    window.CncPay.setAmount('10.00')

    expect(() => window.CncPay.show('#does-not-exist')).not.toThrow()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[CNC Pay] show() target not found:',
      '#does-not-exist'
    )
  })
})

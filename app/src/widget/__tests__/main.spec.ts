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

  it('names only data-token when data-bank is present but data-token is missing', async () => {
    await loadWidget({ bank: '0x1111111111111111111111111111111111111111' })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[CNC Pay] missing data-token on the widget <script> tag'
    )
  })

  it('names only data-bank when data-token is present but data-bank is missing', async () => {
    await loadWidget({ token: 'USDC' })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[CNC Pay] missing data-bank on the widget <script> tag'
    )
  })

  it('logs a console error and renders a fallback card when data-bank is not a valid address', async () => {
    const { mount } = await loadWidget({ bank: '0x…', token: 'USDC' })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[CNC Pay] data-bank "0x…" isn\'t a valid 0x-prefixed 40-hex-character address'
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

  it.each(['abc', '-5', '', '1.2.3', 'NaN'])(
    'throws synchronously from setAmount for an invalid amount %s',
    async (amount) => {
      await loadWidget({
        bank: '0x1111111111111111111111111111111111111111',
        token: 'USDC'
      })

      expect(() => window.CncPay.setAmount(amount)).toThrow(
        `[CNC Pay] Invalid amount ${JSON.stringify(amount)} — must be a non-negative decimal number, e.g. "10.50".`
      )
    }
  )

  it('accepts a valid decimal amount from setAmount', async () => {
    await loadWidget({
      bank: '0x1111111111111111111111111111111111111111',
      token: 'USDC'
    })

    expect(() => window.CncPay.setAmount('10.50')).not.toThrow()
    expect(() => window.CncPay.setAmount('0')).not.toThrow()
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

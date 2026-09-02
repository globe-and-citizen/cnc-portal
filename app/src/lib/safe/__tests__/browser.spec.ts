import { afterEach, describe, expect, it, vi } from 'vitest'
import { openSafeAppUrl, randomSaltNonce } from '../browser'

describe('Safe browser helpers', () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    })
  })

  it('returns distinct 32-byte salt nonces', () => {
    const first = randomSaltNonce()
    const second = randomSaltNonce()

    expect(first).toMatch(/^0x[0-9a-f]{64}$/)
    expect(first).not.toBe(second)
  })

  it('opens a Safe URL in a new tab', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    openSafeAppUrl('https://app.safe.global/home?safe=polygon:0xABC')

    expect(openSpy).toHaveBeenCalledWith(
      'https://app.safe.global/home?safe=polygon:0xABC',
      '_blank',
      'noopener,noreferrer'
    )
  })
})

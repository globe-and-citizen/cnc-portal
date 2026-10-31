import { afterEach, describe, expect, it, vi } from 'vitest'
import { getInjectedProvider, openSafeAppUrl, randomSaltNonce } from '../browser'

describe('Safe browser helpers', () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    })
  })

  it('[AC-US-AUTH-004-07] checks a cached SDK provider again before each transaction request', async () => {
    let chainId = '0x7a69'
    const request = vi.fn(async (args: { method: string }) =>
      args.method === 'eth_chainId' ? chainId : '0xhash'
    )
    vi.stubGlobal('ethereum', { request })
    const provider = getInjectedProvider()

    await expect(provider.request({ method: 'eth_sendTransaction', params: [] })).resolves.toBe(
      '0xhash'
    )
    chainId = '0x1'
    request.mockClear()

    await expect(provider.request({ method: 'eth_sendTransaction', params: [] })).rejects.toThrow(
      'not connected to the requested chain'
    )
    expect(request).toHaveBeenCalledExactlyOnceWith({ method: 'eth_chainId' })
  })

  it('allows read requests while the SDK wallet is on another network', async () => {
    const request = vi.fn().mockResolvedValue('0xcode')
    vi.stubGlobal('ethereum', { request })
    await getInjectedProvider().request({ method: 'eth_getCode', params: [] })
    expect(request).toHaveBeenCalledExactlyOnceWith({ method: 'eth_getCode', params: [] })
  })

  it('rejects SDK signing on another network without prompting the wallet', async () => {
    const request = vi.fn().mockResolvedValue('0x1')
    vi.stubGlobal('ethereum', { request })
    await expect(
      getInjectedProvider().request({ method: 'eth_signTypedData_v4', params: [] })
    ).rejects.toThrow('not connected to the requested chain')
    expect(request).toHaveBeenCalledExactlyOnceWith({ method: 'eth_chainId' })
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

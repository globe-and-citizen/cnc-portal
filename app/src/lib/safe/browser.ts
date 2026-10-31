import type { Eip1193Provider } from '@safe-global/protocol-kit'
import { assertConfiguredChain } from '@/lib/walletNetwork'

const walletWriteMethods = new Set([
  'eth_sendTransaction',
  'wallet_sendTransaction',
  'eth_sendRawTransaction',
  'eth_signTransaction',
  'eth_sign',
  'personal_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4'
])

export function getInjectedProvider(): Eip1193Provider {
  // @ts-expect-error - TypeScript may not recognize window.ethereum as Eip1193Provider
  const provider = (globalThis.window as Window & typeof globalThis)?.ethereum

  if (!provider) {
    throw new Error('No injected Ethereum provider found')
  }

  if (typeof (provider as { request?: unknown }).request !== 'function') {
    throw new Error('Injected provider does not implement EIP-1193 request method')
  }

  const injected = provider as Eip1193Provider
  // Cached SDK instances keep this boundary: check at the request, not at SDK creation.
  return new Proxy(injected, {
    get(target, key) {
      if (key === 'request') {
        return async (args: Parameters<Eip1193Provider['request']>[0]) => {
          if (walletWriteMethods.has(args.method)) {
            assertConfiguredChain(await target.request({ method: 'eth_chainId' }))
          }
          return target.request(args)
        }
      }
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    }
  })
}

export function randomSaltNonce(): string {
  return `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`
}

export function openSafeAppUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

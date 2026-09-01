import type { Eip1193Provider } from '@safe-global/protocol-kit'

export function getInjectedProvider(): Eip1193Provider {
  // @ts-expect-error - TypeScript may not recognize window.ethereum as Eip1193Provider
  const provider = (globalThis.window as Window & typeof globalThis)?.ethereum

  if (!provider) {
    throw new Error('No injected Ethereum provider found')
  }

  if (typeof (provider as { request?: unknown }).request !== 'function') {
    throw new Error('Injected provider does not implement EIP-1193 request method')
  }

  return provider as Eip1193Provider
}

export function randomSaltNonce(): string {
  return `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`
}

export function openSafeAppUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

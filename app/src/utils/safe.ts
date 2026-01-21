import type { Eip1193Provider } from '@safe-global/protocol-kit'
import type { Address } from 'viem'
import { CHAIN_NAMES } from '@/types/safe'

/**
 * Get injected EIP-1193 provider with proper type checking
 */
export function getInjectedProvider(): Eip1193Provider {
  const provider = (globalThis.window as Window & typeof globalThis)?.ethereum

  if (!provider) {
    throw new Error('No injected Ethereum provider found')
  }

  // Type guard to ensure provider implements EIP-1193
  if (typeof (provider as { request?: unknown }).request !== 'function') {
    throw new Error('Injected provider does not implement EIP-1193 request method')
  }

  return provider as Eip1193Provider
}

/**
 * Generate random salt nonce for Safe deployment
 */
export function randomSaltNonce(): string {
  return `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`
}

/**
 * Generate Safe app URLs (move from useSafeAppUrls composable)
 */
export function getSafeHomeUrl(chainId: number, safeAddress: Address): string {
  const chainName = CHAIN_NAMES[chainId] || 'ethereum'
  return `https://app.safe.global/home?safe=${chainName}:${safeAddress}`
}

export function getSafeSettingsUrl(chainId: number, safeAddress: string): string {
  const chainName = CHAIN_NAMES[chainId] || 'ethereum'
  return `https://app.safe.global/settings/setup?safe=${chainName}:${safeAddress}`
}

export function openSafeAppUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Safe-related TypeScript interfaces and types
 */

export interface SafeFiatTotal {
  value: number
  formated: string
  id: string
  code: string
  symbol: string
  price: number
  formatedPrice: string
}

export interface SafeInfo {
  address: string
  chain: string
  balance: string
  symbol: string
  totals?: Record<string, SafeFiatTotal>
  owners: string[]
  threshold: number
}

export interface SafeBalanceItem {
  tokenAddress: string | null
  token?: {
    symbol?: string | null
    decimals?: number | null
  } | null
  balance: string
}

export interface SafeDetails {
  owners: string[]
  threshold: number
}

export interface SafeChainConfig {
  chain: string
  url: string
  nativeSymbol: string
}

export interface SafeAppUrls {
  home: string
  settings: string
}

/**
 * Safe Transaction Service URLs by chain (shared for reads and writes)
 */
export const TX_SERVICE_BY_CHAIN: Record<number, SafeChainConfig> = {
  137: {
    chain: 'polygon',
    url: 'https://safe-transaction-polygon.safe.global',
    nativeSymbol: 'POL'
  },
  11155111: {
    chain: 'sepolia',
    url: 'https://safe-transaction-sepolia.safe.global',
    nativeSymbol: 'ETH'
  },
  80002: {
    chain: 'amoy',
    url: 'https://safe-transaction-amoy.safe.global',
    nativeSymbol: 'MATIC'
  },
  42161: {
    chain: 'arbitrum',
    url: 'https://safe-transaction-arbitrum.safe.global',
    nativeSymbol: 'ETH'
  }
}

/**
 * Safe chain names for building Safe App URLs
 */
export const CHAIN_NAMES: Record<number, string> = {
  137: 'polygon',
  11155111: 'sepolia',
  80002: 'amoy',
  42161: 'arbitrum'
}

/**
 * Safe-related TypeScript interfaces and types
 */

export interface SafeInfo {
  address: string
  chain: string
  balance: string
  symbol: string
  totals?: Record<
    string,
    {
      value: number
      formated: string
      id: string
      code: string
      symbol: string
      price: number
      formatedPrice: string
    }
  >
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


import sepolia from '@/artifacts/deployed_addresses/chain-11155111.json'
import hardhat from '@/artifacts/deployed_addresses/chain-31337.json'
import polygon from '@/artifacts/deployed_addresses/chain-137.json'
import amoy from '@/artifacts/deployed_addresses/chain-80002.json'
import { isAddress, zeroAddress, type Address } from 'viem'

interface TokenAddresses {
  USDC: Address
  USDT: Address
}

type ChainTokenAddresses = {
  [key in 137 | 11155111 | 31337 | 80002]: TokenAddresses
}

interface AddressMapping {
  'MockTokens#USDT'?: Address
  'MockTokens#USDC'?: Address
  'FeeCollectorModule#FeeCollector': Address
}

const addressesMap: Record<number, AddressMapping> = {
  11155111: sepolia as AddressMapping,
  31337: hardhat as AddressMapping,
  80002: amoy as AddressMapping,
  137: polygon as AddressMapping
}

// Helper to get chain ID from Nuxt runtime config
export function getChainId(): number {
  // This will be available in both client and server
  if (import.meta.client || import.meta.server) {
    try {
      const config = useRuntimeConfig()
      return parseInt(config.public.chainId, 10)
    } catch {
      // Fallback during build time when useRuntimeConfig is not available
      return 137
    }
  }
  return 137
}

// Helper to get addresses for a specific chain
export function getAddressesForChain(targetChainId: number): AddressMapping {
  return addressesMap[targetChainId] || ({} as AddressMapping)
}

interface AddressValidationError extends Error {
  missingAddresses: string[]
}

export function resolveAddress(key: keyof AddressMapping, targetChainId?: number): Address {
  const chainId = targetChainId || getChainId()
  const chainAddresses = getAddressesForChain(chainId)
  const address = chainAddresses[key]

  if (!address || typeof address !== 'string' || address.trim() === '') {
    throw new Error(`Address not defined for "${key}" on chain ${chainId}`)
  }

  if (isAddress(address) === false) {
    throw new Error(`Invalid address format for "${key}": ${address}`)
  }

  return address as Address
}

// Safe version that returns null instead of throwing
export function safeResolveAddress(key: keyof AddressMapping, targetChainId?: number): Address | null {
  try {
    const chainId = targetChainId || getChainId()
    const chainAddresses = getAddressesForChain(chainId)
    const address = chainAddresses[key]

    if (!address || typeof address !== 'string' || address.trim() === '') {
      console.warn(`Address not defined for "${key}" on chain ${chainId}`)
      return null
    }

    if (isAddress(address) === false) {
      console.warn(`Invalid address format for "${key}": ${address}`)
      return null
    }

    return address as Address
  } catch (error) {
    console.warn(`Failed to resolve address for "${key}":`, error)
    return null
  }
}

// Safe version with fallback value
export function resolveAddressWithFallback(
  key: keyof AddressMapping,
  fallback: Address = zeroAddress,
  targetChainId?: number
): Address {
  return safeResolveAddress(key, targetChainId) ?? fallback
}

// Token addresses for different networks (Polygon Mainnet and Amoy Testnet)
export const TOKEN_ADDRESSES: Pick<ChainTokenAddresses, 137 | 80002> = {
  137: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon USDC
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // Polygon USDT
  },
  80002: {
    USDC: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // Amoy USDC
    USDT: '0x83Ef79413e0DC985035bA0C49B0abD0dA62987eD' // Amoy USDT
  }
}

// Helper functions to get token addresses for a specific chain
export const getUSDCAddress = (targetChainId?: number): Address => {
  const chain = targetChainId || getChainId()

  if (chain === 11155111 || chain === 31337) {
    return safeResolveAddress('MockTokens#USDC', chain) || (zeroAddress as Address)
  }
  return TOKEN_ADDRESSES[chain as keyof typeof TOKEN_ADDRESSES]?.USDC || zeroAddress
}

export const getUSDTAddress = (targetChainId?: number): Address => {
  const chain = targetChainId || getChainId()

  if (chain === 11155111 || chain === 31337) {
    return safeResolveAddress('MockTokens#USDT', chain) || (zeroAddress as Address)
  }
  return TOKEN_ADDRESSES[chain as keyof typeof TOKEN_ADDRESSES]?.USDT || zeroAddress
}

// Export token addresses for current chain (runtime)
export const USDC_ADDRESS = getUSDCAddress()
export const USDT_ADDRESS = getUSDTAddress()
export const FEE_COLLECTOR_ADDRESS = safeResolveAddress('FeeCollectorModule#FeeCollector')

// Supported Tokens for FeeCollector
export const FEE_COLLECTOR_SUPPORTED_TOKENS = [USDC_ADDRESS, USDT_ADDRESS] as const

// Log configuration info
if (import.meta.client) {
  console.log('Runtime chain ID:', getChainId())
  console.log('Fee Collector Address:', FEE_COLLECTOR_ADDRESS)
  console.log('Supported token addresses:', FEE_COLLECTOR_SUPPORTED_TOKENS)
}

// Token Configuration
export const TOKEN_DECIMALS = {
  USDC: 6,
  USDT: 6
} as const

export const TOKEN_SYMBOLS: Record<Address, string> = {
  [USDC_ADDRESS]: 'USDC',
  [USDT_ADDRESS]: 'USDT'
}

export function validateAddresses(targetChainId?: number) {
  const chainId = targetChainId || getChainId()
  const requiredKeys: (keyof AddressMapping)[] = ['FeeCollectorModule#FeeCollector']
  const missingAddresses = new Set<string>()

  requiredKeys.forEach((key) => {
    try {
      resolveAddress(key, chainId)
    } catch (error) {
      missingAddresses.add(key)
      console.error(error)
    }
  })

  if (missingAddresses.size > 0) {
    const error = new Error(
      `The following addresses are not defined in the current network configuration (chainId: ${chainId}):\n${Array.from(missingAddresses).join('\n')}`
    ) as AddressValidationError
    error.missingAddresses = Array.from(missingAddresses)
    throw error
  }
}

// Validate on client only
if (import.meta.client) {
  try {
    validateAddresses()
  } catch (error) {
    console.error('Address validation failed:', error)
  }
}

// Helper to get backend URL from runtime config
export function getBackendUrl(): string {
  if (import.meta.client || import.meta.server) {
    try {
      const config = useRuntimeConfig()
      return config.public.backendUrl
    } catch {
      return 'http://localhost:3000'
    }
  }
  return 'http://localhost:3000'
}

export const BACKEND_URL = getBackendUrl()

// GraphQL poll interval for transaction queries (in milliseconds)
export const GRAPHQL_POLL_INTERVAL = 12000

// Map currency symbols to CoinGecko IDs
const NETWORK_TO_COIN_ID: Record<string, string> = {
  POL: 'polygon-ecosystem-token',
  ETH: 'ethereum',
  AMOYPOL: 'polygon-ecosystem-token',
  SepoliaETH: 'ethereum',
  GO: 'ethereum'
}

export type TokenId = 'native' | 'usdc' | 'usdt'

export interface TokenConfig {
  id: TokenId
  name: string
  symbol: string
  coingeckoId: string
  decimals: number
  address: Address
  code: string
  shortAddress: string
}

// Helper to build supported tokens for a specific chain
export function getSupportedTokens(nativeSymbol: string, targetChainId?: number): TokenConfig[] {
  const usdcAddress = getUSDCAddress(targetChainId)
  const usdtAddress = getUSDTAddress(targetChainId)

  return [
    {
      id: 'native',
      name: nativeSymbol,
      symbol: nativeSymbol,
      code: nativeSymbol,
      coingeckoId: NETWORK_TO_COIN_ID[nativeSymbol] ?? 'ethereum',
      decimals: 18,
      address: zeroAddress,
      shortAddress: 'Native Token'
    },
    {
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      code: 'USDC',
      coingeckoId: 'usd-coin',
      decimals: 6,
      address: usdcAddress,
      shortAddress: `${usdcAddress.slice(0, 6)}...${usdcAddress.slice(-4)}`
    },
    {
      id: 'usdt',
      name: 'Tether USD',
      symbol: 'USDT',
      code: 'USDT',
      coingeckoId: 'tether',
      decimals: 6,
      address: usdtAddress,
      shortAddress: `${usdtAddress.slice(0, 6)}...${usdtAddress.slice(-4)}`
    }
  ]
}

// Runtime default supported tokens (uses runtime config)
export const SUPPORTED_TOKENS = getSupportedTokens('GO') // Uses GO for hardhat default

export interface Currency {
  code: string
  name: string
  symbol: string
}

export const LIST_CURRENCIES: Currency[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€'
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$'
  },
  {
    code: 'IDR',
    name: 'Indonesian Rupiah',
    symbol: 'Rp'
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹'
  }
]

// Default pagination
export const DEFAULT_PAGE_SIZE = 10
export const DEFAULT_PAGE = 1

// Transaction settings
export const DEFAULT_GAS_LIMIT = 300000n
export const MAX_APPROVAL_AMOUNT = 2n ** 256n - 1n // Max uint256

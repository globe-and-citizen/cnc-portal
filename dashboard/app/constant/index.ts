import { getNetwork } from './network'
import sepolia from '../artifacts/deployed_addresses/chain-11155111.json'
import hardhat from '../artifacts/deployed_addresses/chain-31337.json'
import polygon from '../artifacts/deployed_addresses/chain-137.json'
import amoy from '../artifacts/deployed_addresses/chain-80002.json'
import { isAddress, zeroAddress, type Address } from 'viem'

export const NETWORK = getNetwork()

console.log('🔍 Network Configuration:', NETWORK)
console.log('🔍 Chain ID (string):', NETWORK.chainId)

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

// FIX: Parse as decimal, not hexadecimal
const chainId = parseInt(NETWORK.chainId, 10) // Changed from 16 to 10
const addresses = addressesMap[chainId] || ({} as AddressMapping)

interface AddressValidationError extends Error {
  missingAddresses: string[]
}

const missingAddresses = new Set<string>()

export function resolveAddress(key: keyof AddressMapping): Address {
  const address = addresses[key]

  if (!address || typeof address !== 'string' || address.trim() === '') {
    throw new Error(`Address not defined for "${key}" on chain ${chainId}`)
  }

  if (isAddress(address) === false) {
    throw new Error(`Invalid address format for "${key}": ${address}`)
  }

  return address as Address
}

// Safe version that returns null instead of throwing
export function safeResolveAddress(key: keyof AddressMapping): Address | null {
  try {
    const address = addresses[key]

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
  fallback: Address = zeroAddress
): Address {
  return safeResolveAddress(key) ?? fallback
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

// Export token addresses for current network
const currentChainId = parseInt(NETWORK.chainId, 10) as keyof ChainTokenAddresses // Changed from 16 to 10

const getUSDCAddress = (): Address => {
  if (currentChainId === 11155111 || currentChainId === 31337) {
    return safeResolveAddress('MockTokens#USDC') || (zeroAddress as Address)
  }
  return TOKEN_ADDRESSES[currentChainId]?.USDC || zeroAddress
}

const getUSDTAddress = (): Address => {
  if (currentChainId === 11155111 || currentChainId === 31337) {
    return safeResolveAddress('MockTokens#USDT') || (zeroAddress as Address)
  }
  return TOKEN_ADDRESSES[currentChainId]?.USDT || zeroAddress
}

export const USDC_ADDRESS = getUSDCAddress()
export const USDT_ADDRESS = getUSDTAddress()
export const FEE_COLLECTOR_ADDRESS = safeResolveAddress('FeeCollectorModule#FeeCollector')

// Supported Tokens for FeeCollector
export const FEE_COLLECTOR_SUPPORTED_TOKENS = [USDC_ADDRESS, USDT_ADDRESS] as const

console.log('the supported tokens addresses are: ==', FEE_COLLECTOR_SUPPORTED_TOKENS)
// Token Configuration
export const TOKEN_DECIMALS = {
  USDC: 6,
  USDT: 6
} as const

export const TOKEN_SYMBOLS: Record<Address, string> = {
  [USDC_ADDRESS]: 'USDC',
  [USDT_ADDRESS]: 'USDT'
}

export function validateAddresses() {
  const requiredKeys: (keyof AddressMapping)[] = ['FeeCollectorModule#FeeCollector']

  requiredKeys.forEach(resolveAddress)

  if (missingAddresses.size > 0) {
    const error = new Error(
      `The following addresses are not defined in the current network configuration (chainId: ${chainId}):\n${Array.from(missingAddresses).join('\n')}`
    ) as AddressValidationError
    error.missingAddresses = Array.from(missingAddresses)
    missingAddresses.clear()
    throw error
  }
}

try {
  validateAddresses()
} catch (error) {
  console.error(error)
}

export const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL

// GraphQL poll interval for transaction queries (in milliseconds)
export const GRAPHQL_POLL_INTERVAL = 12000

const NETWORK_TO_COIN_ID: Record<string, string> = {
  POL: 'matic-network',
  ETH: 'ethereum',
  AMOYPOL: 'matic-network',
  SepoliaETH: 'ethereum',
  GO: 'ethereum'
}

export type TokenId = 'native' | 'usdc' | 'usdt'

export const SUPPORTED_TOKENS: TokenConfig[] = [
  {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    code: 'USDC',
    coingeckoId: 'usd-coin',
    decimals: 6,
    address: USDC_ADDRESS
  },
  {
    id: 'usdt',
    name: 'Tether USD',
    symbol: 'USDT',
    code: 'USDT',
    coingeckoId: 'tether',
    decimals: 6,
    address: USDT_ADDRESS
  },
  {
    id: 'native',
    name: NETWORK.currencySymbol,
    symbol: NETWORK.currencySymbol,
    code: NETWORK.currencySymbol,
    coingeckoId: NETWORK_TO_COIN_ID[NETWORK.currencySymbol] ?? '',
    decimals: 18,
    address: zeroAddress
  }
]

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

export interface TokenConfig {
  id: TokenId
  name: string
  symbol: string
  coingeckoId: string
  decimals: number
  address: Address
  code: string
}

// Default pagination
export const DEFAULT_PAGE_SIZE = 10
export const DEFAULT_PAGE = 1

// Transaction settings
export const DEFAULT_GAS_LIMIT = 300000n
export const MAX_APPROVAL_AMOUNT = 2n ** 256n - 1n // Max uint256

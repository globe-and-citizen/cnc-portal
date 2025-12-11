import { getNetwork } from './network'
import sepolia from '@/artifacts/deployed_addresses/chain-11155111.json'
import hardhat from '@/artifacts/deployed_addresses/chain-31337.json'
import polygon from '@/artifacts/deployed_addresses/chain-137.json'
import amoy from '@/artifacts/deployed_addresses/chain-80002.json'
import { isAddress, zeroAddress, type Address } from 'viem'

export const NETWORK = getNetwork()

interface TokenAddresses {
  USDC: Address
  USDT: Address
}

type ChainTokenAddresses = {
  [key in 137 | 11155111 | 31337 | 80002]: TokenAddresses
}

interface AddressMapping {
  'BankBeaconModule#Beacon': string
  'BankBeaconModule#Bank': string
  'ProposalBeaconModule#Beacon'?: string
  'ProposalBeaconModule#Proposals'?: string
  'BoardOfDirectorsModule#Beacon': string
  'BoardOfDirectorsModule#BoardOfDirectors': string
  'Officer#Officer'?: string
  'Officer#FactoryBeacon'?: string
  'ExpenseAccountEIP712Module#ExpenseAccountEIP712'?: string
  'ExpenseAccountEIP712Module#FactoryBeacon'?: string
  'CashRemunerationEIP712Module#FactoryBeacon': string
  'CashRemunerationEIP712Module#CashRemunerationEIP712': string
  'InvestorsV1BeaconModule#Beacon'?: string
  'InvestorsV1BeaconModule#InvestorV1'?: string
  'VestingModule#Vesting'?: string
  'MockTokens#USDT'?: string
  'MockTokens#USDC'?: string
  'ElectionsBeaconModule#Elections'?: string
  'ElectionsBeaconModule#Beacon'?: string
}

const addressesMap: Record<number, AddressMapping> = {
  11155111: sepolia as AddressMapping,
  31337: hardhat as AddressMapping,
  80002: amoy as AddressMapping,
  137: polygon as AddressMapping
}

const chainId = parseInt(NETWORK.chainId, 16)
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
// Token addresses for different networks
export const TOKEN_ADDRESSES: Pick<ChainTokenAddresses, 137 | 80002> = {
  // Polygon Mainnet
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
const currentChainId = parseInt(NETWORK.chainId, 16) as keyof ChainTokenAddresses
const getUSDCAddress = () => {
  if (currentChainId === 11155111 || currentChainId === 31337) {
    return safeResolveAddress('MockTokens#USDC') || ('' as Address)
  }
  return TOKEN_ADDRESSES[currentChainId]?.USDC || ''
}
const getUSDTAddress = () => {
  if (currentChainId === 11155111 || currentChainId === 31337) {
    return safeResolveAddress('MockTokens#USDT') || ('' as Address)
  }
  return TOKEN_ADDRESSES[currentChainId]?.USDT || ''
}

export const USDC_ADDRESS = getUSDCAddress()
export const USDT_ADDRESS = getUSDTAddress()

export function validateAddresses() {
  const requiredKeys: (keyof AddressMapping)[] = [
    'VestingModule#Vesting',
    'BankBeaconModule#Beacon',
    'BankBeaconModule#Bank',
    'ElectionsBeaconModule#Beacon',
    'ElectionsBeaconModule#Elections',
    'ProposalBeaconModule#Beacon',
    'ProposalBeaconModule#Proposals',
    'BoardOfDirectorsModule#Beacon',
    'BoardOfDirectorsModule#BoardOfDirectors',
    'Officer#Officer',
    'Officer#FactoryBeacon',
    'ExpenseAccountEIP712Module#ExpenseAccountEIP712',
    'ExpenseAccountEIP712Module#FactoryBeacon',
    'InvestorsV1BeaconModule#Beacon',
    'InvestorsV1BeaconModule#InvestorV1',
    'CashRemunerationEIP712Module#FactoryBeacon',
    'CashRemunerationEIP712Module#CashRemunerationEIP712'
  ]

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

export const VESTING_ADDRESS = safeResolveAddress('VestingModule#Vesting')
export const BANK_BEACON_ADDRESS = safeResolveAddress('BankBeaconModule#Beacon')
export const BANK_IMPL_ADDRESS = safeResolveAddress('BankBeaconModule#Bank')

export const ELECTIONS_BEACON_ADDRESS = safeResolveAddress('ElectionsBeaconModule#Beacon')
export const ELECTIONS_IMPL_ADDRESS = safeResolveAddress('ElectionsBeaconModule#Elections')
export const PROPOSALS_BEACON_ADDRESS = safeResolveAddress('ProposalBeaconModule#Beacon')
export const PROPOSALS_IMPL_ADDRESS = safeResolveAddress('ProposalBeaconModule#Proposals')
export const BOD_BEACON_ADDRESS = safeResolveAddress('BoardOfDirectorsModule#Beacon')
export const BOD_IMPL_ADDRESS = safeResolveAddress('BoardOfDirectorsModule#BoardOfDirectors')
export const EXPENSE_ACCOUNT_EIP712_IMPL_ADDRESS = safeResolveAddress(
  'ExpenseAccountEIP712Module#ExpenseAccountEIP712'
)
export const EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS = safeResolveAddress(
  'ExpenseAccountEIP712Module#FactoryBeacon'
)
export const CASH_REMUNERATION_EIP712_IMPL_ADDRESS = safeResolveAddress(
  'CashRemunerationEIP712Module#CashRemunerationEIP712'
)
export const CASH_REMUNERATION_EIP712_BEACON_ADDRESS = safeResolveAddress(
  'CashRemunerationEIP712Module#FactoryBeacon'
)
export const OFFICER_ADDRESS = safeResolveAddress('Officer#Officer')
export const OFFICER_BEACON = safeResolveAddress('Officer#FactoryBeacon')
export const INVESTOR_V1_BEACON_ADDRESS = safeResolveAddress('InvestorsV1BeaconModule#Beacon')
export const INVESTOR_V1_IMPL_ADDRESS = safeResolveAddress('InvestorsV1BeaconModule#InvestorV1')

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

export type TokenId = 'native' | 'usdc' | 'usdt' | 'sher' // Add more token IDs as needed

export const SUPPORTED_TOKENS: TokenConfig[] = [
  {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    code: 'USDC',
    coingeckoId: 'usd-coin',
    decimals: 6,
    address: USDC_ADDRESS as Address
  },
  {
    id: 'native',
    name: NETWORK.currencySymbol,
    symbol: NETWORK.currencySymbol,
    code: NETWORK.currencySymbol,
    coingeckoId: NETWORK_TO_COIN_ID[NETWORK.currencySymbol] ?? 'unknown',
    decimals: 18,
    address: zeroAddress
  }
  // Add more tokens here
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

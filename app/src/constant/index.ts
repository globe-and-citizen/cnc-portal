import { getNetwork } from './network'
import sepolia from '@/artifacts/deployed_addresses/chain-11155111.json'
import hardhat from '@/artifacts/deployed_addresses/chain-31337.json'
import polygon from '@/artifacts/deployed_addresses/chain-137.json'
import amoy from '@/artifacts/deployed_addresses/chain-80002.json'
import { zeroAddress, type Address } from 'viem'

export const NETWORK = getNetwork()

interface TokenAddresses {
  USDC: string
  USDT: string
}

type ChainTokenAddresses = {
  [key in 137 | 11155111 | 31337 | 80002]: TokenAddresses
}

interface AddressMapping {
  'TipsModule#Tips': string
  'BankBeaconModule#Beacon': string
  'BankBeaconModule#Bank': string
  'VotingBeaconModule#Beacon': string
  'VotingBeaconModule#Voting': string
  'BoardOfDirectorsModule#Beacon': string
  'BoardOfDirectorsModule#BoardOfDirectors': string
  'ExpenseAccountModule#ExpenseAccount'?: string
  'ExpenseAccountModule#FactoryBeacon'?: string
  'Officer#Officer'?: string
  'Officer#FactoryBeacon'?: string
  'ExpenseAccountEIP712Module#ExpenseAccountEIP712'?: string
  'ExpenseAccountEIP712Module#FactoryBeacon'?: string
  'CashRemunerationEIP712Module#FactoryBeacon': string
  'CashRemunerationEIP712Module#CashRemunerationEIP712': string
  'InvestorsV1BeaconModule#Beacon'?: string
  'InvestorsV1BeaconModule#InvestorV1'?: string
  'MockTokens#USDT'?: string
  'MockTokens#USDC'?: string
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

export function resolveAddress(key: keyof AddressMapping): string {
  const address = addresses[key]
  if (!address && key !== 'MockTokens#USDT' && key !== 'MockTokens#USDC') {
    missingAddresses.add(key)
    return ''
  }
  return address ?? ''
}
// Token addresses for different networks
export const TOKEN_ADDRESSES: ChainTokenAddresses = {
  // Polygon Mainnet
  137: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon USDC
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // Polygon USDT
  },
  // Sepolia Testnet
  11155111: {
    USDC: resolveAddress('MockTokens#USDC'), // Mock contracts deployed on Sepolia
    USDT: resolveAddress('MockTokens#USDT') // Mock contracts deployed on Sepolia
  },
  80002: {
    USDC: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // Amoy USDC
    USDT: '0x83Ef79413e0DC985035bA0C49B0abD0dA62987eD' // Amoy USDT
  },
  // Hardhat Local - only resolve mock addresses for local chain
  31337:
    chainId === 31337
      ? {
          USDC: resolveAddress('MockTokens#USDC'), // Placeholder for local testing
          USDT: resolveAddress('MockTokens#USDT') // Placeholder for local testing
        }
      : {
          USDC: '',
          USDT: ''
        }
}

export function validateAddresses() {
  const requiredKeys: (keyof AddressMapping)[] = [
    'TipsModule#Tips',
    'BankBeaconModule#Beacon',
    'BankBeaconModule#Bank',
    'VotingBeaconModule#Beacon',
    'VotingBeaconModule#Voting',
    'BoardOfDirectorsModule#Beacon',
    'BoardOfDirectorsModule#BoardOfDirectors',
    'Officer#Officer',
    'Officer#FactoryBeacon',
    'ExpenseAccountModule#FactoryBeacon',
    'ExpenseAccountModule#ExpenseAccount',
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
export const TIPS_ADDRESS = resolveAddress('TipsModule#Tips')
export const BANK_BEACON_ADDRESS = resolveAddress('BankBeaconModule#Beacon')
export const BANK_IMPL_ADDRESS = resolveAddress('BankBeaconModule#Bank')
export const VOTING_BEACON_ADDRESS = resolveAddress('VotingBeaconModule#Beacon')
export const VOTING_IMPL_ADDRESS = resolveAddress('VotingBeaconModule#Voting')
export const BOD_BEACON_ADDRESS = resolveAddress('BoardOfDirectorsModule#Beacon')
export const BOD_IMPL_ADDRESS = resolveAddress('BoardOfDirectorsModule#BoardOfDirectors')
export const EXPENSE_ACCOUNT_BEACON_ADDRESS = resolveAddress('ExpenseAccountModule#FactoryBeacon')
export const EXPENSE_ACCOUNT_LOGIC_ADDRESS = resolveAddress('ExpenseAccountModule#ExpenseAccount')
export const EXPENSE_ACCOUNT_EIP712_IMPL_ADDRESS = resolveAddress(
  'ExpenseAccountEIP712Module#ExpenseAccountEIP712'
)
export const EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS = resolveAddress(
  'ExpenseAccountEIP712Module#FactoryBeacon'
)
export const CASH_REMUNERATION_EIP712_IMPL_ADDRESS = resolveAddress(
  'CashRemunerationEIP712Module#CashRemunerationEIP712'
)
export const CASH_REMUNERATION_EIP712_BEACON_ADDRESS = resolveAddress(
  'CashRemunerationEIP712Module#FactoryBeacon'
)
export const OFFICER_ADDRESS = resolveAddress('Officer#Officer')
export const OFFICER_BEACON = resolveAddress('Officer#FactoryBeacon')
export const INVESTOR_V1_BEACON_ADDRESS = resolveAddress('InvestorsV1BeaconModule#Beacon')
export const INVESTOR_V1_IMPL_ADDRESS = resolveAddress('InvestorsV1BeaconModule#InvestorV1')

export const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL

// GraphQL poll interval for transaction queries (in milliseconds)
export const GRAPHQL_POLL_INTERVAL = 12000

// Export token addresses for current network
const currentChainId = parseInt(NETWORK.chainId, 16) as keyof ChainTokenAddresses
export const USDC_ADDRESS = TOKEN_ADDRESSES[currentChainId]?.USDC || ''
export const USDT_ADDRESS = TOKEN_ADDRESSES[currentChainId]?.USDT || ''

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
    id: 'native',
    name: NETWORK.currencySymbol,
    symbol: NETWORK.currencySymbol,
    code: NETWORK.currencySymbol,
    coingeckoId: NETWORK_TO_COIN_ID[NETWORK.currencySymbol],
    decimals: 18,
    address: zeroAddress
  },
  {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    code: 'USDC',
    coingeckoId: 'usd-coin',
    decimals: 6,
    address: USDC_ADDRESS as Address
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

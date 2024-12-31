import { getNetwork } from './network'
import sepolia from '@/artifacts/deployed_addresses/chain-11155111.json'
import hardhat from '@/artifacts/deployed_addresses/chain-31337.json'
import polygon from '@/artifacts/deployed_addresses/chain-137.json'

export const NETWORK = getNetwork()

interface TokenAddresses {
  USDC: string
  USDT: string
}

type ChainTokenAddresses = {
  [key in 137 | 11155111 | 31337]: TokenAddresses
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
  if (!address) {
    missingAddresses.add(key)
    return ''
  }
  return address
}
// Token addresses for different networks
export const TOKEN_ADDRESSES: ChainTokenAddresses = {
  // Polygon Mainnet
  137: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon USDC
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // Polygon USDT
  },
  // Sepolia Testnet
  11155111: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06' // Sepolia USDT
  },
  // Hardhat Local
  31337: {
    USDC: resolveAddress('MockTokens#USDC'), // Placeholder for local testing
    USDT: resolveAddress('MockTokens#USDT') // Placeholder for local testing
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

// Export token addresses for current network
const currentChainId = parseInt(NETWORK.chainId, 16) as keyof ChainTokenAddresses
export const USDC_ADDRESS = TOKEN_ADDRESSES[currentChainId]?.USDC || ''
export const USDT_ADDRESS = TOKEN_ADDRESSES[currentChainId]?.USDT || ''

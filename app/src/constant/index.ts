import { getNetwork } from './network'
import sepolia from '@/artifacts/deployed_addresses/chain-11155111.json'
import hardhat from '@/artifacts/deployed_addresses/chain-31337.json'
import { log } from '@/utils'
import polygon from '@/artifacts/deployed_addresses/chain-137.json'

export const NETWORK = getNetwork()
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
}

const addressesMap: Record<number, AddressMapping> = {
  11155111: sepolia as AddressMapping,
  31337: hardhat as AddressMapping,
  137: polygon as AddressMapping
}

const chainId = parseInt(NETWORK.chainId, 16)
const addresses = addressesMap[chainId] || ({} as AddressMapping)

function resolveAddress(key: keyof AddressMapping) {
  const address = addresses[key]
  if (!address) {
    log.error(`Address for ${key} is not defined in the current network configuration.`)
  }
  return address
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
    'ExpenseAccountEIP712Module#FactoryBeacon'
  ]

  for (const key of requiredKeys) {
    if (!addresses[key]) {
      throw new Error(`Address for ${key} is not defined in the current network configuration.`)
    }
  }
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
export const OFFICER_ADDRESS = resolveAddress('Officer#Officer')
export const OFFICER_BEACON = resolveAddress('Officer#FactoryBeacon')

export const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL

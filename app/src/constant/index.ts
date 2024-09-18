import { getNetwork } from './network'
import sepolia from '@/artifacts/deployed_addresses/chain-11155111.json'
import hardhat from '@/artifacts/deployed_addresses/chain-31337.json'
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
}

const addressesMap: Record<number, AddressMapping> = {
  11155111: sepolia as AddressMapping,
  31337: hardhat as AddressMapping,
  137: polygon as AddressMapping
}

const chainId = parseInt(NETWORK.chainId, 16)
const addresses = addressesMap[chainId] || ({} as AddressMapping)

export const TIPS_ADDRESS = addresses['TipsModule#Tips'] || ''
export const BANK_BEACON_ADDRESS = addresses['BankBeaconModule#Beacon'] || ''
export const BANK_IMPL_ADDRESS = addresses['BankBeaconModule#Bank'] || ''
export const VOTING_BEACON_ADDRESS = addresses['VotingBeaconModule#Beacon'] || ''
export const VOTING_IMPL_ADDRESS = addresses['VotingBeaconModule#Voting'] || ''
export const BOD_BEACON_ADDRESS = addresses['BoardOfDirectorsModule#Beacon'] || ''
export const BOD_IMPL_ADDRESS = addresses['BoardOfDirectorsModule#BoardOfDirectors'] || ''
export const EXPENSE_ACCOUNT_BEACON_ADDRESS = addresses['ExpenseAccountModule#FactoryBeacon'] || ''
export const EXPENSE_ACCOUNT_LOGIC_ADDRESS = addresses['ExpenseAccountModule#ExpenseAccount'] || ''

export const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL

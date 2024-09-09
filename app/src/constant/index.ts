import { getNetwork } from './network'
import sepolia from '@/artifacts/deployed_addresses/chain-11155111.json'

export const NETWORK = getNetwork()
let TIPS_ADDRESS = ''
let BANK_BEACON_ADDRESS = ''
let BANK_IMPL_ADDRESS = ''
let VOTING_BEACON_ADDRESS = ''
let VOTING_IMPL_ADDRESS = ''
let BOD_BEACON_ADDRESS = ''
let BOD_IMPL_ADDRESS = ''
if (parseInt(NETWORK.chainId, 16) == 11155111) {
  TIPS_ADDRESS = sepolia['TipsModule#Tips']
  BANK_BEACON_ADDRESS = sepolia['BankBeaconModule#Beacon']
  BANK_IMPL_ADDRESS = sepolia['BankBeaconModule#Bank']
  VOTING_BEACON_ADDRESS = sepolia['VotingBeaconModule#Beacon']
  VOTING_IMPL_ADDRESS = sepolia['VotingBeaconModule#Voting']
  BOD_BEACON_ADDRESS = sepolia['BoardOfDirectorsModule#Beacon']
  BOD_IMPL_ADDRESS = sepolia['BoardOfDirectorsModule#BoardOfDirectors']
} else {
  TIPS_ADDRESS = import.meta.env.VITE_APP_TIPS_ADDRESS
  BANK_BEACON_ADDRESS = import.meta.env.VITE_APP_BANK_BEACON_ADDRESS
  BANK_IMPL_ADDRESS = import.meta.env.VITE_APP_BANK_IMPL_ADDRESS
  VOTING_BEACON_ADDRESS = import.meta.env.VITE_APP_VOTING_BEACON_ADDRESS
  VOTING_IMPL_ADDRESS = import.meta.env.VITE_APP_VOTING_IMPL_ADDRESS
  BOD_BEACON_ADDRESS = import.meta.env.VITE_APP_BOD_BEACON_ADDRESS
  BOD_IMPL_ADDRESS = import.meta.env.VITE_APP_BOD_IMPL_ADDRESS
}

export const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL
export {
  TIPS_ADDRESS,
  BANK_BEACON_ADDRESS,
  BANK_IMPL_ADDRESS,
  VOTING_BEACON_ADDRESS,
  VOTING_IMPL_ADDRESS,
  BOD_BEACON_ADDRESS,
  BOD_IMPL_ADDRESS
}

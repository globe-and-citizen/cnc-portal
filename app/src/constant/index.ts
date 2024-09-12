import { getNetwork } from './network'

export const TIPS_ADDRESS = import.meta.env.VITE_APP_TIPS_ADDRESS
export const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL
export const BANK_IMPL_ADDRESS = import.meta.env.VITE_APP_BANK_IMPL_ADDRESS
export const BANK_BEACON_ADDRESS = import.meta.env.VITE_APP_BANK_BEACON_ADDRESS
export const VOTING_IMPL_ADDRESS = import.meta.env.VITE_APP_VOTING_IMPL_ADDRESS
export const VOTING_BEACON_ADDRESS = import.meta.env.VITE_APP_VOTING_BEACON_ADDRESS
export const BOD_IMPL_ADDRESS = import.meta.env.VITE_APP_BOD_IMPL_ADDRESS
export const BOD_BEACON_ADDRESS = import.meta.env.VITE_APP_BOD_BEACON_ADDRESS
export const EXPENSE_ACCOUNT_BEACON_ADDRESS = import.meta.env
  .VITE_APP_EXPENSE_ACCOUNT_BEACON_ADDRESS
export const EXPENSE_ACCOUNT_LOGIC_ADDRESS = import.meta.env.VITE_APP_EXPENSE_ACCOUNT_LOGIC_ADDRESS

export const NETWORK = getNetwork()

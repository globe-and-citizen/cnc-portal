import { getNetwork } from './network'

export const TIPS_ADDRESS = import.meta.env.VITE_APP_TIPS_ADDRESS
export const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL
export const ETHERSCAN_URL = import.meta.env.VITE_APP_ETHERSCAN_URL
export const NETWORK = getNetwork()

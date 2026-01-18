import { BACKEND_URL } from '.'

export const SAFE_API_KEY = import.meta.env.VITE_APP_SAFE_API_KEY

// API URLs
export const RELAYER_URL =
  import.meta.env.VITE_APP_RELAYER_URL || 'https://relayer-v2.polymarket.com/'
export const CLOB_API_URL = 'https://clob.polymarket.com'
export const POLYMARKET_PROFILE_URL = (address: string) => `https://polymarket.com/${address}`

// RPC URLs
export const POLYGON_RPC_URL = import.meta.env.VITE_APP_POLYGON_RPC_URL || 'https://polygon-rpc.com'

// Remote signing
export const REMOTE_SIGNING_URL = () => `${BACKEND_URL}/api/polymarket/sign`

// Other constants
export const POLYGON_CHAIN_ID = 137
export const SESSION_STORAGE_KEY = 'polymarket_trading_session'

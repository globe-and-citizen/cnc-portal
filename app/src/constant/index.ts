export const TIPS_ADDRESS = import.meta.env.VITE_APP_TIPS_ADDRESS
export const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL
export const ETHERSCAN_URL = import.meta.env.VITE_APP_ETHERSCAN_URL
export const NETWORK_CONFIG = {
  networkName: import.meta.env.VITE_APP_NETWORK_NAME,
  networkUrl: import.meta.env.VITE_APP_NETWORK_URL,
  chainId: import.meta.env.VITE_APP_CHAIN_ID,
  currencySymbol: import.meta.env.VITE_APP_CURRENCY_SYMBOL,
  blockExplorerUrl: import.meta.env.VITE_APP_BLOCK_EXPLORER_URL
    ? import.meta.env.VITE_APP_BLOCK_EXPLORER_URL
    : null
}

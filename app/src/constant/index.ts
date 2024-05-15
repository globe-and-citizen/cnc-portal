import type { Networks, Network } from '@/types'
import networks from '@/networks/networks.json'

const setNetwork = (): Network => {
  const NETWORK_ALIAS: Networks = import.meta.env.VITE_APP_NETWORK_ALIAS

  if (NETWORK_ALIAS) {
    return networks[NETWORK_ALIAS]
  } else {
    return {
      networkName: import.meta.env.VITE_APP_NETWORK_NAME,
      rpcUrl: import.meta.env.VITE_APP_RPC_URL,
      chainId: import.meta.env.VITE_APP_CHAIN_ID,
      currencySymbol: import.meta.env.VITE_APP_CURRENCY_SYMBOL,
      blockExplorerUrl: import.meta.env.VITE_APP_BLOCK_EXPLORER_URL
        ? import.meta.env.VITE_APP_BLOCK_EXPLORER_URL
        : null
    }
  }
}

export const TIPS_ADDRESS = import.meta.env.VITE_APP_TIPS_ADDRESS
export const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL
export const ETHERSCAN_URL = import.meta.env.VITE_APP_ETHERSCAN_URL
export const NETWORK: Network = setNetwork()

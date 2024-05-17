import type { Networks, Network } from '@/types'
import networks from '@/networks/networks.json'

const checkNetwork = (network: Network) => {
  for (const key in network) {
    if (key !== 'blockExplorerUrl' && !network[key]) {
      return false
    }
  }

  return true
}

export const getNetwork = (): Network => {
  const NETWORK_ALIAS: Networks = import.meta.env.VITE_APP_NETWORK_ALIAS
  let network: Network

  if (NETWORK_ALIAS) {
    network = networks[NETWORK_ALIAS]
  } else {
    network = {
      networkName: import.meta.env.VITE_APP_NETWORK_NAME,
      rpcUrl: import.meta.env.VITE_APP_RPC_URL,
      chainId: import.meta.env.VITE_APP_CHAIN_ID,
      currencySymbol: import.meta.env.VITE_APP_CURRENCY_SYMBOL,
      blockExplorerUrl: import.meta.env.VITE_APP_BLOCK_EXPLORER_URL
        ? import.meta.env.VITE_APP_BLOCK_EXPLORER_URL
        : null
    }
  }

  if (checkNetwork(network)) return network
  else return networks['sepolia']
}

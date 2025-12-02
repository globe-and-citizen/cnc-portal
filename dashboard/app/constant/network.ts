import type { Networks, Network } from '../types/network'
import networks from '../networks/networks.json'

const checkNetwork = (network: Network) => {
  if (!network) return false

  for (const key in network) {
    if (key !== 'blockExplorerUrl' && !network[key as keyof Network]) {
      return false
    }
  }

  return true
}

// Use process.env directly - this is fine for build-time constants
export const getNetwork = (): Network => {
  const NETWORK_ALIAS = process.env.NUXT_PUBLIC_NETWORK_ALIAS as Networks
  let network: Network

  if (NETWORK_ALIAS && networks[NETWORK_ALIAS]) {
    network = networks[NETWORK_ALIAS]
  } else {
    network = {
      networkName: process.env.NUXT_PUBLIC_NETWORK_NAME || 'Localhost',
      rpcUrl: process.env.NUXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545',
      chainId: process.env.NUXT_PUBLIC_CHAIN_ID || '31337',
      currencySymbol: process.env.NUXT_PUBLIC_CURRENCY_SYMBOL || 'ETH',
      blockExplorerUrl: process.env.NUXT_PUBLIC_BLOCK_EXPLORER_URL || undefined
    }
  }

  if (checkNetwork(network)) {
    return {
      ...network,
      rpcUrl: process.env.NUXT_PUBLIC_RPC_URL || network.rpcUrl
    }
  } else {
    return networks['sepolia']
  }
}

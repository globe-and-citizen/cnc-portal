import { useAccount } from '@wagmi/vue'
import { computed, getCurrentInstance } from 'vue'
import networksJson from '~/networks/networks.json'

export interface NetworkConfig {
  chainId: string
  networkName: string
  rpcUrl: string
  blockExplorerUrl?: string
  currencySymbol: string
}

type NetworksJson = Record<string, NetworkConfig>

const networks = networksJson as NetworksJson

/**
 * Get network config from networks.json based on chain ID
 * @param chainId - The chain ID (decimal number)
 * @returns NetworkConfig or null if not found
 */
export const getNetworkConfig = (chainId?: number): NetworkConfig | null => {
  if (!chainId) return null

  const chainIdHex = `0x${chainId.toString(16)}`

  for (const config of Object.values(networks)) {
    if (config.chainId.toLowerCase() === chainIdHex.toLowerCase()) {
      return config
    }
  }

  return null
}

/**
 * Get native currency symbol from chain ID
 * @param chainId - The chain ID (decimal number)
 * @returns Currency symbol (e.g., 'GO', 'ETH', 'POL')
 */
export const getNativeSymbolFromChainId = (chainId?: number): string => {
  const config = getNetworkConfig(chainId)
  return config?.currencySymbol || 'ETH'
}

/**
 * Composable for network management
 * Single source of truth for all network-related data
 */
export const useNetwork = () => {
  // Check if we're in a valid Vue context
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('useNetwork must be called within a component setup function')
  }

  const { chain } = useAccount()

  // Get network config from networks.json
  const config = computed(() => {
    if (!chain.value?.id) return null
    return getNetworkConfig(chain.value.id)
  })

  // Native currency symbol
  const nativeSymbol = computed(() => {
    return config.value?.currencySymbol || chain.value?.nativeCurrency.symbol || 'ETH'
  })

  // Network name
  const networkName = computed(() => {
    return config.value?.networkName || chain.value?.name || 'Unknown Network'
  })

  // Chain ID (decimal)
  const chainId = computed(() => chain.value?.id)

  // Chain ID (hex)
  const chainIdHex = computed(() => {
    return chain.value?.id ? `0x${chain.value.id.toString(16)}` : null
  })

  // Block explorer URL
  const blockExplorerUrl = computed(() => config.value?.blockExplorerUrl)

  // RPC URL
  const rpcUrl = computed(() => config.value?.rpcUrl)

  // Check if network is supported
  const isSupported = computed(() => config.value !== null)

  return {
    config,
    nativeSymbol,
    networkName,
    chainId,
    chainIdHex,
    blockExplorerUrl,
    rpcUrl,
    isSupported
  }
}

import { getContractConfig } from '@polymarket/builder-relayer-client/dist/config'
import networks from '@/networks/networks.json'
import { deriveSafe } from '@polymarket/builder-relayer-client/dist/builder/derive'
import { getPublicClient } from '@/utils'
import type { RelayClient } from '@polymarket/builder-relayer-client'

const publicClient = getPublicClient(networks['polygon'].chainId)

// This function derives the Safe address from the EOA address
export const deriveSafeFromEoa = (eoa: string) => {
  try {
    // Using Polygon network for Polymarket Safe
    const config = getContractConfig(parseInt(networks['polygon'].chainId, 16))
    return deriveSafe(eoa, config.SafeContracts.SafeFactory)
  } catch (error) {
    console.error('Error deriving Safe address:', error)
    return null
  }
}

// This function checks if the Safe is deployed by querying the relay client or RPC
export const checkSafeDeployed = async (
  relayClient: RelayClient,
  safeAddr: string
): Promise<boolean> => {
  try {
    // Try relayClient first
    const deployed = await relayClient.getDeployed(safeAddr)
    return deployed
  } catch (err) {
    console.warn('API check failed, falling back to RPC', err)

    // Fallback to RPC
    if (publicClient) {
      const code = await publicClient.getCode({
        address: safeAddr as `0x${string}`
      })
      return code !== undefined && code !== '0x' && code.length > 2
    }

    return false
  }
}

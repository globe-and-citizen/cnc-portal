// composables/useSafeDeployment.ts
import { computed, ref, type Ref } from 'vue'
import { useWalletStore } from '@/stores/walletStore'
import { RelayClient } from '@polymarket/builder-relayer-client'
import { deriveSafe } from '@polymarket/builder-relayer-client/dist/builder/derive'
import { getContractConfig } from '@polymarket/builder-relayer-client/dist/config'
import { NETWORK } from '@/constant'
import { useUserDataStore } from '@/stores'
// import { getPublicClient } from '@wagmi/core'
import { getPublicClient } from '@/utils'
import networks from '@/networks/networks.json'

export interface UseSafeDeploymentReturn {
  derivedSafeAddressFromEoa: Ref<string | null>
  isSafeDeployed: (relayClient: RelayClient, safeAddr: string) => Promise<boolean>
  deploySafe: (relayClient: RelayClient) => Promise<string>
}

export const useSafeDeployment = (): UseSafeDeploymentReturn => {
  const wallet = useWalletStore()
  // const { eoaAddress, isConnected, publicClient } = wallet
  const userDataStore = useUserDataStore()
  const publicClient = getPublicClient(networks['polygon'].chainId)

  // This function derives the Safe address from the EOA address
  const derivedSafeAddressFromEoa = computed(() => {
    try {
      console.log('ChainId: ', parseInt(NETWORK.chainId, 16))
      const config = getContractConfig(parseInt(networks['polygon'].chainId, 16))
      return deriveSafe(userDataStore.address, config.SafeContracts.SafeFactory)
    } catch (error) {
      console.error('Error deriving Safe address:', error)
      return null
    }
  })

  // This function checks if the Safe is deployed by querying the relay client or RPC
  const isSafeDeployed = async (relayClient: RelayClient, safeAddr: string): Promise<boolean> => {
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

  // This function deploys the Safe using the relayClient
  const deploySafe = async (relayClient: RelayClient): Promise<string> => {
    try {
      // Prompts signer for a signature
      const response = await relayClient.deploy()
      const result = await response.wait()

      if (!result) {
        throw new Error('Safe deployment failed')
      }

      return result.proxyAddress
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to deploy Safe')
      throw error
    }
  }

  return {
    derivedSafeAddressFromEoa,
    isSafeDeployed,
    deploySafe
  }
}

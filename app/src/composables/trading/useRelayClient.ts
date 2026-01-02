// composables/useRelayClient.ts
import { computed, markRaw, ref, watch, type Ref } from 'vue'
import { BuilderConfig } from '@polymarket/builder-signing-sdk'
import { RelayClient } from '@polymarket/builder-relayer-client'
import { RELAYER_URL, REMOTE_SIGNING_URL } from '@/constant'
import networks from '@/networks/networks.json'
import { useUserDataStore } from '@/stores'
import { useConnectorClient } from '@wagmi/vue'
import { clientToSigner } from '@/utils'

declare global {
  interface Window {
    ethereum?: unknown
  }
}

interface UseRelayClientReturn {
  relayClient: Ref<RelayClient | null>
  isLoading: Ref<boolean>
  isReady: Ref<boolean>
  error: Ref<string | null>
  initializeRelayClient: () => Promise<RelayClient>
  clearRelayClient: () => void
  getOrInitializeRelayClient: () => Promise<RelayClient>
  reset: () => void
}

export const useRelayClient = (): UseRelayClientReturn => {
  // Reactive state
  const relayClient = ref<RelayClient | null>(null) as Ref<RelayClient | null>
  const isLoading = ref(false)
  const isReady = ref(false)
  const error = ref<string | null>(null)
  const userDataStore = useUserDataStore()
  const { data: client } = useConnectorClient()

  // Get ethers Signer from wagmi client
  const ethersSigner = computed(() => {
    if (!client.value) return null
    const signer = clientToSigner(client.value)
    return markRaw(signer)
  })

  watch([ethersSigner, () => userDataStore.address], ([newSigner, newAddress]) => {
    if (newSigner && newAddress) {
      isReady.value = true
    } else {
      isReady.value = false
      relayClient.value = null
    }
  })

  const POLYGON_CHAIN_ID = parseInt(networks['polygon'].chainId, 16)

  /**
   * This function initializes the relay client with
   * the user's signer and builder config
   */
  const initializeRelayClient = async (): Promise<RelayClient> => {
    isLoading.value = true
    error.value = null

    try {
      if (!userDataStore.address || !ethersSigner.value) {
        throw new Error('Wallet not connected')
      }

      // Builder config is obtained from 'polymarket.com/settings?tab=builder'
      // A remote signing server is used to enable remote signing for builder authentication
      // This allows the builder credentials to be kept secure while signing requests

      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: REMOTE_SIGNING_URL()
        }
      })

      // The relayClient instance is used for deploying the Safe,
      // setting token approvals, and executing CTF operations such
      // as splitting, merging, and redeeming positions.

      const client = new RelayClient(
        RELAYER_URL,
        POLYGON_CHAIN_ID,
        ethersSigner.value,
        builderConfig
      ) as unknown as RelayClient

      relayClient.value = client
      isLoading.value = false
      return client
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize relay client'
      error.value = errorMsg
      isLoading.value = false
      throw err instanceof Error ? err : new Error(errorMsg)
    }
  }

  /**
   * This function clears the relay client and resets the state
   */
  const clearRelayClient = () => {
    relayClient.value = null
    error.value = null
  }

  /**
   * Helper function to get or initialize the relay client
   * Returns existing client if already initialized, otherwise initializes a new one
   */
  const getOrInitializeRelayClient = async (): Promise<RelayClient> => {
    if (relayClient.value) {
      return relayClient.value
    }
    return await initializeRelayClient()
  }

  /**
   * Reset the composable state
   */
  const reset = () => {
    clearRelayClient()
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    relayClient,
    isLoading,
    isReady,
    error,

    // Methods
    initializeRelayClient,
    clearRelayClient,
    getOrInitializeRelayClient,
    reset
  }
}

import { computed } from 'vue'
import { ClobClient } from '@polymarket/clob-client'
import { BuilderConfig } from '@polymarket/builder-signing-sdk'

import { useEthersSigner } from './useEthersSigner'
import { useSafeDeployment } from './useSafeDeployment'
// Import the centralized session manager
import { useTradingSession } from './useTradingSession'

import { CLOB_API_URL, POLYGON_CHAIN_ID, REMOTE_SIGNING_URL } from '@/constant/'
import { useUserDataStore, useTradingSessionStore } from '@/stores'
import { useStorage } from '@vueuse/core'

/**
 * Creates an authenticated clobClient instance using the active trading session data.
 */
export function useClobClient() {
  // We remove the arguments since all dependencies are now managed internally via composables

  const { ethersSigner } = useEthersSigner()
  const { derivedSafeAddressFromEoa } = useSafeDeployment()
  // Get the reactive session state
  const { isTradingSessionComplete } = useTradingSession()
  const tradingSessionStore = useTradingSessionStore()
  const userDataStore = useUserDataStore()

  const clobClient = computed(() => {
    const tradingSession = tradingSessionStore.sessions.get(
      userDataStore.address.toLocaleLowerCase()
    )
    if (
      !ethersSigner.value ||
      !derivedSafeAddressFromEoa.value ||
      !isTradingSessionComplete.value || // Check if the entire session flow is done
      !tradingSession
    ) {
      console.log('Not ready to setup trading session...')
      return null
    }

    // We can confidently destructure these now that we know isTradingSessionComplete.value is true
    const { apiCredentials, safeAddress } = tradingSession!

    const token = useStorage('authToken', '')

    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: REMOTE_SIGNING_URL(),
        token: token.value
      }
    })

    return new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      ethersSigner.value,
      apiCredentials, // Use the API credentials from the session
      2,
      safeAddress, // Use the verified safe address from the session
      undefined,
      false,
      builderConfig
    )
  })

  return { clobClient }
}

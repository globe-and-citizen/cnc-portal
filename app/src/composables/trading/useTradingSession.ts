import { ref, watch, computed } from 'vue'
import { useUserDataStore, useTradingSessionStore } from '@/stores'

// Import Vue-adapted composables
import { useUserApiCredentials } from './useUserApiCredentials'
import { useSafeDeployment } from './useSafeDeployment'
import { useRelayClient } from './useRelayClient'
import { useTokenApprovals } from './useTokenApprovals' // Import here

// Import shared utilities
import {
  loadSession,
  saveSession,
  clearSession as clearStoredSession,
  type TradingSession,
  type SessionStep
} from '@/utils/trading/session'

// The Vue equivalent of the useTradingSession React hook
export function useTradingSession() {
  const tradingSession = ref<TradingSession | null>(null)
  const currentStep = ref<SessionStep>('idle')
  const sessionError = ref<Error | null>(null)

  const userDataStore = useUserDataStore()
  const tradingSessionStore = useTradingSessionStore()
  const { createOrDeriveUserApiCredentials } = useUserApiCredentials()
  // Use the new composable's methods
  const { checkAllApprovals, setAllTokenApprovals } = useTokenApprovals()
  const { derivedSafeAddressFromEoa, isSafeDeployed, deploySafe } = useSafeDeployment()
  const {
    relayClient,
    initializeRelayClient,
    clearRelayClient,
    isReady: isRelayClientReady
  } = useRelayClient()

  // --- Effects (watchers) ---

  // Effect 0: Sync session state when the connected wallet changes
  watch(
    () => userDataStore.address,
    (eoaAddress) => {
      if (!eoaAddress) {
        tradingSession.value = null
        currentStep.value = 'idle'
        sessionError.value = null
        return
      }
      const stored = loadSession(eoaAddress)
      tradingSession.value = stored

      if (!stored) {
        currentStep.value = 'idle'
        sessionError.value = null
      }
    },
    { immediate: true }
  ) // Run immediately on component load

  // Effect 1: Restore the relay client if a session exists and wallet is ready
  watch([tradingSession, isRelayClientReady], ([session, ready]) => {
    if (session && ready && userDataStore.address) {
      initializeRelayClient().catch((err) => {
        console.error('Failed to restore relay client:', err)
      })
    }
  })

  // --- Methods ---

  // The core function that orchestrates the trading session initialization
  const initializeTradingSession = async () => {
    if (!userDataStore.address) {
      throw new Error('Wallet not connected')
    }

    currentStep.value = 'checking'
    sessionError.value = null

    try {
      // Step 1 & 2: Initializes relayClient & gets safe address
      const initializedRelayClient = await initializeRelayClient()
      const safeAddress = derivedSafeAddressFromEoa.value

      if (!safeAddress) {
        throw new Error('Failed to derive Safe address')
      }

      if (!initializedRelayClient) {
        throw new Error('Relay client not initialized')
      }

      // Step 3 & 4: Check if Safe is deployed and deploy if needed
      const isDeployed = await isSafeDeployed(initializedRelayClient, safeAddress)
      if (!isDeployed) {
        currentStep.value = 'deploying'
        // Pass the explicit relay client instance
        await deploySafe(initializedRelayClient)
      }

      // Step 5: Get User API Credentials (derive or create) and store them
      let apiCreds = tradingSession.value?.apiCredentials
      if (!apiCreds?.key || !apiCreds?.secret || !apiCreds?.passphrase) {
        currentStep.value = 'credentials'
        apiCreds = await createOrDeriveUserApiCredentials()
      }

      // Step 6: Set all required token approvals for trading
      currentStep.value = 'approvals'
      // Use the methods from useTokenApprovals
      const approvalStatus = await checkAllApprovals(safeAddress)

      let hasApprovals: boolean
      if (approvalStatus.allApproved) {
        hasApprovals = true
      } else {
        // Use the methods from useTokenApprovals
        hasApprovals = await setAllTokenApprovals(initializedRelayClient)
      }

      // Step 7: Create custom session object and save it
      const newSession: TradingSession = {
        eoaAddress: userDataStore.address,
        safeAddress: safeAddress,
        isSafeDeployed: true,
        hasApiCredentials: true,
        hasApprovals, // Now correctly derived
        apiCredentials: apiCreds,
        lastChecked: Date.now()
      }

      tradingSession.value = newSession
      tradingSessionStore.saveSession(userDataStore.address, newSession)
      saveSession(userDataStore.address, newSession)
      currentStep.value = 'complete'
    } catch (err) {
      console.error('Session initialization error:', err)
      const error = err instanceof Error ? err : new Error('Unknown error')
      sessionError.value = error
      currentStep.value = 'idle'
    }
  }

  // Function to clear the trading session
  const endTradingSession = () => {
    if (!userDataStore.address) return

    clearStoredSession(userDataStore.address)
    tradingSession.value = null
    clearRelayClient() // Clear the relay client state
    currentStep.value = 'idle'
    sessionError.value = null
  }

  // --- Returned state and methods ---

  const isTradingSessionComplete = computed(() => {
    const session = tradingSessionStore.sessions.get(userDataStore.address.toLocaleLowerCase())
    // !!tradingSession.value?.isSafeDeployed &&
    // !!tradingSession.value?.hasApiCredentials &&
    // !!tradingSession.value?.hasApprovals
    return !!session?.isSafeDeployed && !!session?.hasApiCredentials && !!session?.hasApprovals
  })

  return {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
    relayClient
  }
}

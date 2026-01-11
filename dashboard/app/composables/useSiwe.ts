import { SiweMessage } from 'siwe'
import {
  useConnection,
  useSignMessage,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
  injected
} from '@wagmi/vue'
import { useAuthStore } from '~/stores/useAuthStore'
import { getUserNonce } from '~/api/user'
import { authenticateWithSiwe as authWithSiwe, validateToken as validateAuthToken } from '~/api/auth'

export function useSiwe() {
  const runtimeConfig = useRuntimeConfig()
  const configChainId = runtimeConfig.public.chainId

  const isProcessing = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()
  const connection = useConnection()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  const { connectAsync } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()

  /**
   * Main SIWE sign-in flow
   */
  const signIn = async () => {
    isProcessing.value = true
    error.value = null
    // Use chainId from runtime config, fallback to hardhat local network
    const networkChainId = configChainId ? parseInt(configChainId as string) : 31337

    try {
      // Ensure wallet is connected
      if (!connection.isConnected.value || !connection.address.value) {
        await connectAsync({ connector: injected(), chainId: networkChainId })

        // check if the current chainId matches the required network
        if (chainId.value !== networkChainId) {
          await switchChainAsync({ chainId: networkChainId })
        }
      }

      // Step 1: Fetch nonce from backend
      if (!connection.address.value) {
        error.value = 'Please connect your wallet first'
        isProcessing.value = false
        return false
      }

      const nonceResponse = await getUserNonce(connection.address.value)
      if (!nonceResponse?.nonce) {
        error.value = 'Failed to get nonce from server'
        isProcessing.value = false
        return false
      }

      // Step 2: Create SIWE message
      const siweMessage = new SiweMessage({
        address: connection.address.value,
        statement: 'Sign in to CNC Portal Admin Dashboard with Ethereum.',
        nonce: nonceResponse.nonce,
        chainId: chainId.value,
        uri: window.location.origin,
        domain: window.location.host,
        version: '1'
      })
      const messageToSign = siweMessage.prepareMessage()

      // Step 3: Sign the message
      let signature: string
      try {
        signature = await signMessageAsync({ message: messageToSign })
      } catch (e: unknown) {
        const signError = e as { name?: string }
        if (signError.name === 'UserRejectedRequestError') {
          error.value = 'You rejected the signature request. Please sign to authenticate.'
        } else {
          error.value = 'Failed to sign message'
        }
        isProcessing.value = false
        return false
      }

      // Step 4: Send to backend for verification and get JWT
      const authResponse = await authWithSiwe(messageToSign, signature)
      if (!authResponse?.accessToken) {
        error.value = 'Authentication failed. Please try again.'
        isProcessing.value = false
        return false
      }

      // Step 5: Store authentication data
      authStore.setAuth(authResponse.accessToken, connection.address.value)

      isProcessing.value = false
      return true
    } catch (e) {
      console.error('SIWE sign-in error:', e)
      error.value = 'An unexpected error occurred'
      isProcessing.value = false
      return false
    }
  }

  /**
   * Sign out and clear authentication data
   */
  const signOut = () => {
    authStore.clearAuth()
    disconnect()
  }

  /**
   * Validate current token with backend
   */
  const validateToken = async (): Promise<boolean> => {
    const token = authStore.getToken()
    if (!token) {
      console.warn('No token found for validation')
      return false
    }

    try {
      await validateAuthToken(token)
      return true
    } catch (e) {
      console.warn('Token validation failed:', e)
      // Clear invalid token
      authStore.clearAuth()
      return false
    }
  }

  return {
    isProcessing,
    error,
    signIn,
    signOut,
    validateToken
  }
}

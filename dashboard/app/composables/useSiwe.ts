import { SiweMessage } from 'siwe'
import { useAccount, useSignMessage, useChainId, useConnect, useDisconnect } from '@wagmi/vue'
import { useAuthStore } from '~/stores/useAuthStore'

export function useSiwe() {
  const runtimeConfig = useRuntimeConfig()
  const backendUrl = runtimeConfig.public.backendUrl

  const isProcessing = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  /**
   * Connect wallet using injected connector (MetaMask, etc.)
   */
  const connectWallet = async () => {
    error.value = null
    const injectedConnector = connectors.value.find(c => c.id === 'injected')
    if (injectedConnector) {
      try {
        await connect({ connector: injectedConnector })
      } catch (e) {
        error.value = 'Failed to connect wallet'
        console.error('Failed to connect wallet:', e)
      }
    } else {
      error.value = 'No wallet connector available'
    }
  }

  /**
   * Fetch nonce from backend for the given address
   */
  const fetchNonce = async (userAddress: string): Promise<string | null> => {
    try {
      const response = await fetch(`${backendUrl}/api/user/nonce/${userAddress}`)
      if (!response.ok) {
        throw new Error('Failed to fetch nonce')
      }
      const data = await response.json()
      return data.nonce
    } catch (e) {
      console.error('Error fetching nonce:', e)
      return null
    }
  }

  /**
   * Authenticate with SIWE by sending message and signature to backend
   */
  const authenticateWithSiwe = async (message: string, signature: string): Promise<string | null> => {
    try {
      const response = await fetch(`${backendUrl}/api/auth/siwe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, signature })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Authentication failed')
      }

      const data = await response.json()
      return data.accessToken
    } catch (e) {
      console.error('Error authenticating with SIWE:', e)
      return null
    }
  }

  /**
   * Main SIWE sign-in flow
   */
  const signIn = async () => {
    isProcessing.value = true
    error.value = null

    try {
      // Ensure wallet is connected
      if (!isConnected.value || !address.value) {
        await connectWallet()

        // Wait for connection state to update by watching the reactive refs
        let attempts = 0
        const maxAttempts = 20 // 2 seconds max wait time
        while (!address.value && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }

        if (!address.value) {
          error.value = 'Please connect your wallet first'
          isProcessing.value = false
          return false
        }
      }

      // Step 1: Fetch nonce from backend
      const nonce = await fetchNonce(address.value)
      if (!nonce) {
        error.value = 'Failed to get nonce from server'
        isProcessing.value = false
        return false
      }

      // Step 2: Create SIWE message
      const siweMessage = new SiweMessage({
        address: address.value,
        statement: 'Sign in to CNC Portal Admin Dashboard with Ethereum.',
        nonce,
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
      const token = await authenticateWithSiwe(messageToSign, signature)
      if (!token) {
        error.value = 'Authentication failed. Please try again.'
        isProcessing.value = false
        return false
      }

      // Step 5: Store authentication data
      authStore.setAuth(token, address.value)

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
      const response = await fetch(`${backendUrl}/api/auth/token`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        console.warn(`Token validation failed with status: ${response.status}`)
        // Clear invalid token
        if (response.status === 401) {
          authStore.clearAuth()
        }
        return false
      }

      return true
    } catch (e) {
      console.error('Token validation error:', e)
      return false
    }
  }

  return {
    isProcessing,
    error,
    isConnected,
    address,
    signIn,
    signOut,
    connectWallet,
    validateToken
  }
}

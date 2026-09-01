import { SiweMessage } from 'siwe'
import { useMutation } from '@tanstack/vue-query'
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
import { authenticateWithSiwe, validateToken as validateAuthToken } from '~/api/auth'
import { parseLoginError } from '~/utils/loginError'

/**
 * Owns the SIWE (Sign-In With Ethereum) session for the dashboard: wallet
 * connection, message signature, backend authentication, sign-out, and token
 * validation.
 *
 * The connect and sign-in steps are modelled as TanStack Query mutations so the
 * page consumes ready-made `isPending` / `error` reactive state instead of
 * hand-rolling `try/catch` + loading flags. Every failure path is funnelled
 * through `parseLoginError`, so `error` is always a user-facing string (or
 * `null`) — never a raw wallet/HTTP error.
 */
export function useSiwe() {
  const runtimeConfig = useRuntimeConfig()
  const networkChainId = parseInt((runtimeConfig.public.chainId as string) || '31337')

  const authStore = useAuthStore()
  const connection = useConnection()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  const { connectAsync } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()

  const isConnected = computed(() => connection.isConnected.value)
  const address = computed(() => connection.address.value)

  /** Connect an injected wallet (if needed) and switch it to the target chain. */
  const ensureWalletReady = async () => {
    if (!connection.isConnected.value || !connection.address.value) {
      await connectAsync({ connector: injected(), chainId: networkChainId })
    }
    if (chainId.value !== networkChainId) {
      await switchChainAsync({ chainId: networkChainId })
    }
  }

  const connectMutation = useMutation({ mutationFn: ensureWalletReady })

  const loginMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      await ensureWalletReady()

      const account = connection.address.value
      if (!account) {
        throw new Error('No wallet account available. Please connect your wallet and try again.')
      }

      const { nonce } = await getUserNonce(account)
      if (!nonce) {
        throw new Error('Could not retrieve a login nonce from the server. Please try again.')
      }

      const message = new SiweMessage({
        address: account,
        statement: 'Sign in to CNC Portal Admin Dashboard with Ethereum.',
        nonce,
        chainId: chainId.value,
        uri: window.location.origin,
        domain: window.location.host,
        version: '1'
      }).prepareMessage()

      const signature = await signMessageAsync({ message })

      const { accessToken } = await authenticateWithSiwe(message, signature)
      if (!accessToken) {
        throw new Error('Authentication failed. Please try again.')
      }

      authStore.setAuth(accessToken, account)
      return accessToken
    }
  })

  const isConnecting = computed(() => connectMutation.isPending.value)
  const isSigningIn = computed(() => loginMutation.isPending.value)
  const isProcessing = computed(() => isConnecting.value || isSigningIn.value)

  // Surface whichever step last failed, classified into a user-facing message.
  const error = computed<string | null>(() => {
    const err = loginMutation.error.value ?? connectMutation.error.value
    return err ? parseLoginError(err).message : null
  })

  const connectWallet = async (): Promise<boolean> => {
    loginMutation.reset()
    try {
      await connectMutation.mutateAsync()
      return true
    } catch {
      return false
    }
  }

  const signIn = async (): Promise<boolean> => {
    connectMutation.reset()
    try {
      await loginMutation.mutateAsync()
      return true
    } catch {
      return false
    }
  }

  const signOut = () => {
    authStore.clearAuth()
    disconnect()
  }

  const validateToken = async (): Promise<boolean> => {
    const token = authStore.getToken()
    if (!token) return false

    try {
      await validateAuthToken(token)
      return true
    } catch {
      authStore.clearAuth()
      return false
    }
  }

  return {
    isConnected,
    address,
    isConnecting,
    isSigningIn,
    isProcessing,
    error,
    connectWallet,
    signIn,
    signOut,
    validateToken
  }
}

import router from '@/router'
import { useUserDataStore } from '@/stores'
import { log } from '@/utils'
import { useStorage } from '@vueuse/core'
import {
  useSignMessage,
  useChainId,
  useConnection,
  useConnect,
  useSwitchChain,
  injected
} from '@wagmi/vue'
import { SiweMessage } from 'siwe'
import { useMutation } from '@tanstack/vue-query'
import { useToast } from '@nuxt/ui/composables'
import { getUser, getUserNonce } from '@/api/user.api'
import { siweAuth } from '@/api/auth.api'
import { NETWORK } from '@/constant'
import { config } from '@/wagmi.config'
import type { Address } from 'viem'

/** Discriminated error so `onError` can pick the right toast. */
export type SiweErrorStep =
  | 'connect-wallet'
  | 'switch-chain'
  | 'fetch-nonce'
  | 'sign-message'
  | 'sign-rejected'
  | 'auth'
  | 'fetch-user'

export class SiweError extends Error {
  declare cause?: unknown
  constructor(
    public readonly step: SiweErrorStep,
    cause?: unknown
  ) {
    super(`SIWE failed at step: ${step}`)
    this.name = 'SiweError'
    if (cause !== undefined) this.cause = cause
  }
}

const TOAST_BY_STEP: Record<SiweErrorStep, string> = {
  'connect-wallet':
    'Wallet connection rejected: You need to connect your wallet to use the CNC Portal.',
  'switch-chain':
    'Network switch rejected: You need to switch to the correct network to use the CNC Portal',
  'fetch-nonce': 'Failed to fetch nonce',
  'sign-message': 'Something went wrong: Unable to sign SIWE message',
  'sign-rejected': 'Message sign rejected: You need to sign the message to Sign in the CNC Portal',
  auth: 'Failed to get authentication token',
  'fetch-user': 'Failed to fetch user data'
}

const NONCE_RETRIES = 3
const NONCE_RETRY_DELAY_MS = 3000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Retry `fn` up to `retries` times, waiting `delayMs` between attempts. */
async function withRetry<T>(fn: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      log.info(`retry attempt ${attempt}/${retries} failed`, err)
      if (attempt < retries) await sleep(delayMs)
    }
  }
  throw lastError
}

/**
 * SIWE login as a TanStack mutation.
 *
 * Single orchestrating `mutationFn` that drives the whole flow:
 * wallet connect → switch chain → fetch nonce (retried) → sign → auth → fetch user.
 * Each step rethrows a typed `SiweError`; `onError` maps the step to a toast.
 */
export function useSiweMutation() {
  const toast = useToast()
  const userDataStore = useUserDataStore()
  const connection = useConnection()
  const chainId = useChainId()
  const { mutateAsync: signMessageAsync } = useSignMessage()
  const { mutateAsync: connectAsync } = useConnect()
  const { mutateAsync: switchChainAsync } = useSwitchChain()
  const storageToken = useStorage('authToken', '')

  // Pre-registered connector (e2e mock) or browser-injected wallet (MetaMask).
  const connector = config.connectors[0] ?? injected()
  const networkChainId = parseInt(NETWORK.chainId)

  const wrap = <T>(step: SiweErrorStep, p: Promise<T>): Promise<T> =>
    p.catch((err) => {
      log.error(`siwe ${step} error`, err)
      throw new SiweError(step, err)
    })

  return useMutation({
    mutationFn: async () => {
      // 1. Connect wallet if needed
      if (!connection.isConnected.value) {
        await wrap('connect-wallet', connectAsync({ connector, chainId: networkChainId }))
      }

      // 2. Ensure correct chain
      await wrap('switch-chain', switchChainAsync({ chainId: networkChainId }))

      const address = connection.address.value as Address

      // 3. Fetch nonce (retried 3× with 3s delay)
      const { nonce } = await wrap(
        'fetch-nonce',
        withRetry(() => getUserNonce(address), NONCE_RETRIES, NONCE_RETRY_DELAY_MS)
      )

      // 4. Sign SIWE message
      const message = new SiweMessage({
        address,
        statement: 'Sign in with Ethereum to the app.',
        nonce,
        chainId: chainId.value,
        uri: window.location.origin,
        domain: window.location.origin,
        version: '1'
      }).prepareMessage()

      const signature = await signMessageAsync({ message }).catch((err) => {
        const rejected = (err as Error)?.name === 'UserRejectedRequestError'
        log.error('signMessage error', err)
        throw new SiweError(rejected ? 'sign-rejected' : 'sign-message', err)
      })

      // 5. Exchange for access token
      const { accessToken } = await wrap('auth', siweAuth({ message, signature }))
      storageToken.value = accessToken

      // 6. Fetch user (token now in storage → axios interceptor picks it up)
      const user = await wrap('fetch-user', getUser(address))

      return { user }
    },
    onSuccess: ({ user }) => {
      userDataStore.setUserData(
        user.name || '',
        (user.address || '') as Address,
        user.nonce || '',
        user.imageUrl || ''
      )
      userDataStore.setAuthStatus(true)
      router.push('/teams')
    },
    onError: (err) => {
      const step = err instanceof SiweError ? err.step : 'auth'
      // Connect/switch user-rejection is a common case → keep the toast specific.
      if (step === 'connect-wallet' || step === 'switch-chain') {
        const cause = (err as SiweError).cause as Error | undefined
        if (cause?.name && cause.name !== 'UserRejectedRequestError') {
          toast.add({
            title:
              step === 'connect-wallet'
                ? 'Something went wrong: Failed to connect wallet'
                : 'Something went wrong: Failed switch network',
            color: 'error'
          })
          return
        }
      }
      toast.add({ title: TOAST_BY_STEP[step], color: 'error' })
    }
  })
}

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
import { UserRejectedRequestError, SwitchChainError } from 'viem'
import { AxiosError } from 'axios'
import { getUser, getUserNonce } from '@/api/user.api'
import { siweAuth } from '@/api/auth.api'
import { NETWORK } from '@/constant'
import { config } from '@/wagmi.config'
import type { Address } from 'viem'

/**
 * Distinct subclasses for the three places where the user can reject a wallet
 * prompt. Everything else (network failures, axios errors, viem errors) is
 * left untouched and bubbles natively — `onError` discriminates via `instanceof`.
 */
export class WalletConnectRejectedError extends Error {
  declare cause?: unknown
  constructor(cause?: unknown) {
    super('User rejected wallet connection')
    this.name = 'WalletConnectRejectedError'
    if (cause !== undefined) this.cause = cause
  }
}
export class ChainSwitchRejectedError extends Error {
  declare cause?: unknown
  constructor(cause?: unknown) {
    super('User rejected chain switch')
    this.name = 'ChainSwitchRejectedError'
    if (cause !== undefined) this.cause = cause
  }
}
export class SignatureRejectedError extends Error {
  declare cause?: unknown
  constructor(cause?: unknown) {
    super('User rejected SIWE signature')
    this.name = 'SignatureRejectedError'
    if (cause !== undefined) this.cause = cause
  }
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
 * Re-tag a `UserRejectedRequestError` from a specific wallet op with a
 * dedicated subclass so `onError` can show a context-aware toast. Any other
 * error class is passed through unchanged.
 */
async function tagRejection<T>(
  p: Promise<T>,
  RejectionClass: new (cause: unknown) => Error
): Promise<T> {
  try {
    return await p
  } catch (err) {
    if (
      err instanceof UserRejectedRequestError ||
      (err as Error)?.name === 'UserRejectedRequestError'
    ) {
      throw new RejectionClass(err)
    }
    throw err
  }
}

/**
 * SIWE login as a TanStack mutation.
 *
 * `mutationFn` is a linear sequence of awaits with no per-step error tagging:
 * each error type already carries enough information to be routed by `onError`
 * (viem error classes for wallet failures, `AxiosError.config.url` for API
 * failures, and our 3 rejection subclasses for user-cancelled prompts).
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

  return useMutation({
    mutationFn: async () => {
      if (!connection.isConnected.value) {
        await tagRejection(
          connectAsync({ connector, chainId: networkChainId }),
          WalletConnectRejectedError
        )
      }

      await tagRejection(switchChainAsync({ chainId: networkChainId }), ChainSwitchRejectedError)

      const address = connection.address.value as Address

      const { nonce } = await withRetry(
        () => getUserNonce(address),
        NONCE_RETRIES,
        NONCE_RETRY_DELAY_MS
      )

      const message = new SiweMessage({
        address,
        statement: 'Sign in with Ethereum to the app.',
        nonce,
        chainId: chainId.value,
        uri: window.location.origin,
        domain: window.location.origin,
        version: '1'
      }).prepareMessage()

      const signature = await tagRejection(signMessageAsync({ message }), SignatureRejectedError)

      const { accessToken } = await siweAuth({ message, signature })
      storageToken.value = accessToken

      const user = await getUser(address)
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
      log.error('siwe error', err)

      // 1. User-rejected prompts — each step has its own subclass.
      if (err instanceof WalletConnectRejectedError) {
        return toast.add({
          title:
            'Wallet connection rejected: You need to connect your wallet to use the CNC Portal.',
          color: 'error'
        })
      }
      if (err instanceof ChainSwitchRejectedError) {
        return toast.add({
          title:
            'Network switch rejected: You need to switch to the correct network to use the CNC Portal',
          color: 'error'
        })
      }
      if (err instanceof SignatureRejectedError) {
        return toast.add({
          title: 'Message sign rejected: You need to sign the message to Sign in the CNC Portal',
          color: 'error'
        })
      }

      // 2. Technical wallet failures.
      if (err instanceof SwitchChainError) {
        return toast.add({ title: 'Something went wrong: Failed switch network', color: 'error' })
      }
      if ((err as Error)?.name === 'ProviderNotFoundError') {
        return toast.add({
          title:
            'No wallet detected: You need to install a wallet like metamask to use the CNC Portal',
          color: 'error'
        })
      }

      // 3. API failures — routed by endpoint.
      if (err instanceof AxiosError) {
        const url = err.config?.url ?? ''
        if (url.includes('nonce')) {
          return toast.add({ title: 'Failed to fetch nonce', color: 'error' })
        }
        if (url.includes('siwe') || url.includes('auth')) {
          return toast.add({ title: 'Failed to get authentication token', color: 'error' })
        }
        if (url.includes('user')) {
          return toast.add({ title: 'Failed to fetch user data', color: 'error' })
        }
      }

      // 4. Fallback.
      toast.add({ title: 'Something went wrong: Failed to sign in', color: 'error' })
    }
  })
}

import router from '@/router'
import { useUserDataStore } from '@/stores'
import { log } from '@/utils'
import { useStorage } from '@vueuse/core'
import { useSignMessage, useChainId, useConnection } from '@wagmi/vue'
import { SiweMessage } from 'siwe'
import { useMutation } from '@tanstack/vue-query'
import { useToast } from '@nuxt/ui/composables'
import { useWalletChecks } from '@/composables'
import { getUser, getUserNonce } from '@/api/user.api'
import { siweAuth } from '@/api/auth.api'
import type { Address } from 'viem'

/** Discriminated error so `onError` can pick the right toast. */
export type SiweErrorStep =
  | 'wallet-check'
  | 'fetch-nonce'
  | 'sign-message'
  | 'sign-rejected'
  | 'auth'
  | 'fetch-user'

export class SiweError extends Error {
  constructor(
    public readonly step: SiweErrorStep,
    cause?: unknown
  ) {
    super(`SIWE failed at step: ${step}`)
    this.name = 'SiweError'
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause
  }
}

const TOAST_BY_STEP: Record<SiweErrorStep, string> = {
  'wallet-check': 'Wallet checks failed',
  'fetch-nonce': 'Failed to fetch nonce',
  'sign-message': 'Something went wrong: Unable to sign SIWE message',
  'sign-rejected': 'Message sign rejected: You need to sign the message to Sign in the CNC Portal',
  auth: 'Failed to get authentication token',
  'fetch-user': 'Failed to fetch user data'
}

/**
 * SIWE login as a TanStack mutation.
 *
 * `mutationFn` is a single orchestrating async function that calls plain
 * api wrappers (`getUserNonce`, `siweAuth`, `getUser`) and the wagmi
 * `signMessage` action — no nested composables. Errors are surfaced as a
 * typed `SiweError`; `onError` maps the step to a toast.
 */
export function useSiweMutation() {
  const toast = useToast()
  const userDataStore = useUserDataStore()
  const connection = useConnection()
  const chainId = useChainId()
  const { mutateAsync: signMessageAsync } = useSignMessage()
  const { performChecks, isSuccess: isWalletCheckSuccess } = useWalletChecks()
  const storageToken = useStorage('authToken', '')

  return useMutation({
    mutationFn: async () => {
      await performChecks()
      if (!isWalletCheckSuccess.value) throw new SiweError('wallet-check')

      const address = connection.address.value as Address

      let nonce: string
      try {
        nonce = (await getUserNonce(address)).nonce
      } catch (err) {
        log.info('fetchUserNonce error', err)
        throw new SiweError('fetch-nonce', err)
      }

      const message = new SiweMessage({
        address,
        statement: 'Sign in with Ethereum to the app.',
        nonce,
        chainId: chainId.value,
        uri: window.location.origin,
        domain: window.location.origin,
        version: '1'
      }).prepareMessage()

      let signature: string
      try {
        signature = await signMessageAsync({ message })
      } catch (err) {
        const rejected = (err as Error)?.name === 'UserRejectedRequestError'
        log.error('signMessage error', err)
        throw new SiweError(rejected ? 'sign-rejected' : 'sign-message', err)
      }

      let accessToken: string
      try {
        accessToken = (await siweAuth({ message, signature })).accessToken
      } catch (err) {
        log.info('siweAuth error', err)
        throw new SiweError('auth', err)
      }

      // Persist the token before fetching the user so the auth header is set.
      storageToken.value = accessToken
      await new Promise((resolve) => setTimeout(resolve, 100))

      let user: Awaited<ReturnType<typeof getUser>>
      try {
        user = await getUser(address)
      } catch (err) {
        log.info('getUser error', err)
        throw new SiweError('fetch-user', err)
      }

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
      toast.add({ title: TOAST_BY_STEP[step], color: 'error' })
    }
  })
}

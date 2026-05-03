import router from '@/router'
import { ref } from 'vue'
import { useUserDataStore } from '@/stores'
import type { User } from '@/types'
import { log } from '@/utils'
import { useStorage } from '@vueuse/core'
import { useSignMessage, useChainId, useConnection } from '@wagmi/vue'
import { SiweMessage } from 'siwe'
import { useWalletChecks } from '@/composables'
import { useGetUserQuery } from '@/queries/user.queries'
import { useSiweAuthMutation } from '@/queries/auth.queries'
import { getUserNonce } from '@/api/user.api'

export function useSiwe() {
  const isProcessing = ref(false)

  const toast = useToast()
  const userDataStore = useUserDataStore()

  const connection = useConnection()
  const chainId = useChainId()
  const {
    data: signature,
    error: signMessageError,
    mutateAsync: signMessageAsync
  } = useSignMessage()
  const { performChecks, isSuccess: isSuccessWalletCheck } = useWalletChecks()

  const { mutateAsync: siweAuthAsync } = useSiweAuthMutation()

  // Authenticated user data — fetched after the JWT is in storage.
  const {
    data: userData,
    error: fetchUserError,
    refetch: refetchUser
  } = useGetUserQuery({ pathParams: { address: connection.address } })

  async function siwe() {
    isProcessing.value = true
    await performChecks()
    if (!isSuccessWalletCheck.value) {
      isProcessing.value = false
      return
    }

    let nonce: string | undefined
    try {
      const result = await getUserNonce(connection.address.value as `0x${string}`)
      nonce = result.nonce
    } catch (error) {
      log.info('fetchUserNonce error', error)
    }
    if (!nonce) {
      toast.add({ title: 'Failed to fetch nonce', color: 'error' })
      isProcessing.value = false
      return
    }

    const siweMessage = new SiweMessage({
      address: connection.address.value as string,
      statement: 'Sign in with Ethereum to the app.',
      nonce,
      chainId: chainId.value,
      uri: window.location.origin,
      domain: window.location.origin,
      version: '1'
    })
    const message = siweMessage.prepareMessage()

    try {
      await signMessageAsync({ message })
    } catch (error) {
      if (signMessageError.value) {
        toast.add({
          title:
            signMessageError.value.name === 'UserRejectedRequestError'
              ? 'Message sign rejected: You need to sign the message to Sign in the CNC Portal'
              : 'Something went wrong: Unable to sign SIWE message',
          color: 'error'
        })
        log.error('signMessageError.value', error)
        isProcessing.value = false
      }
    }
    if (!signature.value) {
      isProcessing.value = false
      return
    }

    let token: string | undefined
    try {
      const result = await siweAuthAsync({
        body: { message, signature: signature.value }
      })
      token = result.accessToken
    } catch (error) {
      log.info('siweAuth error', error)
    }
    if (!token) {
      toast.add({ title: 'Failed to get authentication token', color: 'error' })
      isProcessing.value = false
      return
    }

    // save token and wait for it to be available
    const storageToken = useStorage('authToken', token)
    storageToken.value = token

    // wait for token to be available in storage
    await new Promise((resolve) => setTimeout(resolve, 100))

    await refetchUser()
    const user = userData.value
    if (!user || fetchUserError.value) {
      log.info('fetchUserError.value', fetchUserError.value)
      toast.add({ title: 'Failed to fetch user data', color: 'error' })
      isProcessing.value = false
      return
    }
    const userDataForStore: Partial<User> = user
    userDataStore.setUserData(
      userDataForStore.name || '',
      (userDataForStore.address || '') as `0x${string}`,
      userDataForStore.nonce || '',
      userDataForStore.imageUrl || ''
    )
    userDataStore.setAuthStatus(true)

    isProcessing.value = false
    router.push('/teams')
  }

  return { isProcessing, siwe }
}

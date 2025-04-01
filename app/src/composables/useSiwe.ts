import router from '@/router'
import { ref, watch } from 'vue'
import { useUserDataStore, useToastStore } from '@/stores'
import type { User } from '@/types'
import { log } from '@/utils'
import { useCustomFetch } from './useCustomFetch'
import { useStorage } from '@vueuse/core'
import { useAccount, useSignMessage, useChainId } from '@wagmi/vue'
import { SiweMessage } from 'siwe'
import { useWalletChecks } from '@/composables'

export function useSiwe() {
  //#region Refs
  const authData = ref({ signature: '', message: '' })
  const apiEndpoint = ref<string>('')
  //#endregion

  //#region Composables
  const { addErrorToast } = useToastStore()
  const userDataStore = useUserDataStore()
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: signature, error: signMessageError, signMessageAsync } = useSignMessage()
  const { performChecks, isProcessing, isSuccess: isSuccessWalletCheck } = useWalletChecks()
  //#endregion

  //#region useCustomeFetch
  const {
    error: siweError,
    data: siweData,
    execute: executeAddAuthData
  } = useCustomFetch('auth/siwe', { immediate: false })
    .post(authData)
    .json<{ accessToken: string }>()

  const {
    error: fetchUserNonceError,
    data: nonce,
    execute: executeFetchUserNonce
  } = useCustomFetch(apiEndpoint, { immediate: false }).get().json<Partial<User>>()

  const {
    error: fetchUserError,
    data: user,
    execute: executeFetchUser
  } = useCustomFetch(apiEndpoint, { immediate: false }).get().json<Partial<User>>()
  //#endregion

  //#region Functions
  async function siwe() {
    await performChecks()
    if (!isSuccessWalletCheck.value) return

    apiEndpoint.value = `user/nonce/${address.value}`
    await executeFetchUserNonce()
    if (!nonce.value) return

    const siweMessage = new SiweMessage({
      address: address.value as string,
      statement: 'Sign in with Ethereum to the app.',
      nonce: nonce.value.nonce,
      chainId: chainId.value,
      uri: window.location.origin,
      domain: window.location.origin,
      version: '1'
    })
    authData.value.message = siweMessage.prepareMessage()

    await signMessageAsync({ message: authData.value.message })
    if (!signature.value) return

    //update authData payload signature field with user's signature
    authData.value.signature = signature.value
    //send authData payload to backend for authentication
    await executeAddAuthData()
    //get returned JWT authentication token and save to storage
    const token = siweData.value?.accessToken
    if (!token) {
      addErrorToast('Failed to get authentication token')
      isProcessing.value = false
      return
    }

    // save token and wait for it to be available
    const storageToken = useStorage('authToken', '')
    storageToken.value = token

    // add small delay to ensure token is saved
    await new Promise((resolve) => setTimeout(resolve, 100))

    //update API endpoint to call
    apiEndpoint.value = `user/${address.value}`
    //fetch user data from backend
    await executeFetchUser()
    if (!user.value) {
      addErrorToast('Failed to fetch user data')
      isProcessing.value = false
      return
    }
    //save user data to user store
    const userData: Partial<User> = user.value
    userDataStore.setUserData(userData.name || '', userData.address || '', userData.nonce || '')
    userDataStore.setAuthStatus(true)

    isProcessing.value = false
    //redirect user to teams page
    router.push('/teams')
  }
  //#endregion

  //#region Watch
  watch(signMessageError, (newError) => {
    if (newError) {
      addErrorToast(
        newError.name === 'UserRejectedRequestError'
          ? 'Message sign rejected: You need to sign the message to Sign in the CNC Portal'
          : 'Something went wrong: Unable to sign SIWE message'
      )
      log.error('signMessageError.value', newError)
      isProcessing.value = false
    }
  })

  watch(siweError, (newError) => {
    if (newError) {
      log.info('siweError.value', newError)
      addErrorToast('Unable to authenticate with SIWE')
      isProcessing.value = false
    }
  })

  watch(fetchUserNonceError, (newError) => {
    if (newError) {
      log.info('fetchError.value', newError)
      addErrorToast('Unable to fetch nonce')
      isProcessing.value = false
    }
  })

  watch(fetchUserError, (newError) => {
    if (newError) {
      log.info('fetchUserError.value', fetchUserError.value)
      addErrorToast('Unable to fetch user data')
      isProcessing.value = false
    }
  })
  //#endregion

  return { isProcessing, siwe }
}

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
  const { data: signature, error: signMessageError, signMessage } = useSignMessage()
  const {
    performChecks,
    isProcessing,
    isSuccess: isSuccessWalletCheck,
    resetRefs
  } = useWalletChecks()
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
  } = useCustomFetch<string>(apiEndpoint, { immediate: false }).get().json()

  const {
    error: fetchUserError,
    data: user,
    execute: executeFetchUser
  } = useCustomFetch(apiEndpoint, { immediate: false }).get().json<Partial<User>>()
  //#endregion

  //#region Functions
  async function executeSiwe() {
    apiEndpoint.value = `user/nonce/${address.value}`
    await executeFetchUserNonce()
    if (!nonce.value) return

    const siweMessage = new SiweMessage({
      address: address.value as string,
      statement: 'Sign in with Ethereum to the app.',
      nonce: nonce.value.nonce,
      chainId: chainId.value,
      uri: window.location.origin,
      domain: window.location.host,
      version: '1'
    })

    authData.value.message = siweMessage.prepareMessage()

    signMessage({ message: authData.value.message })
  }

  async function siwe() {
    await performChecks()
  }
  //#endregion

  //#region Watch
  watch(isSuccessWalletCheck, async (newStatus) => {
    if (newStatus) await executeSiwe()
  })

  /**
   * Watch for new signature to send auth payload to the backend
   * to get a JWT token and retrieve user data to save to the store
   */
  watch(signature, async (newSignature) => {
    if (newSignature) {
      //update authData payload signature field with user's signature
      authData.value.signature = newSignature
      //send authData payload to backend for authentication
      await executeAddAuthData()
      //get returned JWT authentication token and save to storage
      const token = siweData.value?.accessToken
      const storageToken = useStorage('authToken', token)
      storageToken.value = token
      //update API endpoint to call
      apiEndpoint.value = `user/${address.value}`
      //fetch user data from backend
      await executeFetchUser()
      if (!user.value) return
      //save user data to user store
      const userData: Partial<User> = user.value
      userDataStore.setUserData(userData.name || '', userData.address || '', userData.nonce || '')
      userDataStore.setAuthStatus(true)

      isProcessing.value = false
      //redirect user to teams page
      router.push('/teams')
    }
  })

  watch(signMessageError, (newError) => {
    if (newError) {
      log.error('signMessageError.value', newError)
      addErrorToast('Unable to sign SIWE message')
      resetRefs()
    }
  })

  watch(siweError, (newError) => {
    if (newError) {
      log.info('siweError.value', newError)
      addErrorToast('Unable to authenticate with SIWE')
      resetRefs()
    }
  })

  watch(fetchUserNonceError, (newError) => {
    if (newError) {
      log.info('fetchError.value', newError)
      addErrorToast('Unable to fetch nonce')
      resetRefs()
    }
  })

  watch(fetchUserError, (newError) => {
    if (newError) {
      log.info('fetchUserError.value', fetchUserError.value)
      addErrorToast('Unable to fetch user data')
      resetRefs()
    }
  })
  //#endregion

  return { isProcessing, siwe }
}

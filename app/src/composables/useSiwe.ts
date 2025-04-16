import router from '@/router'
import { computed, ref } from 'vue'
import { useUserDataStore, useToastStore } from '@/stores'
import type { User } from '@/types'
import { log } from '@/utils'
import { useFetch, useStorage } from '@vueuse/core'
import { useAccount, useSignMessage, useChainId } from '@wagmi/vue'
import { SiweMessage } from 'siwe'
import { useCustomFetch, useWalletChecks } from '@/composables'
import { BACKEND_URL } from '@/constant/index'

export function useSiwe() {
  //#region Refs
  const authData = ref({ signature: '', message: '' })
  const isProcessing = ref(false)
  //#endregion

  //#region Composables
  const { addErrorToast } = useToastStore()
  const userDataStore = useUserDataStore()
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: signature, error: signMessageError, signMessageAsync } = useSignMessage()
  const { performChecks, isSuccess: isSuccessWalletCheck } = useWalletChecks()

  //#endregion

  const fetchNonceEndpoint = computed(() => `${BACKEND_URL}/api/user/nonce/${address.value}`)
  const userDataEndpoint = computed(() => `user/${address.value}`)

  //#region useCustomeFetch
  const {
    error: siweError,
    data: siweData,
    execute: executeAddAuthData
  } = useFetch(`${BACKEND_URL}/api/auth/siwe`, { immediate: false })
    .post(authData)
    .json<{ accessToken: string }>()

  const {
    error: fetchUserNonceError,
    data: nonce,
    execute: executeFetchUserNonce
  } = useFetch(fetchNonceEndpoint, { immediate: false }).get().json<Partial<User>>()

  const {
    error: fetchUserError,
    data: user,
    execute: executeFetchUser
  } = useCustomFetch(userDataEndpoint, { immediate: false }).get().json<Partial<User>>()
  //#endregion

  //#region Functions
  async function siwe() {
    isProcessing.value = true
    await performChecks()
    if (!isSuccessWalletCheck.value) {
      isProcessing.value = false
      return
    }

    // Fetch user nonce from backend
    await executeFetchUserNonce()

    // Check if nonce is fetched successfully
    if (!nonce.value || fetchUserNonceError.value) {
      log.info('fetchError.value', fetchUserNonceError.value)
      addErrorToast('Failed to fetch nonce')
      isProcessing.value = false
      return
    }

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

    try {
      await signMessageAsync({ message: authData.value.message })
    } catch (error) {
      if (signMessageError.value) {
        addErrorToast(
          signMessageError.value.name === 'UserRejectedRequestError'
            ? 'Message sign rejected: You need to sign the message to Sign in the CNC Portal'
            : 'Something went wrong: Unable to sign SIWE message'
        )
        log.error('signMessageError.value', error)
        isProcessing.value = false
      }
    }
    if (!signature.value) {
      isProcessing.value = false
      return
    }
    //update authData payload signature field with user's signature
    authData.value.signature = signature.value
    //send authData payload to backend for authentication
    await executeAddAuthData()
    //get returned JWT authentication token and save to storage
    const token = siweData.value?.accessToken
    if (!token || siweError.value) {
      log.info('siweError.value', siweError.value)
      addErrorToast('Failed to get authentication token')

      isProcessing.value = false
      return
    }

    // save token and wait for it to be available
    const storageToken = useStorage('authToken', token)
    storageToken.value = token

    // wait for token to be available in storage
    await new Promise((resolve) => setTimeout(resolve, 100))

    //fetch user data from backend
    await executeFetchUser()
    if (!user.value || fetchUserError.value) {
      log.info('fetchUserError.value', fetchUserError.value)
      addErrorToast('Failed to fetch user data')

      isProcessing.value = false
      return
    }
    //save user data to user store
    const userData: Partial<User> = user.value
    userDataStore.setUserData(userData.name || '', userData.address || '', userData.nonce || '', userData.imageUrl || '')
    userDataStore.setAuthStatus(true)

    isProcessing.value = false
    //redirect user to teams page
    router.push('/teams')
  }
  //#endregion

  return { isProcessing, siwe }
}

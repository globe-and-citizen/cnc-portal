import router from '@/router'
import { ref, watch } from 'vue'
import { useUserDataStore, useToastStore } from '@/stores'
import type { User } from '@/types'
import { log, parseError } from '@/utils'
import { useCustomFetch } from './useCustomFetch'
import { useStorage } from '@vueuse/core'
import { useAccount, useSignMessage, useChainId } from '@wagmi/vue'
import { SiweMessage } from 'siwe'
import { useWalletChecks } from '@/composables'

export function useSiwe() {
  //#region Refs
  const authData = ref({ signature: '', message: '' })
  const apiEndpoint = ref<string>('')

  //#region Composables
  const { addErrorToast } = useToastStore()
  const { setUserData, setAuthStatus } = useUserDataStore()
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: signature, error: signMessageError, signMessage } = useSignMessage()
  const { performChecks, isProcessing } = useWalletChecks()
  //#endregion

  //#region useCustomeFetch
  const {
    error: siweError,
    data: siweData,
    execute: executeAddAuthData
  } = useCustomFetch<string>('auth/siwe', { immediate: false }).post(authData).json()

  const {
    error: fetchUserNonceError,
    data: nonce,
    execute: executeFetchUserNonce
  } = useCustomFetch<string>(apiEndpoint, { immediate: false }).get().json()

  const {
    error: fetchUserError,
    data: user,
    execute: executeFetchUser
  } = useCustomFetch<string>(apiEndpoint, { immediate: false }).get().json()
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
    try {
      if (!(await performChecks())) {
        isProcessing.value = false
        return
      }

      if (address.value) {
        await executeSiwe()
      }
    } catch (_error) {
      log.error(parseError(_error))
      addErrorToast("Couldn't authenticate with SIWE")
      isProcessing.value = false
    }
  }
  //#endregion

  //#region Watch
  watch(address, async (newVal) => {
    if (newVal) {
      await executeSiwe()
    }
  })

  watch(signature, async (newVal) => {
    if (newVal) {
      authData.value.signature = newVal
      await executeAddAuthData()
      const token = siweData.value.accessToken
      const storageToken = useStorage('authToken', token)
      storageToken.value = token
      apiEndpoint.value = `user/${address.value}`
      await executeFetchUser()
      if (!user.value) return
      const userData: Partial<User> = user.value
      setUserData(userData.name || '', userData.address || '', userData.nonce || '')
      setAuthStatus(true)

      router.push('/teams')

      isProcessing.value = false
    }
  })

  watch(signMessageError, (newVal) => {
    if (newVal) {
      log.error('signMessageError.value', newVal)
      addErrorToast('Unable to sign SIWE message')
      isProcessing.value = false
    }
  })

  watch(siweError, (newVal) => {
    if (newVal) {
      log.info('siweError.value', newVal)
      addErrorToast('Unable to authenticate with SIWE')
      isProcessing.value = false
    }
  })

  watch(fetchUserNonceError, (newVal) => {
    if (newVal) {
      log.info('fetchError.value', newVal)
      addErrorToast('Unable to fetch nonce')
      isProcessing.value = false
    }
  })

  watch(fetchUserError, (newVal) => {
    if (newVal) {
      log.info('fetchUserError.value', fetchUserError.value)
      addErrorToast('Unable to fetch user data')
      isProcessing.value = false
    }
  })
  //#endregion

  return { isProcessing, siwe }
}

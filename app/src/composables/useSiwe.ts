import router from '@/router'
import { ref, watch } from 'vue'
import { useUserDataStore, useToastStore } from '@/stores'
import type { User } from '@/types'
import { log, parseError } from '@/utils'
import { useCustomFetch } from './useCustomFetch'
import { useStorage } from '@vueuse/core'
import { useAccount, useSignMessage, useChainId } from '@wagmi/vue'
import { SiweMessage } from 'siwe'
import { useWalletChecks } from './useWalletChecks'

function createSiweMessage(params: Partial<SiweMessage>) {
  // Create SiweMessage instance with provided data
  const siweMessage = new SiweMessage(params)
  // Call prepareMessage method to properly format the message
  return siweMessage.prepareMessage()
}

export function useSiwe() {
  const { addErrorToast } = useToastStore()
  const authData = ref({ signature: '', message: '' })
  const apiEndpoint = ref<string>('')
  const { address } = useAccount()
  const chainId = useChainId()
  const { performChecks, isProcessing } = useWalletChecks()

  watch(address, async (newVal) => {
    if (newVal) {
      await executeSiwe()
    }
  })

  const { data: signature, error: signMessageError, signMessage } = useSignMessage()

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
      useUserDataStore().setUserData(
        userData.name || '',
        userData.address || '',
        userData.nonce || ''
      )
      useUserDataStore().setAuthStatus(true)

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

  const {
    error: siweError,
    data: siweData,
    execute: executeAddAuthData
  } = useCustomFetch<string>('auth/siwe', { immediate: false }).post(authData).json()

  watch(siweError, (newVal) => {
    if (newVal) {
      log.info('siweError.value', newVal)
      addErrorToast('Unable to authenticate with SIWE')
      isProcessing.value = false
    }
  })

  const {
    error: fetchUserNonceError,
    data: nonce,
    execute: executeFetchUserNonce
  } = useCustomFetch<string>(apiEndpoint, { immediate: false }).get().json()

  watch(fetchUserNonceError, (newVal) => {
    if (newVal) {
      log.info('fetchError.value', newVal)
      addErrorToast('Unable to fetch nonce')
      isProcessing.value = false
    }
  })

  const {
    error: fetchUserError,
    data: user,
    execute: executeFetchUser
  } = useCustomFetch<string>(apiEndpoint, { immediate: false }).get().json()

  watch(fetchUserError, (newVal) => {
    if (newVal) {
      log.info('fetchUserError.value', fetchUserError.value)
      addErrorToast('Unable to fetch user data')
      isProcessing.value = false
    }
  })

  async function executeSiwe() {
    apiEndpoint.value = `user/nonce/${address.value}`
    await executeFetchUserNonce()
    if (!nonce.value) return

    authData.value.message = createSiweMessage({
      address: address.value as string,
      statement: 'Sign in with Ethereum to the app.',
      nonce: nonce.value.nonce,
      chainId: chainId.value,
      uri: window.location.origin,
      domain: window.location.host,
      version: '1'
    })

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

  return { isProcessing, siwe }
}

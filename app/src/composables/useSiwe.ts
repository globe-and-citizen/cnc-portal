import { SLSiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
import router from '@/router'
import { ref, watch } from 'vue'
import { useUserDataStore, useToastStore } from '@/stores'
import type { User } from '@/types'
import { log, parseError } from '@/utils'
import { useCustomFetch } from './useCustomFetch'
import { MetaMaskUtil } from '@/utils/web3Util'
import { useStorage } from '@vueuse/core'
import { useAccount, useSignMessage, useConnect } from '@wagmi/vue'

function createSiweMessageCreator(address: string, statement: string, nonce: string | undefined) {
  return new SLSiweMessageCreator({
    address,
    statement,
    nonce,
    version: '1',
    chainId: 1
  })
}

export function useSiwe() {
  const { addErrorToast } = useToastStore()
  const isProcessing = ref(false)
  const authData = ref({ signature: '', message: '' })
  const apiEndpoint = ref<string>('')
  const { connectors, connect, error: connectError } = useConnect()
  const { address, isConnected } = useAccount()

  watch(connectError, (newVal) => {
    if (newVal) {
      addErrorToast(parseError(newVal))
      log.error('connectError.value', newVal)
      isProcessing.value = false
    }
  })

  watch(address, async (newVal) => {
    if (newVal) {
      console.log(`connected address: `, newVal)
      await executeSiwe()
      // isProcessing.value = true

      // apiEndpoint.value = `user/nonce/${address.value}`
      // await executeFetchUserNonce()
      // if (!nonce.value) return

      // const statement = 'Sign in with Ethereum to the app.'
      // const siweMessageCreator = createSiweMessageCreator(
      //   address.value as string,
      //   statement,
      //   nonce.value.nonce
      // )

      // authData.value.message = await siweMessageCreator.create()

      // signMessage({ message: authData.value.message })
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

    const statement = 'Sign in with Ethereum to the app.'
    const siweMessageCreator = createSiweMessageCreator(
      address.value as string,
      statement,
      nonce.value.nonce
    )

    authData.value.message = await siweMessageCreator.create()

    signMessage({ message: authData.value.message })
  }

  async function siwe() {
    // Check if we have metamask installation befor continue the process
    if (!MetaMaskUtil.hasInstalledWallet()) {
      addErrorToast('MetaMask is not installed, Please install MetaMask to continue')
      return
    }

    try {
      isProcessing.value = true

      if (!isConnected.value) {
        console.log(`not connected...`)
        connectors.map((connector) => {
          console.log(`connector name: `, connector.name)
          const connectorName = connector.name.split(' ')[0]
          if (connectorName === 'MetaMask') {
            connect({ connector })
          }
        })
      }

      await executeSiwe()
      // apiEndpoint.value = `user/nonce/${account.address.value}`
      // await executeFetchUserNonce()
      // if (!nonce.value) return

      // const statement = 'Sign in with Ethereum to the app.'
      // const siweMessageCreator = createSiweMessageCreator(
      //   account.address.value as string,
      //   statement,
      //   nonce.value.nonce
      // )

      // authData.value.message = await siweMessageCreator.create()

      // signMessage({ message: authData.value.message })
    } catch (_error) {
      log.error(parseError(_error))
      addErrorToast("Couldn't authenticate with SIWE")
      isProcessing.value = false
    }
  }

  return { isProcessing, siwe }
}

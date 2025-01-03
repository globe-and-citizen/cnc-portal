import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { SLSiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
// import { SIWEAuthService } from '@/services/authService'
import router from '@/router'
import { ref, watch } from 'vue'
import { useUserDataStore } from '@/stores/user'
import type { User } from '@/types'
import { log, parseError } from '@/utils'
import { useCustomFetch } from './useCustomFetch'
import { useToastStore } from '@/stores/useToastStore'
import { MetaMaskUtil } from '@/utils/web3Util'
import { useStorage } from '@vueuse/core'
import { useClient, useAccount, useSignMessage } from '@wagmi/vue'

const ethersJsAdapter = EthersJsAdapter.getInstance() //new EthersJsAdapter()

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
  const authData = ref({signature: '', message: ''})
  const apiEndpoint = ref<string>('')
  const account = useAccount()
  const client = useClient()
  const { data: signature, error, signMessage } = useSignMessage()

  watch(signature, (newVal) => {
    if (newVal) {
      console.log(`signature: `, newVal)
      authData.value.signature = newVal
    }
  })

  const { 
    error: siweError, 
    data: siweData,
    execute: executeAddAuthData
  } = useCustomFetch<string>('auth/siwe', {immediate: false})
    .post(authData)
    .json()

  watch(siweError, (newVal) => {
    if (newVal) {
      log.info('siweError.value', siweError.value)
      addErrorToast('Unable to authenticate with SIWE')
    }
  })

  const { 
    error: fetchUserNonceError, 
    data: nonce,
    execute: executeFetchUserNonce 
  } = useCustomFetch<string>(
    //`user/nonce/${account.address.value}`
    apiEndpoint
  )
    .get()
    .json()

  watch(fetchUserNonceError, (newVal) => {
    if (newVal) {
      log.info('fetchError.value', newVal)
      addErrorToast('Unable to fetch nonce')
    }
  })

  async function siwe() {
    // Check if we have metamask installation befor continue the process
    if (!MetaMaskUtil.hasInstalledWallet()) {
      addErrorToast('MetaMask is not installed, Please install MetaMask to continue')
      return
    }

    try {
      isProcessing.value = true
      //const address = await ethersJsAdapter.getAddress()
      console.log(`address: `, account.address.value)
      // const { error: fetchError, data: nonce } = await useCustomFetch<string>(
      //   `user/nonce/${account.address.value}`
      // )
      //   .get()
      //   .json()

      // if (fetchError.value) {
      //   log.info('fetchError.value', fetchError.value)
      //   addErrorToast('Unable to fetch nonce')
      //   return
      // }

      apiEndpoint.value = `user/nonce/${account.address.value}`
      await executeFetchUserNonce()

      const statement = 'Sign in with Ethereum to the app.'
      const siweMessageCreator = createSiweMessageCreator(account.address.value as string, statement, nonce.value.nonce)

      // const message = await siweMessageCreator.create()
      authData.value.message = await siweMessageCreator.create()

      //const signature = await ethersJsAdapter.requestSign(message)
      signMessage({ message: authData.value.message})

      console.log(`signature: `, signature.value)

      // const { error: siweError, data: siweData } = await useCustomFetch<string>('auth/siwe')
      //   .post({ signature, message })
      //   .json()

      // if (siweError.value) {
      //   log.info('siweError.value', siweError.value)
      //   addErrorToast('Unable to authenticate with SIWE')
      //   return
      // }
      const token = siweData.value.accessToken
      const storageToken = useStorage('authToken', token)
      storageToken.value = token

      const { error: fetchUserError, data: user } = await useCustomFetch<string>(`user/${account.address.value}`)
        .get()
        .json()

      if (fetchUserError.value) {
        log.info('fetchUserError.value', fetchUserError.value)
        addErrorToast('Unable to fetch user data')
        return
      }

      const userData: Partial<User> = user.value
      useUserDataStore().setUserData(
        userData.name || '',
        userData.address || '',
        userData.nonce || ''
      )
      useUserDataStore().setAuthStatus(true)

      router.push('/teams')
    } catch (_error) {
      log.error(parseError(_error))
      addErrorToast("Couldn't authenticate with SIWE")
    } finally {
      isProcessing.value = false
    }
  }

  return { isProcessing, siwe }
}

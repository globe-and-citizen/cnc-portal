import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { SLSiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
// import { SIWEAuthService } from '@/services/authService'
import router from '@/router'
import { ref } from 'vue'
import { useUserDataStore } from '@/stores/user'
import type { User } from '@/types'
import { getFetchErrorMessage, log, parseError } from '@/utils'
import { useCustomFetch } from './useCustomFetch'
import { useToastStore } from '@/stores/useToastStore'
import { MetaMaskUtil } from '@/utils/web3Util'
import { useStorage } from '@vueuse/core'

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

  async function siwe() {
    // Check if we have metamask installation befor continue the process
    if (!MetaMaskUtil.hasInstalledWallet()) {
      addErrorToast('MetaMask is not installed, Please install MetaMask to continue')
      return
    }

    try {
      isProcessing.value = true
      const address = await ethersJsAdapter.getAddress()
      const { error: fetchError, data: nonce } = await useCustomFetch<string>(
        `user/nonce/${address}`
      )
        .get()
        .json()

      if (fetchError.value) {
        log.info(getFetchErrorMessage(fetchError.value))
        addErrorToast(getFetchErrorMessage(fetchError.value))
        log.info('SIWE rejected')
        return
      }

      const statement = 'Sign in with Ethereum to the app.'
      const siweMessageCreator = createSiweMessageCreator(address, statement, nonce.value.nonce)

      const message = await siweMessageCreator.create()
      const signature = await ethersJsAdapter.requestSign(message)

      const { error: siweError, data: siweData } = await useCustomFetch<string>('auth/siwe')
        .post({ signature, message })
        .json()

      if (siweError.value) {
        log.info(getFetchErrorMessage(siweError.value))
        addErrorToast(getFetchErrorMessage(siweError.value))
        return
      }
      const token = siweData.value.accessToken
      const storageToken = useStorage('authToken', token)
      storageToken.value = token

      const { error: fetchUserError, data: user } = await useCustomFetch<string>(`user/${address}`)
        .get()
        .json()

      if (fetchUserError.value) {
        log.info(getFetchErrorMessage(fetchUserError.value))
        addErrorToast(getFetchErrorMessage(fetchUserError.value))
        log.info('SIWE rejected')
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
    } catch (_error: any) {
      log.info(parseError(_error))
      addErrorToast(parseError(_error))
      log.info('SIWE rejected')
    } finally {
      isProcessing.value = false
    }
  }

  return { isProcessing, siwe }
}

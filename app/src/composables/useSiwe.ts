import { SiweAuthAPI } from '@/apis/authApi'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { SLSiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
import { SIWEAuthService } from '@/services/authService'
import router from '@/router'
import { ref } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import type { User } from '@/types'
import { parseError, getFetchErrorMessage, log } from '@/utils'
import { useCustomFetch, responseSatus } from './useCustomFetch'

const ethersJsAdapter = EthersJsAdapter.getInstance() //new EthersJsAdapter()
const siweAuthApi = new SiweAuthAPI()

function createSiweMessageCreator(address: string, statement: string, nonce: string | undefined) {
  return new SLSiweMessageCreator({
    address,
    statement,
    nonce,
    version: '1',
    chainId: '1'
  })
}

export function useSiwe() {
  const { addErrorToast } = useToastStore()
  const isProcessing = ref(false)

  async function siwe() {
    try {
      isProcessing.value = true
      const address = await ethersJsAdapter.getAddress()
      const { error: fetchError, data: nonce } = await useCustomFetch<string>(
        `user/nonce/${address}`
      )
        .get()
        .json()

      if (fetchError.value) {
        log.error(getFetchErrorMessage(responseSatus.value))
        addErrorToast(getFetchErrorMessage(responseSatus.value))
        return
      }

      const statement = 'Sign in with Ethereum to the app.'
      const siweMessageCreator = createSiweMessageCreator(address, statement, nonce.value.nonce)
      const siweAuthService = new SIWEAuthService(siweMessageCreator, ethersJsAdapter, siweAuthApi)

      await siweAuthService.authenticateUser()

      const { error: fetchUserError, data: user } = await useCustomFetch<string>(`user/${address}`)
        .get()
        .json()

      if (fetchUserError.value) {
        log.error(getFetchErrorMessage(responseSatus.value))
        addErrorToast(getFetchErrorMessage(responseSatus.value))
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
      log.error(parseError(_error))
      addErrorToast(parseError(_error))
    } finally {
      isProcessing.value = false
    }
  }

  return { isProcessing, siwe }
}

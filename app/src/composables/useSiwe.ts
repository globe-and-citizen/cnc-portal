import { SiweAuthAPI } from '@/apis/authApi'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { SLSiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
import { SIWEAuthService } from '@/services/authService'
import router from '@/router'
import { ref } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import type { User } from '@/types'
import { parseError } from '@/utils'
import { useCustomFetch } from './useCustomFetch'

const ethersJsAdapter = EthersJsAdapter.getInstance() //new EthersJsAdapter()
const siweAuthApi = new SiweAuthAPI()

const isProcessing = ref(false)

function createSiweMessageCreator(address: string, statement: string, nonce: string | undefined) {
  return new SLSiweMessageCreator({
    address,
    statement,
    nonce,
    version: '1',
    chainId: '1'
  })
}

async function siwe() {
  const { addErrorToast } = useToastStore()

  try {
    isProcessing.value = true
    const address = await ethersJsAdapter.getAddress()
    const response = await useCustomFetch<string>(`user/nonce/${address}`).get().json()
    const nonce = response.data.value.nonce
    const statement = 'Sign in with Ethereum to the app.'
    const siweMessageCreator = createSiweMessageCreator(address, statement, nonce)
    const siweAuthService = new SIWEAuthService(siweMessageCreator, ethersJsAdapter, siweAuthApi)

    await siweAuthService.authenticateUser()
    const result = await useCustomFetch<string>(`user/${address}`).get().json()
    const userData: Partial<User> = result.data.value
    useUserDataStore().setUserData(
      userData.name || '',
      userData.address || '',
      userData.nonce || ''
    )
    useUserDataStore().setAuthStatus(true)

    router.push('/teams')
  } catch (error: any) {
    isProcessing.value = false
    addErrorToast(parseError(error))
    console.log(
      '[app][src][utils][loginUtil.ts][signInWithEthereum] error instanceof Error: ',
      error instanceof Error
    )
  }
}

export function useSiwe() {
  return { isProcessing, siwe }
}

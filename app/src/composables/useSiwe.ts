import { FetchUserAPI } from '@/apis/userApi'
import { SiweAuthAPI } from '@/apis/authApi'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { SLSiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
import { SIWEAuthService } from '@/services/authService'
import router from '@/router'
import { useOwnerAddressStore } from '@/stores/address'
import { ref } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { ToastType } from '@/types'
import { useUserDataStore } from '@/stores/user'
import type { User } from '@/types'
import { parseError } from '@/utils'

const fetchUserApi = new FetchUserAPI()
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
  const { addToast } = useToastStore()

  try {
    isProcessing.value = true
    const address = await ethersJsAdapter.getAddress()
    const nonce = await fetchUserApi.getNonce(address)
    const statement = 'Sign in with Ethereum to the app.'
    const siweMessageCreator = createSiweMessageCreator(address, statement, nonce)
    const siweAuthService = new SIWEAuthService(siweMessageCreator, ethersJsAdapter, siweAuthApi)

    await siweAuthService.authenticateUser()
    const userData: Partial<User> = await fetchUserApi.getUser(address)
    useUserDataStore().setUserData(
      userData.name || '',
      userData.address || '',
      userData.nonce || ''
    )
    useOwnerAddressStore().setOwnerAddress(address)
    useUserDataStore().setAuthStatus(true)

    router.push('/teams')
  } catch (error: any) {
    isProcessing.value = false
    addToast({ type: ToastType.Error, message: parseError(error), timeout: 5000 })
    console.log(
      '[app][src][utils][loginUtil.ts][signInWithEthereum] error instanceof Error: ',
      error instanceof Error
    )
  }
}

export function useSiwe() {
  return { isProcessing, siwe }
}

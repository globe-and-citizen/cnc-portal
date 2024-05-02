import { FetchUserAPI } from '@/apis/userApi'
import { SiweAuthAPI } from '@/apis/authApi'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { SLSiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
import { SIWEAuthService } from '@/services/authService'
import router from '@/router'
import { useOwnerAddressStore } from '@/stores/address'
import { ref } from "vue";
import { useToastStore } from "@/stores/toast";
import { ToastType } from "@/types";
import { storeToRefs } from "pinia";
 
const fetchUserApi = new FetchUserAPI()
const ethersJsAdapter = new EthersJsAdapter()
const siweAuthApi = new SiweAuthAPI()

const isProcessing = ref(false)
const error = ref({isError: false, message: null})

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
  const { show } = useToastStore()

  try {
    isProcessing.value = true
    const address = await ethersJsAdapter.getAddress()
    const nonce = await fetchUserApi.getNonce(address)
    const statement = 'Sign in with Ethereum to the app.'
    const siweMessageCreator = createSiweMessageCreator(address, statement, nonce)
    const siweAuthService = new SIWEAuthService(siweMessageCreator, ethersJsAdapter, siweAuthApi)

    await siweAuthService.authenticateUser()
    useOwnerAddressStore().setOwnerAddress(address)
    router.push('/teams')
    

    /*console.log('authToken: ', SIWEAuthService.getToken())
    console.log('isAuthenticated: ', await SIWEAuthService.isAuthenticated())

    SIWEAuthService.logout()

    console.log('isAuthenticated: ', await SIWEAuthService.isAuthenticated())*/
  } catch (error) {
    isProcessing.value = false
    show(ToastType.Error, error as string)
    console.log('[app][src][utils][loginUtil.ts][signInWithEthereum] Error', error)
  }
}

export function useSiwe() {
  const toastStore = useToastStore()
  const { showToast, type: toastType, message: toastMessage } = storeToRefs(toastStore)
  
  return { isProcessing, showToast, toastType, toastMessage, siwe }
}
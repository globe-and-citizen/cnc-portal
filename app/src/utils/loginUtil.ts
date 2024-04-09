import { FetchUserAPI } from '@/apis/userApi'
import { SiweAuthAPI } from '@/apis/authApi'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { SLSiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'
import { SIWEAuthService } from '@/services/authService'

const fetchUserApi = new FetchUserAPI()
const ethersJsAdapter = new EthersJsAdapter()
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

export async function signInWithEthereum() {
  const address = await ethersJsAdapter.getAddress()

  //Get latest nonce from database to check if user is already registered
  //If nonce === undefined it means the user is not yet registered,
  //create a new user, otherwise use the latest value to sign
  const nonce = (await fetchUserApi.getUser(address)).nonce
  const statement = 'Sign in with Ethereum to the app.'
  let siweMessageCreator

  if (nonce) {
    siweMessageCreator = createSiweMessageCreator(address, statement, nonce)
  } else {
    //Register or create new user here
    const user = await fetchUserApi.createUser({ id: address })
    siweMessageCreator = createSiweMessageCreator(address, statement, user.nonce)
  }

  const siweAuthService = new SIWEAuthService(siweMessageCreator, ethersJsAdapter, siweAuthApi)

  //Authenticate or login user here
  await siweAuthService.authenticateUser()

  console.log('authToken: ', localStorage.getItem('authToken'))
  console.log('isAuthenticated: ', siweAuthService.isAuthenticated())

  siweAuthService.logout()

  console.log('isAuthenticated: ', siweAuthService.isAuthenticated())
}

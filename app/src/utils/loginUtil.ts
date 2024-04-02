import { FetchUserService } from '@/services/userService'
import { SIWEAuthService } from '@/services/authService'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { SLSiweMessageCreator } from '@/adapters/siweMessageCreatorAdapter'

const siweAuthService = new SIWEAuthService()
const fetchUserService = new FetchUserService()
const ethersJsAdapter = new EthersJsAdapter

async function createSiweMessage (address: string, statement: string, nonce: string) {
    return await (new SLSiweMessageCreator({
        address,
        statement,
        nonce,
        version: '1',
        chainId: '1'
    })).create()
}

export async function signInWithEthereum () {
    ethersJsAdapter.initialize()
    await ethersJsAdapter.connectWallet()
    const address = await ethersJsAdapter.getAddress()

    //Get latest nonce from database to check if user is already registered
    //If nonce === undefined it means the user is not yet registered, 
    //create a new user, otherwise use the latest value to sign
    const nonce = await fetchUserService.getUser(/*signer.*/address).nonce 
    let message: string

    if (nonce) {
        message = await createSiweMessage(
            address, 
            'Sign in with Ethereum to the app.',
            nonce
        );
    } else {
        //Register or create new user here
        const user = await fetchUserService.createUser(/*signer.*/{id: address})
        message = await createSiweMessage(
            address, 
            'Sign in with Ethereum to the app.',
            /*'JdqIpQPlVJ0Jyv6yu'*/
            user.nonce
        );
    }

    console.log(await ethersJsAdapter.requestSign(message));
    //Authenticate or login user here
    await siweAuthService.authenticateUser({signature: message})
}
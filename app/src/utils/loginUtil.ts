import { BrowserProvider } from 'ethers';
import { SiweMessage } from 'siwe';
import { FetchUserService } from '@/services/userService'
import { SIWEAuthService } from '@/services/authService'

const domain = window.location.host;
const origin = window.location.origin;
const provider = new BrowserProvider(window.ethereum);
const siweAuthService = new SIWEAuthService()
const fetchUserService = new FetchUserService()

function createSiweMessage (address, statement, nonce) {
    const message = new SiweMessage({
        domain,
        address,
        statement,
        nonce,
        uri: origin,
        version: '1',
        chainId: '1'
    });
    return message.prepareMessage();
}

/*function connectWallet () {
    provider.send('eth_requestAccounts', [])
    .catch(() => console.log('user rejected request'));
}*/

export async function signInWithEthereum () {
    const signer = await provider.getSigner();
    //Get latest nonce from database to check if user is already registered
    //If nonce === undefined it means the user is not yet registered, 
    //create a new user, otherwise use the latest value to sign
    const nonce = await fetchUserService.getUser(signer.address).nonce 
    let message: string

    if (nonce) {
        message = createSiweMessage(
            signer.address, 
            'Sign in with Ethereum to the app.',
            nonce
        );
    } else {
        //Register or create new user here
        const user = await fetchUserService.createUser(signer.address)
        message = createSiweMessage(
            signer.address, 
            'Sign in with Ethereum to the app.',
            /*'JdqIpQPlVJ0Jyv6yu'*/
            user.nonce
        );
    }
    //console.log("We are loading from loginUtil")
    console.log(await signer.signMessage(message));
    //Authenticate or login user here
    await siweAuthService.authenticateUser({signature: message})
}
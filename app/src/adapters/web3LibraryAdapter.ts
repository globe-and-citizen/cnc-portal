import { BrowserProvider /*, Signer */ } from 'ethers'
import { ref } from "vue";
import type { Ref } from "vue";

// Define interface for web3 library
export interface IWeb3Library {
  initialize(): void
  connectWallet(): Promise<void>
  requestSign(message: string): Promise<string>
  getAddress(): Promise<Ref<string | null>>
}

// Adapter for ethers.js
export class EthersJsAdapter implements IWeb3Library {
  private provider: any
  //private provider: ethers.providers.Web3Provider | null = null;
  //private signer: ethers.Signer | null = null;
  private signer: any
  private _address: Ref<string | null>

  constructor() {
    this._address = ref(null)
  }

  initialize(): void {
    // Initialize provider
    if ('ethereum' in window) {
      this.provider = new BrowserProvider(window.ethereum as any);
      (window.ethereum as any).on('accountsChanged', (accounts: string[]) =>{
        if (accounts.length > 0) {
          this._address.value = accounts[0]
          //console.log("[app][src][adapters][web3LibraryAdapter.ts][EthersjsAdapter][initialize] this._address: ", this._address)
        } else {
          this._address.value = null
        }
      })
    }
    //this.signer = this.provider.getSigner();
  }

  async connectWallet(): Promise<void> {
    if (!this.provider) {
      //throw new Error('Ethers.js adapter is not initialized');
      this.initialize()
    }

    // Prompt user to connect their wallet
    await this.provider.send('eth_requestAccounts', [])

    // Get signer with connected wallet
    this.signer = this.provider.getSigner()
  }

  async requestSign(message: string): Promise<string> {
    if (!this.signer) {
      //throw new Error('Wallet is not connected')/;
      await this.connectWallet()
    }

    // Sign the message with signer's private key
    const signature = (await this.signer).signMessage(message)

    return signature
  }

  async getAddress() {
    if (!this.signer) {
      //throw new Error('Wallet is not connected');
      await this.connectWallet()
    }

    //console.log('signer: ', (await this.signer).address)
    // Retrieve the address associated with the signer
    this._address.value = this._address.value? this._address.value: (await this.signer).address

    return this._address
  }
}

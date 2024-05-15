import type { Contract } from 'ethers'
import { BrowserProvider, /*, Signer */ ethers } from 'ethers'

// Define interface for web3 library
export interface IWeb3Library {
  initialize(): void
  connectWallet(): Promise<void>
  requestSign(message: string): Promise<string>
  //getAddressRef(): Promise<Ref<string | null>>
  getAddress(): Promise<string>
  getContract(address: string, abi: any): Promise<Contract>
  parseEther(value: string): bigint
}

// Adapter for ethers.js
export class EthersJsAdapter implements IWeb3Library {
  private static instance: IWeb3Library | undefined
  private provider: any
  //private provider: ethers.providers.Web3Provider | null = null;
  //private signer: ethers.Signer | null = null;
  private signer: any
  /*private _address: Ref<string | null>

  constructor() {
    this._address = ref(null)
  }*/

  initialize(): void {
    // Initialize provider
    if ('ethereum' in window) {
      this.provider = new BrowserProvider(window.ethereum as any)
      ;(window.ethereum as any).on('accountsChanged', async (/*accounts: string[]*/) => {
        this.signer = await this.provider.getSigner()
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

    return (await this.signer).address
  }

  async getContract(address: string, abi: any): Promise<Contract> {
    if (!this.signer) {
      //throw new Error('Wallet is not connected');
      await this.connectWallet()
    }

    return new ethers.Contract(address, abi, await this.signer)
  }

  parseEther(value: string): bigint {
    return ethers.parseEther(value)
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new EthersJsAdapter()
    }

    return this.instance
  }
}

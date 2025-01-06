import type { Contract } from 'ethers'
import { BrowserProvider, /*, Signer */ ethers } from 'ethers'
import { MetaMaskUtil } from '@/utils/web3Util'
import type { Signer } from 'ethers'
import type { ContractFactory } from 'ethers'
import { log } from '@/utils/generalUtil'
import type { InterfaceAbi } from 'ethers'
import type { TransactionResponse } from 'ethers'

// Define interface for web3 library
export interface IWeb3Library {
  initialize(): Promise<void>
  connectWallet(): Promise<void>
  requestSign(message: string): Promise<string>
  //getAddressRef(): Promise<Ref<string | null>>
  getAddress(): Promise<string>
  getBalance(address: string): Promise<string>
  getContract(address: string, abi: InterfaceAbi): Promise<Contract>
  getFactoryContract(abi: InterfaceAbi, bytecode: string): Promise<ContractFactory>
  parseEther(value: string): bigint
  formatEther(value: bigint): string
  sendTransaction(to: string, amount: string): Promise<TransactionResponse>
}

// TODO handle the case when the provider is not available
let metaMaskUtil: MetaMaskUtil

// Adapter for ethers.js
export class EthersJsAdapter implements IWeb3Library {
  private static instance: IWeb3Library | undefined

  //private provider: ethers.providers.Web3Provider | null = null;
  private provider!: BrowserProvider

  //private signer: ethers.Signer | null = null;
  private signer!: ethers.Signer
  // private _address: Ref<string | null>

  /**
   * Initialize the provider and signer
   */
  async initialize() {
    log.info('Start Initializing the provider & the signer')

    try {
      metaMaskUtil = new MetaMaskUtil()
    } catch (e) {
      log.error('MetaMask is not installed', e)
    }

    // Stop the initialisation when MetaMask is not installed
    if (!metaMaskUtil) {
      return
    }
    const metaProvider = metaMaskUtil.getProvider()
    this.provider = new BrowserProvider(metaProvider)

    // Listen for account change
    metaProvider.on('accountsChanged', async (/*accounts: string[]*/) => {
      log.info('Account changed')
      this.signer = await this.provider.getSigner()
    })

    log.info('Finish Initializing the provider & the signer')
  }

  /**
   * Connect wallet to the app
   */
  async connectWallet(): Promise<void> {
    if (!this.provider) {
      //throw new Error('Ethers.js adapter is not initialized');
      this.initialize()
    }
    await metaMaskUtil.switchNetwork()

    await this.provider.send('eth_requestAccounts', [])

    // Get signer with connected wallet
    this.signer = await this.provider.getSigner()
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
      await this.connectWallet()
    }

    return await this.signer.getAddress()
  }

  async getBalance(address: string): Promise<string> {
    if (!this.signer) {
      await this.connectWallet()
    }
    return this.formatEther(await this.provider.getBalance(address))
  }

  async getContract(address: string, abi: InterfaceAbi): Promise<Contract> {
    if (!this.signer) {
      //throw new Error('Wallet is not connected');
      await this.connectWallet()
    }

    return new ethers.Contract(address, abi, await this.signer)
  }

  async getFactoryContract(abi: InterfaceAbi, bytecode: string): Promise<ContractFactory> {
    if (!this.signer) {
      await this.connectWallet()
    }

    return new ethers.ContractFactory(abi, bytecode, await this.signer)
  }

  async sendTransaction(to: string, amount: string): Promise<TransactionResponse> {
    if (!this.signer) {
      await this.connectWallet()
    }

    const tx = ((await this.signer) as Signer).sendTransaction({
      to,
      value: this.parseEther(amount)
    })

    return tx
  }

  parseEther(value: string): bigint {
    return ethers.parseEther(value)
  }

  formatEther(value: bigint): string {
    return ethers.formatEther(value)
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new EthersJsAdapter()
    }

    return this.instance
  }

  async getProvider() {
    if (!this.provider) {
      await this.connectWallet()
    }
    return this.provider
  }

  async getSigner() {
    if (!this.signer) {
      await this.connectWallet()
    }
    return this.signer
  }
}

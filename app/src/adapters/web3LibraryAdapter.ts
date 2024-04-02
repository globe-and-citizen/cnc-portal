import { BrowserProvider/*, Signer */} from 'ethers';

// Define interface for web3 library
interface Web3Library {
  initialize(): void;
  connectWallet(): Promise<void>;
  requestSign(message: string): Promise<string>;
  getAddress(): Promise<string>
}

// Adapter for ethers.js
export class EthersJsAdapter implements Web3Library {
    private provider: any;
  //private provider: ethers.providers.Web3Provider | null = null;
  //private signer: ethers.Signer | null = null;
  private signer: any;

  initialize(): void {
    // Initialize provider
    this.provider = new BrowserProvider(window.ethereum);
    //this.signer = this.provider.getSigner();
  }

  async connectWallet(): Promise<void> {
    if (!this.provider) {
      throw new Error('Ethers.js adapter is not initialized');
    }

    // Prompt user to connect their wallet
    await this.provider.send('eth_requestAccounts', []);

    // Get signer with connected wallet
    this.signer = this.provider.getSigner();
  }

  async requestSign(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet is not connected');
    }

    // Sign the message with signer's private key
    const signature = (await this.signer).signMessage(message);
    
    return signature;
  }

  async getAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet is not connected');
    }

    //console.log('signer: ', (await this.signer).address)
    // Retrieve the address associated with the signer
    const address = (await this.signer).address;
    
    return address;
  }
}

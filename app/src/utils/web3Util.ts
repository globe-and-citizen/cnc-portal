import { NETWORK } from '@/constant'
import type { Network } from '@/types'

// TODO: this don't need to be a class
/*
The Goal of POO is to have an encapsulation of the attributes & restricts direct access to some of an object's components, which can prevent the accidental modification of data.

Here we juste need a function that return the provider and the network. No need to have an object for that
 */
interface EthereumProvider {
  request: (object: object) => Promise<void>
  on: (event: string, callback: () => void) => void
}

export class MetaMaskUtil {
  private provider: EthereumProvider
  private network: Network

  constructor() {
    if ('ethereum' in window) {
      this.provider = window.ethereum as EthereumProvider
    } else {
      throw new Error('MetaMask Not Installed')
    }

    this.network = NETWORK
  }

  /**
   * Check if we have an installed wallet
   * @returns boolean
   */
  static hasInstalledWallet() {
    return 'ethereum' in window
  }

  /**
   * Switch network to the app network:
   * @description This method request the user to switch the network of the wallet to the app network
   *
   */
  async switchNetwork() {
    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.network.chainId }]
      })
    } catch (error: unknown) {
      interface ErrorCode {
        code: number
      }
      if ((error as ErrorCode).code === 4902) {
        await this.provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: this.network.chainId,
              chainName: this.network.networkName,
              rpcUrls: [this.network.rpcUrl],
              nativeCurrency: {
                symbol: this.network.currencySymbol,
                decimals: 18
              },
              blockExplorerUrls: this.network.blockExplorerUrl
                ? [this.network.blockExplorerUrl]
                : null
            }
          ]
        })
      } else {
        throw error
      }
    }
  }

  getProvider() {
    return this.provider
  }

  getNetwork() {
    return this.network
  }
}

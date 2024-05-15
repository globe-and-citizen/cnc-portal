import { NETWORK } from '@/constant'
import type { Network } from "@/types"

export class MetaMaskUtil {
  private provider: any
  private network: Network

  constructor() {
    if ('ethereum' in window) {
      this.provider = window.ethereum
    } else {
      throw new Error('MetaMask Not Installed')
    }
    
    this.network = NETWORK 
  }

  async switchNetwork() {
    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.network.chainId }]
      })
    } catch (error: any) {
      if (error.code === 4902) {
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

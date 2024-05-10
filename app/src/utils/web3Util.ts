import { NETWORK_CONFIG } from "@/constant";

export class MetaMaskUtil {
  private provider: any

  constructor() {
    if ('ethereum' in window) {
      this.provider = window.ethereum
    } else {
      throw new Error("MetaMask Not Installed")
    }
  }

  async switchNetwork() {
    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{chainId: NETWORK_CONFIG.chainId}]
      })
    } catch(error: any) {
      if (error.code === 4902) {
        await this.provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: NETWORK_CONFIG.chainId,
            chainName: NETWORK_CONFIG.networkName,
            rpcUrls: [NETWORK_CONFIG.networkUrl],
            nativeCurrency: {
              symbol: NETWORK_CONFIG.currencySymbol, 
              decimals: 18
            },
            blockExplorerUrls: NETWORK_CONFIG.blockExplorerUrl? [NETWORK_CONFIG.blockExplorerUrl]: null
          }]
        })
      } else {
        throw error
      }
    }
  }
  
  getProvider() {
    return this.provider
  }
}
import { NETWORK_CONFIG } from "@/constant";

export async function switchWalletNetwork() {
    if ('ethereum' in window){
      try {
        await (window.ethereum as any).request({
          method: 'wallet_switchEthereumChain',
          params: [{chainId: NETWORK_CONFIG.chainId}]
        })
      } catch(error: any) {
        if (error.code === 4902) {
          await (window.ethereum as any).request({
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
  }
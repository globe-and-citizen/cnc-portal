import { http, createConfig } from '@wagmi/vue'
import { mainnet, sepolia, polygon } from '@wagmi/vue/chains'

export const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http()
  }
})

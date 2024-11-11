import { http, createConfig } from '@wagmi/vue'
import { mainnet, sepolia, polygon, hardhat } from '@wagmi/vue/chains'

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, hardhat],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http('https://sepolia.drpc.org'),
    [polygon.id]: http(),
    [hardhat.id]: http()
  }
})

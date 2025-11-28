import { http, createConfig } from '@wagmi/vue'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from '@wagmi/vue/chains'
import { injected } from '@wagmi/vue/connectors'

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, polygon, hardhat, polygonAmoy],
  connectors: [
    injected()
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http('https://sepolia.drpc.org'),
    [polygon.id]: http('https://polygon-rpc.com'),
    [polygonAmoy.id]: http(),
    [hardhat.id]: http()
  }
})

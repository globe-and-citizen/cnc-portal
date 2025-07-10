import { http, createConfig } from '@wagmi/core'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from '@wagmi/core/chains'

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, hardhat, polygonAmoy],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http('https://sepolia.drpc.org'),
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
    [hardhat.id]: http()
  }
})

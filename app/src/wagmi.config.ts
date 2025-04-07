import { http, createConfig } from '@wagmi/vue'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from '@wagmi/vue/chains'

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, hardhat, polygonAmoy],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/-LTvlR0N2abdEj4jbo-BkX_FUmZqwSc9'),
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
    [hardhat.id]: http()
  }
})

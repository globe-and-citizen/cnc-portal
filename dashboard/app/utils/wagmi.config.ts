import { http, createConfig } from '@wagmi/vue'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from '@wagmi/vue/chains'
import { injected } from '@wagmi/vue/connectors'

const polygonRpcUrl = import.meta.env.VITE_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com'

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, polygon, hardhat, polygonAmoy],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http('https://sepolia.drpc.org'),
    [polygon.id]: http(polygonRpcUrl),
    [polygonAmoy.id]: http(),
    [hardhat.id]: http()
  }
})

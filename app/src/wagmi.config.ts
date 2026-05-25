import { http, createConfig } from '@wagmi/vue'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from '@wagmi/vue/chains'
import { e2eMockConnector } from './e2e/mockConnector'

/**
 * In e2e mode the real injected wallet is replaced by an in-browser mock
 * connector, so Playwright can drive login/signing without the MetaMask
 * extension. Dev and production builds register no connector here and keep
 * relying on `injected()` (registered by `useSiweMutation` at connect time).
 */
const isE2E = import.meta.env.VITE_E2E === 'true'

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, hardhat, polygonAmoy],
  connectors: isE2E ? [e2eMockConnector()] : [],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http('https://sepolia.drpc.org'),
    [polygon.id]: http(import.meta.env.VITE_APP_POLYGON_RPC_URL || 'https://polygon-rpc.com'),
    [polygonAmoy.id]: http(),
    [hardhat.id]: http()
  }
})

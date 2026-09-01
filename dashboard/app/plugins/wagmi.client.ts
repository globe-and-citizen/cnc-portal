import { WagmiPlugin, http, createConfig } from '@wagmi/vue'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from '@wagmi/vue/chains'
import { injected } from '@wagmi/vue/connectors'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { fallback } from 'viem'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  // Multi-endpoint failover. viem's `http()` only retries the *same* endpoint,
  // so a dead, rate-limited, or gated provider takes reads down with it;
  // `fallback()` rotates to the next endpoint instead. The configured
  // `polygonRpcUrl` stays first (top priority) and the public endpoints (drpc,
  // publicnode) are the safety net.
  const wagmiConfig = createConfig({
    chains: [mainnet, sepolia, polygon, hardhat, polygonAmoy],
    connectors: [injected()],
    transports: {
      [mainnet.id]: fallback([
        http(),
        http('https://eth.drpc.org'),
        http('https://ethereum-rpc.publicnode.com')
      ]),
      [sepolia.id]: http('https://sepolia.drpc.org'),
      [polygon.id]: fallback([
        http(config.public.polygonRpcUrl),
        http('https://polygon.drpc.org'),
        http('https://polygon-bor-rpc.publicnode.com')
      ]),
      [polygonAmoy.id]: http(),
      [hardhat.id]: http()
    }
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        refetchOnWindowFocus: false,
        staleTime: 10_000
      }
    }
  })

  nuxtApp.vueApp.use(WagmiPlugin, { config: wagmiConfig })
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })

  return {
    provide: {
      wagmiConfig
    }
  }
})

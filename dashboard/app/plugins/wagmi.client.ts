import { WagmiPlugin, http, createConfig } from '@wagmi/vue'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from '@wagmi/vue/chains'
import { injected } from '@wagmi/vue/connectors'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  const wagmiConfig = createConfig({
    chains: [mainnet, sepolia, polygon, hardhat, polygonAmoy],
    connectors: [injected()],
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http('https://sepolia.drpc.org'),
      [polygon.id]: http(config.public.polygonRpcUrl),
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

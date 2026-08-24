/**
 * The embeddable widget runs on third-party pages, outside the main SPA's Vue
 * tree — it can't reuse `@/wagmi.config` (`@wagmi/vue`'s `createConfig`, five
 * chains, Vue-specific connector wiring). This is a standalone `@wagmi/core`
 * config for exactly the chain this deployment targets, built from the same
 * `NETWORK` source the main app resolves from `VITE_APP_NETWORK_ALIAS`.
 *
 * Connector selection mirrors `@/wagmi.config`: the e2e mock connector in e2e
 * mode (Playwright can't drive a real wallet extension), `injected()` for a
 * browser-installed wallet (MetaMask, Rabby, …) everywhere else.
 */
import { createConfig, http } from '@wagmi/core'
import { injected } from '@wagmi/connectors'
import { defineChain } from 'viem'
import { NETWORK } from '@/constant'
import { e2eMockConnector } from '@/e2e/mockConnector'

export const widgetChain = defineChain({
  id: parseInt(NETWORK.chainId, 16),
  name: NETWORK.networkName,
  nativeCurrency: { name: NETWORK.currencySymbol, symbol: NETWORK.currencySymbol, decimals: 18 },
  rpcUrls: { default: { http: [NETWORK.rpcUrl] } },
  ...(NETWORK.blockExplorerUrl
    ? { blockExplorers: { default: { name: 'Explorer', url: NETWORK.blockExplorerUrl } } }
    : {})
})

export const widgetWagmiConfig = createConfig({
  chains: [widgetChain],
  connectors: import.meta.env.VITE_E2E === 'true' ? [e2eMockConnector()] : [injected()],
  // viem's default 4s polling interval makes `waitForTransactionReceipt`
  // look stuck for up to 4s per transaction even on a local chain that
  // mines instantly. 1s keeps production RPC usage reasonable while making
  // the approve + deposit sequence feel responsive everywhere.
  pollingInterval: 1_000,
  transports: {
    [widgetChain.id]: http(NETWORK.rpcUrl)
  }
})

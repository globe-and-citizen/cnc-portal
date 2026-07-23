import { http, createConfig } from '@wagmi/vue'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from '@wagmi/vue/chains'
import { injected } from '@wagmi/connectors'
import { fallback } from 'viem'
import { e2eMockConnector } from './e2e/mockConnector'

/**
 * In e2e mode the real injected wallet is replaced by an in-browser mock
 * connector, so Playwright can drive login/signing without the MetaMask
 * extension. Dev and production builds register the browser-injected wallet
 * (MetaMask, Rabby, …) — wallet setup is owned entirely by this file so
 * consumers (e.g. `useSiweMutation`) just pick the first registered connector.
 */
const isE2E = import.meta.env.VITE_E2E === 'true'

/**
 * Multi-endpoint failover. viem's `http()` only retries the *same* endpoint, so
 * a dead, rate-limited, or gated provider takes reads down with it; `fallback()`
 * rotates to the next endpoint instead. A configured RPC URL stays first (top
 * priority) and the public endpoints (drpc, publicnode) are the safety net.
 * These are current-state reads (`eth_call`/`getBalance`), so publicnode's log
 * pruning is irrelevant here.
 *
 * `batch: true` collapses every RPC call fired in the same tick into a single
 * JSON-RPC POST. Feeds that fan out many calls at once — e.g. the accounting
 * event scan's one `getBlock` per block — then cost one HTTP round-trip instead
 * of N, without changing any call site.
 */
const polygonRpcUrl = import.meta.env.VITE_APP_POLYGON_RPC_URL

const batched = { batch: true } as const

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, hardhat, polygonAmoy],
  connectors: isE2E ? [e2eMockConnector()] : [injected()],
  transports: {
    [mainnet.id]: fallback([
      http(undefined, batched),
      http('https://eth.drpc.org', batched),
      http('https://ethereum-rpc.publicnode.com', batched)
    ]),
    [sepolia.id]: http('https://sepolia.drpc.org', batched),
    [polygon.id]: fallback([
      ...(polygonRpcUrl ? [http(polygonRpcUrl, batched)] : []),
      http('https://polygon.drpc.org', batched),
      http('https://polygon-bor-rpc.publicnode.com', batched)
    ]),
    [polygonAmoy.id]: http(undefined, batched),
    [hardhat.id]: http(undefined, batched)
  }
})

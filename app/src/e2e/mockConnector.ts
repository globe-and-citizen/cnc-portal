/**
 * E2E-only wagmi connector.
 *
 * Wraps a viem local account (Hardhat test account #0) so Playwright e2e
 * tests can drive wallet flows — connect, network switch, message signing,
 * and on-chain transactions — without the MetaMask browser extension.
 * Signing is performed locally with the test private key; transactions are
 * submitted directly to the chain's RPC endpoint, so a running Hardhat node
 * is required for any flow that writes on-chain (the SIWE login flow itself
 * needs no running chain).
 *
 * This connector is registered only when `VITE_E2E === 'true'`
 * (see `wagmi.config.ts`); it is never used in dev or production builds.
 */
import { createConnector } from '@wagmi/vue'
import {
  type Hex,
  SwitchChainError,
  createWalletClient,
  hexToBigInt,
  http,
  numberToHex
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

/** Hardhat's well-known accounts #0-#3 — public test keys, safe to commit. */
const E2E_PRIVATE_KEYS: Hex[] = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6'
]

/**
 * Selects which of the above accounts the connector signs as. Set via
 * `localStorage.setItem('e2eAccountIndex', '1')` before a reload — read once
 * at connector construction (page load), so switching accounts requires a
 * fresh load same as any other identity switch in this mock (see module doc).
 */
function readE2EAccountIndex(): number {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('e2eAccountIndex') : null
  const index = raw ? Number(raw) : 0
  return Number.isInteger(index) && index >= 0 && index < E2E_PRIVATE_KEYS.length ? index : 0
}

type RpcRequest = { method: string; params?: readonly unknown[] }

export function e2eMockConnector() {
  const account = privateKeyToAccount(E2E_PRIVATE_KEYS[readE2EAccountIndex()] as Hex)

  return createConnector((config) => {
    let connected = false
    let currentChainId = config.chains[0].id

    const provider = {
      async request({ method, params = [] }: RpcRequest): Promise<unknown> {
        switch (method) {
          case 'eth_chainId':
            return numberToHex(currentChainId)
          case 'eth_accounts':
          case 'eth_requestAccounts':
            return [account.address]
          case 'personal_sign': {
            const [data] = params as [Hex]
            return account.signMessage({ message: { raw: data } })
          }
          case 'eth_signTypedData_v4': {
            const [, typedData] = params as [string, string]
            return account.signTypedData(JSON.parse(typedData))
          }
          case 'eth_sendTransaction': {
            const [tx] = params as [{ to?: Hex; data?: Hex; value?: Hex; gas?: Hex; from?: Hex }]
            const chain = config.chains.find((c) => c.id === currentChainId)
            if (!chain)
              throw new Error(`e2eMockConnector: chain ${currentChainId} is not configured`)
            const walletClient = createWalletClient({ account, chain, transport: http() })
            return walletClient.sendTransaction({
              to: tx.to,
              data: tx.data,
              value: tx.value ? hexToBigInt(tx.value) : undefined,
              gas: tx.gas ? hexToBigInt(tx.gas) : undefined
            })
          }
          case 'wallet_switchEthereumChain':
            return null
          default:
            throw new Error(`e2eMockConnector: unhandled RPC method "${method}"`)
        }
      }
    }

    return {
      id: 'e2e-mock',
      name: 'E2E Mock Wallet',
      type: 'mock',
      async connect({ chainId }: { chainId?: number } = {}) {
        connected = true
        if (chainId) currentChainId = chainId
        // `as never` matches wagmi's own mock connector: the connector type
        // expects a `withCapabilities`-conditional account shape we don't use.
        return { accounts: [account.address] as never, chainId: currentChainId }
      },
      async disconnect() {
        connected = false
      },
      async getAccounts() {
        return [account.address] as const
      },
      async getChainId() {
        return currentChainId
      },
      async getProvider() {
        return provider
      },
      async isAuthorized() {
        return connected
      },
      async switchChain({ chainId }: { chainId: number }) {
        const chain = config.chains.find((c) => c.id === chainId)
        if (!chain) throw new SwitchChainError(new Error(`Chain ${chainId} is not configured`))
        currentChainId = chainId
        config.emitter.emit('change', { chainId })
        return chain
      },
      onAccountsChanged() {},
      onChainChanged(chainId: string) {
        currentChainId = Number(chainId)
      },
      onDisconnect() {
        connected = false
        config.emitter.emit('disconnect')
      }
    }
  })
}

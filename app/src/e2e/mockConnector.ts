/**
 * E2E-only wagmi connector.
 *
 * Wraps a viem local account (Hardhat test account #0) so Playwright e2e
 * tests can drive wallet flows — connect, network switch and message
 * signing — without the MetaMask browser extension. Signing is performed
 * locally with the test private key, so the login (SIWE) flow needs no
 * running chain.
 *
 * This connector is registered only when `VITE_E2E === 'true'`
 * (see `wagmi.config.ts`); it is never used in dev or production builds.
 */
import { createConnector } from '@wagmi/vue'
import { type Hex, SwitchChainError, numberToHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

/** Hardhat's well-known account #0 — a public test key, safe to commit. */
const E2E_PRIVATE_KEY: Hex = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

type RpcRequest = { method: string; params?: readonly unknown[] }

export function e2eMockConnector() {
  const account = privateKeyToAccount(E2E_PRIVATE_KEY)

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

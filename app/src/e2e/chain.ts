/**
 * Deterministic constants of the E2E Hardhat node, shared by the Vite E2E
 * build, the Playwright configuration, and the Playwright fixtures.
 *
 * Hardhat derives a contract address from the deployer nonce, so the contracts
 * that `test/e2e/global-setup.ts` deploys from account #0 on a fresh node
 * always land on these addresses, in this exact order: USDC, USDCe, SafeL2,
 * SafeProxyFactory, CompatibilityFallbackHandler, MultiSend, MultiSendCallOnly.
 *
 * This module must stay free of `import.meta.env` and browser globals because
 * Node-side test code imports it as well.
 */
export const E2E_RPC_URL = 'http://127.0.0.1:8545'

/** Unreachable origin; `test/e2e/safe/safe-transaction-service.ts` stubs it. */
export const E2E_SAFE_TX_SERVICE_URL = 'https://safe-e2e.invalid'

export const E2E_TOKENS = {
  usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  usdcE: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
} as const

export const E2E_SAFE_INFRA = {
  singleton: '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
  proxyFactory: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
  fallbackHandler: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9'
} as const

export const E2E_SAFE_LIBRARIES = {
  multiSend: '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707',
  multiSendCallOnly: '0x0165878a594ca255338adfa4d48449f69242eb8f'
} as const

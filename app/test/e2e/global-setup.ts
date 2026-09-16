import { ensureE2EInfrastructure, publicClient } from './e2e-chain'

/**
 * Playwright starts the Hardhat web server before this hook, but the RPC port
 * can accept connections a moment before the node answers requests.
 */
async function waitForHardhat(): Promise<void> {
  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    try {
      await publicClient.getChainId()
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  throw new Error('E2E Hardhat node did not become available within 30 seconds')
}

export default async function globalSetup(): Promise<void> {
  await waitForHardhat()
  await ensureE2EInfrastructure()
}

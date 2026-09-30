import { ensureE2EInfrastructure, publicClient } from './e2e-chain.ts'

async function waitForHardhat(): Promise<void> {
  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    try {
      const chainId = await publicClient.getChainId()
      if (chainId !== 31_337) {
        throw new Error(`Browser acceptance requires chain 31337, received ${chainId}`)
      }
      return
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Browser acceptance requires')) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  throw new Error('The browser-acceptance Hardhat node did not become available within 30 seconds')
}

async function prepareBrowserEnvironment(): Promise<void> {
  await waitForHardhat()
  await ensureE2EInfrastructure()
  console.log('Browser-acceptance contracts are ready')
}

prepareBrowserEnvironment().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})

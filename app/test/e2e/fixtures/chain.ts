import { revertChain, snapshotChain } from '../e2e-chain'
import { test as base } from './base'

interface ChainFixtures {
  chainIsolation: void
}

/** Browser fixture for scenarios that read or mutate the shared local chain. */
export const test = base.extend<ChainFixtures>({
  chainIsolation: [
    async ({}, use) => {
      const snapshotId = await snapshotChain()
      try {
        await use()
      } finally {
        await revertChain(snapshotId)
      }
    },
    { auto: true }
  ]
})

export { expect } from '@playwright/test'

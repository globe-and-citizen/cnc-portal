import { metaMaskFixtures } from '@synthetixio/synpress/playwright'
import { testWithSynpress } from '@synthetixio/synpress'
import connectedSetup from 'test/wallet-setup/connected.setup'

const test = testWithSynpress(metaMaskFixtures(connectedSetup))

const { expect, describe } = test

describe('Dashboard', () => {
  test('should be able to access the dashboard', async ({ page }) => {
    expect(await page.locator('h1[data-test="title"]').textContent()).toBe(
      'Welcome To the CNC portal'
    )
  })
})

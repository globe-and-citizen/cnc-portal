import { metaMaskFixtures } from '@synthetixio/synpress/playwright'
import { testWithSynpress } from '@synthetixio/synpress'
import connectedSetup from 'test/wallet-setup/connected.setup'

const test = testWithSynpress(metaMaskFixtures(connectedSetup))

const { expect, describe } = test

describe('Dashboard', () => {
  test('should be able to access the dashboard', async ({ page }) => {
    await page.locator('data-test=tip-button').click()
    await page.waitForURL('http://localhost:5173/teams')
    expect(page.url()).toContain('http://localhost:5173/teams')
  })
})

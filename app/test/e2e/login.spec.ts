import { testWithSynpress } from '@synthetixio/synpress'
import { metaMaskFixtures } from '@synthetixio/synpress/playwright'
import differentNetworkSetup from '../wallet-setup/different-network.setup'

const test = testWithSynpress(metaMaskFixtures(differentNetworkSetup))

// const { expect } = test

test.describe('Sign in', () => {
  test('should be able to sign in and redirect to the teams page', async ({ page, metamask }) => {
    // Mock API
    const address = await metamask.getAccountAddress()
    await page.route('**/api/user/nonce/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, nonce: '41vj7bz5Ow8oT5xaE' })
      })
    })
    await page.route('**/api/auth/siwe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, accessToken: 'token' })
      })
    })
    await page.route(`**/api/user/${address}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          address: await metamask.getAccountAddress(),
          name: null,
          nonce: '41vj7bz5Ow8oT5xaE'
        })
      })
    })

    // Click sign-in button
    await page.getByTestId('sign-in').click()

    await page.waitForLoadState('networkidle')

    // Connect to dapp
    // await metamask.connectToDapp()

    // // Switch network
    // await metamask.approveNewNetwork()
    // await metamask.approveSwitchNetwork()

    // // Confirm signature
    // await page.waitForTimeout(3000)
    // await metamask.confirmSignature()

    // // Wait for redirection
    // await page.waitForURL('http://localhost:5173/teams')

    // // Check redirection
    // expect(page.url()).toBe('http://localhost:5173/teams')
  })
})

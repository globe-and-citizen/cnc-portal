import { testWithSynpress } from '@synthetixio/synpress'
import { metaMaskFixtures } from '@synthetixio/synpress/playwright'
import connectedSetup from '../wallet-setup/connected.setup'

const test = testWithSynpress(metaMaskFixtures(connectedSetup))

// const { expect } = test

test.describe('Sign in', () => {
  test('should be able to sign in and redirect to the teams page', async ({ page, metamask }) => {
    // Get wallet address
    const address = await metamask.getAccountAddress()
    
    // Set up API mocks before navigation
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

    await page.route('**/api/teams', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ teams: [] })
      })
    })

    // Navigate to the app
    await page.goto('/')
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded')

    // Click sign-in button
    await page.getByTestId('sign-in').click()

    // Wait for wallet connection request to be triggered
    await page.waitForTimeout(2000)

    // Connect to dapp (this will handle the MetaMask popup)
    await metamask.connectToDapp()

    // Switch network
    await metamask.approveNewNetwork()
    await metamask.approveSwitchNetwork()

    // Confirm signature
    await page.waitForTimeout(3000)
    await metamask.confirmSignature()

    // Wait for redirection
    await page.waitForURL('http://localhost:5173/teams')

    // Check redirection
    // expect(page.url()).toBe('http://localhost:5173/teams')
  })
})

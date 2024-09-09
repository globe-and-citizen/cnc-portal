import type { Page } from '@playwright/test'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from 'test/wallet-setup/basic.setup'

export const test = metaMaskFixtures(basicSetup).extend<{
  login: () => Promise<void>
}>({
  login: async ({ page, metamask }, use) => {
    await use(async () => {
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
            address,
            name: null,
            nonce: '41vj7bz5Ow8oT5xaE'
          })
        })
      })
      await page.goto('http://localhost:5173/login')
      await page.getByTestId('sign-in').click()
      await page.waitForLoadState('networkidle')
      await metamask.connectToDapp()
      await page.waitForLoadState('networkidle')
      await metamask.confirmSignature()
      await page.addInitScript(() => {
        window.localStorage.setItem('isAuth', 'true')
        window.localStorage.setItem('name', 'test')
        window.localStorage.setItem('ownerAddress', address)
        window.localStorage.setItem('nonce', '41vj7bz5Ow8oT5xaE')
      })
      await page.waitForURL('http://localhost:5173/teams')
    })
  }
})

export const { expect } = test

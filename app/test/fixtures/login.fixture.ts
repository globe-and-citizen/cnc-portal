import { metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from 'test/wallet-setup/basic.setup'

export const test = metaMaskFixtures(basicSetup).extend<{
  login: () => Promise<void>
}>({
  login: async ({ page, metamask }, use) => {
    await use(async () => {
      const address = await metamask.getAccountAddress()
      await page.route(`**/api/auth/token`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true
          })
        })
      })
      await page.addInitScript(() => {
        window.localStorage.setItem('isAuth', 'true')
        window.localStorage.setItem('name', 'test')
        window.localStorage.setItem('ownerAddress', address)
        window.localStorage.setItem('nonce', '41vj7bz5Ow8oT5xaE')
        window.localStorage.setItem('authToken', '1234567890')
      })
      await page.reload()
      await metamask.connectToDapp()
    })
  }
})

export const { expect } = test

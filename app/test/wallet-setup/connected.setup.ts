import { defineWalletSetup } from '@synthetixio/synpress'
import { getExtensionId, MetaMask } from '@synthetixio/synpress/playwright'

const SEED_PHRASE = 'test test test test test test test test test test test junk'
const PASSWORD = 'Password123'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const extensionId = await getExtensionId(context, 'MetaMask')
  const metamask = new MetaMask(context, walletPage, PASSWORD, extensionId)

  await metamask.importWallet(SEED_PHRASE)

  const page = await context.newPage()

  await page.goto('http://localhost:5173')

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
  await page.route(`**/api/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        name: null,
        nonce: '41vj7bz5Ow8oT5xaE'
      })
    })
  })

  // Click sign-in button
  await page.getByTestId('sign-in').click()

  // Connect to dapp
  await metamask.connectToDapp()

  // Add and switch to new network
  await metamask.approveNewNetwork()
  await metamask.approveSwitchNetwork()

  // Confirm signature
  await page.waitForTimeout(3000)
  await metamask.confirmSignature()

  await page.evaluate(() => {
    window.localStorage.setItem('isAuth', 'true')
    window.localStorage.setItem('name', 'Local 1')
    window.localStorage.setItem('ownerAddress', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
    window.localStorage.setItem('nonce', '41vj7bz5Ow8oT5xaE')
    window.localStorage.setItem('authToken', '1234567890')
  })

  await page.reload()
  await page.waitForURL('http://localhost:5173')
})

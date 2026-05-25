import { test, expect } from './fixtures'

/**
 * SIWE login flow, driven by the in-browser e2e mock connector.
 *
 * No MetaMask extension and no running chain are involved: the mock
 * connector (registered when `VITE_E2E=true`) signs the SIWE message
 * locally with Hardhat test account #0, and the backend is stubbed so the
 * test stays hermetic and fast.
 */

// Hardhat account #0 — the address the mock connector signs with.
const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const NONCE = '41vj7bz5Ow8oT5xaE'

const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body)
})

test.describe('Sign in', () => {
  test('signs in with the mock wallet and redirects to the teams page', async ({ page }) => {
    // Catch-all: any backend call we don't explicitly stub returns an empty
    // 200. This prevents the global axios 401 interceptor (which logs the
    // user out and redirects to /login) from kicking in on background calls
    // the post-login screens make (e.g. /api/notification). Scoped to the
    // backend origin via regex so Vite source imports under
    // `/src/api/index.ts` aren't intercepted.
    await page.route(/\/\/[^/]+:4000\/api\//, (route) => route.fulfill(json({})))
    await page.route('**/api/user/nonce/**', (route) => route.fulfill(json({ nonce: NONCE })))
    await page.route('**/api/auth/siwe', (route) =>
      route.fulfill(json({ accessToken: 'e2e.test.token' }))
    )
    await page.route('**/api/user/0x*', (route) =>
      route.fulfill(
        json({ address: TEST_ADDRESS, name: 'E2E Tester', nonce: NONCE, imageUrl: null })
      )
    )
    await page.route('**/api/teams**', (route) => route.fulfill(json({ teams: [] })))

    await page.goto('/')

    // One click: connect (mock wallet) -> sign SIWE message -> authenticate.
    await page.getByTestId('sign-in').click()

    // Successful login pushes the router to the teams page. We poll the URL
    // with `toHaveURL` rather than `waitForURL` because Vue Router's SPA
    // navigation uses pushState and never fires a `load` event, which would
    // otherwise hang `waitForURL`'s default `waitUntil: 'load'`.
    await expect(page).toHaveURL(/\/teams$/, { timeout: 15000 })
  })
})

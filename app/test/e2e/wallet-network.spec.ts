import { expect, test } from './fixtures/mocked'

const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

test.describe(
  '[US-AUTH-004] Wallet network recovery',
  { tag: ['@browser', '@mocked', '@parallel-safe'] },
  () => {
    /**
     * Covers:
     * - [AC-US-AUTH-004-01]
     * - [AC-US-AUTH-004-02]
     * - [AC-US-AUTH-004-03]
     * - [AC-US-AUTH-004-04]
     * - [AC-US-AUTH-004-06]
     */
    test('locks the workspace and resumes the same session after a rejected switch and retry', async ({
      page
    }) => {
      await page.route(/\/\/[^/]+(?::\d+)?\/api\//, async (route) => {
        const { pathname } = new URL(route.request().url())
        const body = pathname.startsWith('/api/user/nonce/')
          ? { nonce: '41vj7bz5Ow8oT5xaE' }
          : pathname === '/api/auth/siwe'
            ? { accessToken: 'e2e.test.token' }
            : pathname.startsWith('/api/user/0x')
              ? { address, name: 'Network Tester', imageUrl: null }
              : pathname === '/api/teams' || pathname === '/api/notification'
                ? []
                : {}
        await route.fulfill({ json: body })
      })
      await page.goto('/')
      await page.getByTestId('sign-in').click()
      await expect(page).toHaveURL(/\/teams$/)
      await expect(page.locator('[data-test="team-list"]')).toBeVisible()
      await page.locator('[data-test="add-team-card"]').click()
      await expect(page.getByRole('dialog')).toBeVisible()

      await page.evaluate(async () => {
        const provider = (
          window as unknown as {
            ethereum: {
              request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
            }
          }
        ).ethereum
        const request = provider.request.bind(provider)
        localStorage.setItem('wallet-network-test-submissions', '0')
        provider.request = async (args) => {
          if (args.method === 'eth_sendTransaction' || args.method === 'wallet_sendTransaction') {
            const count = Number(localStorage.getItem('wallet-network-test-submissions'))
            localStorage.setItem('wallet-network-test-submissions', String(count + 1))
          }
          return request(args)
        }
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x1' }]
        })
        localStorage.setItem('cnc-e2e-reject-next-chain-switch', 'true')
      })
      await expect(page.locator('[data-test="network-lock-screen"]')).toBeVisible()
      await expect(page.locator('[data-test="team-list"]')).toHaveCount(0)
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.locator('[data-test="network-switch-error"]')).toHaveCount(0)
      await expect(page).toHaveURL(/\/teams$/)

      await page.locator('[data-test="switch-network"]').click()
      await expect(page.locator('[data-test="network-switch-error"]')).toBeVisible()
      await expect(page.locator('[data-test="network-lock-screen"]')).toBeVisible()

      await page.locator('[data-test="switch-network"]').click()
      await expect(page.locator('[data-test="network-lock-screen"]')).toHaveCount(0)
      await expect(page.locator('[data-test="team-list"]')).toBeVisible()
      await expect(page).toHaveURL(/\/teams$/)
      expect(await page.evaluate(() => localStorage.getItem('isAuth'))).toBe('true')
      expect(
        await page.evaluate(() => localStorage.getItem('wallet-network-test-submissions'))
      ).toBe('0')
    })
  }
)

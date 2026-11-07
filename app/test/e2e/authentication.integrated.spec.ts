import { expect, test } from './fixtures/integrated'
import { ownerNonce } from './company/company-chain'
import { signInToRealStack } from './company/real-company-page'
import { integratedBackendUrl } from './integrated-api'

test.describe('[US-AUTH-001] Integrated client authentication', { tag: '@integrated' }, () => {
  /**
   * Covers:
   * - [AC-US-AUTH-001-01]
   * - [AC-US-AUTH-001-07]
   */
  test('authenticates through SIWE without submitting a chain transaction', async ({
    page,
    request
  }) => {
    const nonceBefore = await ownerNonce()
    const authentication = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/auth/siwe'
    )

    await signInToRealStack(page)

    expect((await authentication).ok()).toBe(true)
    await expect(page).toHaveURL(/\/teams$/)
    expect(await ownerNonce()).toBe(nonceBefore)
    await expect(page.locator('[data-test="add-team-card"]')).toBeVisible()

    const readinessResponse = await request.get(
      new URL('/api/health/readiness', integratedBackendUrl()).toString()
    )
    expect(readinessResponse.ok()).toBe(true)
    const { chainId } = (await readinessResponse.json()) as { chainId: number }
    const browserChainId = await page.evaluate(async () => {
      const provider = (
        window as Window & {
          ethereum?: { request: (args: { method: string }) => Promise<unknown> }
        }
      ).ethereum
      if (!provider) throw new Error('The E2E browser provider is not available')
      return provider.request({ method: 'eth_chainId' })
    })
    expect(Number.parseInt(String(browserChainId), 16)).toBe(chainId)
  })

  test('[AC-US-AUTH-001-13] retries the same SIWE flow after a wallet signature rejection', async ({
    page
  }) => {
    let exchanges = 0
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/siwe') {
        exchanges++
      }
    })

    await page.goto('/login')
    await page.evaluate(() => {
      const provider = (
        window as unknown as {
          ethereum: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
        }
      ).ethereum
      const request = provider.request.bind(provider)
      provider.request = async (args) => {
        if (args.method === 'personal_sign') {
          provider.request = request
          throw Object.assign(new Error('Signature declined'), { code: 4001 })
        }
        return request(args)
      }
    })

    const signIn = page.getByTestId('sign-in')
    await signIn.click()
    await expect(
      page.getByText(
        'Message sign rejected: You need to sign the message to Sign in the CNC Portal',
        { exact: true }
      )
    ).toBeVisible()
    await expect(page.locator('[data-test="add-team-card"]')).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBeNull()
    expect(exchanges).toBe(0)

    const exchange = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/auth/siwe'
    )
    await signIn.click()
    expect((await exchange).ok()).toBe(true)
    await expect(page.locator('[data-test="add-team-card"]')).toBeVisible()
    expect(exchanges).toBe(1)

    const restored = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        new URL(response.url()).pathname === '/api/auth/token'
    )
    await page.reload()
    expect((await restored).ok()).toBe(true)
    await expect(page.locator('[data-test="add-team-card"]')).toBeVisible()
    expect(exchanges).toBe(1)
  })
})

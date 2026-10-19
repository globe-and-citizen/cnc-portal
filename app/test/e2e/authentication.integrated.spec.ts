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
})

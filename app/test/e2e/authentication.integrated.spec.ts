import { expect, test } from './fixtures'
import { ownerNonce } from './company/company-chain'
import { signInToRealStack } from './company/real-company-page'

test.describe('[US-AUTH-001] Integrated client authentication', { tag: '@integrated' }, () => {
  /**
   * Covers:
   * - [AC-US-AUTH-001-01]
   * - [AC-US-AUTH-001-07]
   */
  test('authenticates through SIWE without submitting a chain transaction', async ({ page }) => {
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
  })
})

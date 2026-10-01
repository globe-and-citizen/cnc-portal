import { expect, test } from '../fixtures/integrated'
import { openAccountFromSidebar } from '../e2e-page'
import {
  createOperationalCompany,
  deleteCompanyThroughUi,
  deploySafeThroughUi
} from '../company/real-company-page'

test.describe(
  '[US-SAFE-001] Integrated Safe setup',
  { tag: ['@US-SAFE-001', '@integrated'] },
  () => {
    test.setTimeout(240_000)

    /**
     * Covers:
     * - [AC-US-SAFE-001-01]
     * - [AC-US-SAFE-001-03]
     * - [AC-US-SAFE-001-05]
     */
    test('deploys and opens the company Safe through the product UI', async ({ page }) => {
      const company = await createOperationalCompany(page)

      try {
        const safe = await deploySafeThroughUi(page, company.teamId)
        expect(safe.type).toBe('Safe')

        await openAccountFromSidebar(
          page,
          `/teams/${company.teamId}/accounts/safe-account/${safe.address}`
        )
        await expect(page.locator('[data-test="safe-wallet-view"]')).toBeVisible()
        await expect(page.locator('[data-test="safe-threshold-summary"]')).toHaveText(
          '1 of 1 signers'
        )
      } finally {
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

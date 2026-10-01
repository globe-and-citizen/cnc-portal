import { expect, test } from '../fixtures/integrated'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY } from '../e2e-chain'
import { openAccountFromSidebar } from '../e2e-page'
import {
  addRealCompanyMember,
  createRealCompany,
  deleteCompanyThroughUi,
  finishRealCompanyWithoutContracts,
  openCompanyMetadataActions,
  openRealCompaniesList,
  uniqueCompanyName
} from './real-company-page'

const card = (page: Parameters<typeof createRealCompany>[0], teamId: string) =>
  page.locator(`[data-test="team-card-${teamId}"]`)

test.describe(
  '[US-COMPANIES-006/007] Integrated company access lifecycle',
  {
    tag: ['@US-COMPANIES-006', '@US-COMPANIES-007', '@integrated']
  },
  () => {
    test.setTimeout(180_000)

    /**
     * Covers:
     * - [AC-US-COMPANIES-006-01]
     * - [AC-US-COMPANIES-006-02]
     * - [AC-US-COMPANIES-006-03]
     * - [AC-US-COMPANIES-007-01]
     * - [AC-US-COMPANIES-007-02]
     * - [AC-US-COMPANIES-007-03]
     * - [AC-US-COMPANIES-007-04]
     */
    test('keeps member visibility independent from the owner archive lifecycle', async ({
      page,
      walletPage
    }) => {
      const memberPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)
      const company = await createRealCompany(page)
      const teamId = String(company.id)
      const restoredName = uniqueCompanyName('Restored E2E Company')
      let currentName = company.name

      try {
        await finishRealCompanyWithoutContracts(page, teamId)
        await addRealCompanyMember(page, teamId, E2E_MEMBER)

        await memberPage.goto('/teams')
        await expect(card(memberPage, teamId)).toContainText(company.name)
        await card(memberPage, teamId).locator('[data-test="team-menu"]').click()
        await memberPage.getByRole('menuitem', { name: 'Hide' }).click()
        await memberPage.locator('[data-test="visibility-team-button"]').click()
        await expect(card(memberPage, teamId)).toHaveCount(0)

        await memberPage.locator('[data-test="toggle-show-hidden"]').click()
        await expect(card(memberPage, teamId)).toContainText('Hidden')
        await openRealCompaniesList(page)
        await expect(card(page, teamId)).toContainText(company.name)
        await expect(card(page, teamId)).not.toContainText('Hidden')

        await card(memberPage, teamId).locator('[data-test="team-menu"]').click()
        await memberPage.getByRole('menuitem', { name: 'Show' }).click()
        await memberPage.locator('[data-test="visibility-team-button"]').click()
        await expect(card(memberPage, teamId)).not.toContainText('Hidden')
        await memberPage.locator('[data-test="toggle-show-hidden"]').click()
        await expect(card(memberPage, teamId)).toContainText(company.name)

        await card(page, teamId).locator('[data-test="team-link"]').click()
        await openCompanyMetadataActions(page, company.name)
        await page.locator('[data-test="team-meta-archive-open"]').click()
        await page.locator('[data-test="archive-team-button"]').click()
        await expect(page.locator('[data-test="team-archived-banner"]')).toBeVisible()
        await expect(page.locator('[data-test="team-meta-update-open"]')).toBeDisabled()
        await openAccountFromSidebar(page, `/teams/${teamId}/accounts/payroll-account`)
        await expect(page.locator('[data-test="add-member-button"]')).toBeDisabled()

        await openRealCompaniesList(page)
        await expect(card(page, teamId)).toHaveCount(0)
        await page.locator('[data-test="toggle-show-archived"]').click()
        await expect(card(page, teamId)).toContainText('Archived')

        await memberPage.goto('/teams')
        await expect(card(memberPage, teamId)).toHaveCount(0)
        await memberPage.locator('[data-test="toggle-show-archived"]').click()
        await expect(card(memberPage, teamId)).toContainText('Archived')
        await card(memberPage, teamId).locator('[data-test="team-link"]').click()
        await expect(memberPage.locator('[data-test="team-archived-banner"]')).toBeVisible()
        await expect(
          memberPage.locator('[data-test="team-archived-unarchive-button"]')
        ).toHaveCount(0)
        await openRealCompaniesList(memberPage)
        await memberPage.locator('[data-test="toggle-show-archived"]').click()
        await expect(card(memberPage, teamId)).toContainText('Archived')
        await card(memberPage, teamId).locator('[data-test="team-menu"]').click()
        await memberPage.getByRole('menuitem', { name: 'Hide' }).click()
        await memberPage.locator('[data-test="visibility-team-button"]').click()
        await expect(card(memberPage, teamId)).toHaveCount(0)
        await memberPage.locator('[data-test="toggle-show-hidden"]').click()
        await expect(card(memberPage, teamId)).toContainText('Hidden')
        await expect(card(memberPage, teamId)).toContainText('Archived')
        await expect(card(page, teamId)).toContainText('Archived')
        await expect(card(page, teamId)).not.toContainText('Hidden')

        await card(memberPage, teamId).locator('[data-test="team-menu"]').click()
        await memberPage.getByRole('menuitem', { name: 'Show' }).click()
        await memberPage.locator('[data-test="visibility-team-button"]').click()
        await expect(card(memberPage, teamId)).not.toContainText('Hidden')

        await card(page, teamId).locator('[data-test="team-link"]').click()
        await page.locator('[data-test="team-archived-unarchive-button"]').click()
        await expect(
          page.getByText('Company unarchived successfully', { exact: true })
        ).toBeVisible()
        await expect(page.locator('[data-test="team-archived-banner"]')).toHaveCount(0)

        await memberPage.goto('/teams')
        await expect(card(memberPage, teamId)).toContainText(company.name)
        await expect(card(memberPage, teamId)).not.toContainText('Archived')

        await openRealCompaniesList(page)
        await expect(card(page, teamId)).toBeVisible()
        await card(page, teamId).locator('[data-test="team-link"]').click()
        await openCompanyMetadataActions(page, company.name)
        await expect(page.locator('[data-test="team-meta-update-open"]')).toBeEnabled()
        await page.locator('[data-test="team-meta-update-open"]').click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel('Company Name').fill(restoredName)
        await dialog.getByRole('button', { name: 'Save changes' }).click()
        await expect(page.getByText('Company updated successfully', { exact: true })).toBeVisible()
        currentName = restoredName
        await openRealCompaniesList(page)
        await expect(card(page, teamId)).toContainText(restoredName)
      } finally {
        await deleteCompanyThroughUi(page, teamId, currentName)
      }
    })
  }
)

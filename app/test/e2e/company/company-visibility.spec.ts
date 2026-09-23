import { expect, test } from '../fixtures'
import { E2E_MEMBER } from '../e2e-chain'
import {
  cancelDialog,
  COMPANY_NAME,
  confirmVisibility,
  dialog,
  emptyState,
  LOAD_TIMEOUT,
  openCardMenu,
  openCompanyActions,
  RETRY_TIMEOUT,
  showArchived,
  showHidden,
  signInToCompanies,
  teamCard,
  toast,
  visibilityAction
} from './company-lifecycle-page'

const HIDDEN = 'Company hidden successfully'
const VISIBLE = 'Company is visible again'
const TAGS = ['@US-COMPANIES-007', '@browser', '@mocked']

// Mocked browser coverage of US-COMPANIES-007. The API is simulated, so the per-member
// persistence of the visibility flag needs backend coverage.
test.describe('Company list visibility', { tag: TAGS }, () => {
  test('lets the owner hide the company from the dashboard and show it again from the list', async ({
    page
  }) => {
    const api = await openCompanyActions(page)
    await expect(visibilityAction(page)).toHaveText('Hide')
    await visibilityAction(page).click()
    await expect(dialog(page)).toContainText('Hide Company')
    await confirmVisibility(page).click()
    await expect(toast(page, HIDDEN)).toBeVisible()
    await expect(visibilityAction(page)).toHaveText('Show')
    expect(api.updates).toEqual([{ isHidden: true }])

    await page.goto('/teams')
    await expect(emptyState(page)).toBeVisible({ timeout: LOAD_TIMEOUT })
    await expect(teamCard(page)).toHaveCount(0)
    await showHidden(page).click()
    await expect(teamCard(page)).toContainText('Hidden')
    const items = await openCardMenu(page)
    await expect(items).toHaveText(['Update', 'Archive', 'Show', 'Delete'])
    await items.filter({ hasText: 'Show' }).click()
    await expect(dialog(page)).toContainText('Show Company')
    await confirmVisibility(page).click()
    await expect(toast(page, VISIBLE)).toBeVisible()
    await expect(teamCard(page)).not.toContainText('Hidden')
    await showHidden(page).click()
    await expect(teamCard(page)).toContainText(COMPANY_NAME)
    expect(api.updates).toEqual([{ isHidden: true }, { isHidden: false }])
    expect(api.hiddenBy.size).toBe(0)
  })

  /**
   * Covers:
   * - [AC-US-COMPANIES-007-03]
   */
  test('lets a member hide and show the company from the card menu', async ({ page }) => {
    const api = await signInToCompanies(page, { user: 'member' })
    let items = await openCardMenu(page)
    await expect(items).toHaveText(['Hide'])
    await items.click()
    await confirmVisibility(page).click()
    await expect(toast(page, HIDDEN)).toBeVisible()
    await expect(teamCard(page)).toHaveCount(0)
    expect([...api.hiddenBy]).toEqual([E2E_MEMBER])

    await showHidden(page).click()
    await expect(teamCard(page)).toContainText('Hidden')
    items = await openCardMenu(page)
    await expect(items).toHaveText(['Show'])
    await items.click()
    await confirmVisibility(page).click()
    await expect(toast(page, VISIBLE)).toBeVisible()
    await expect(teamCard(page)).not.toContainText('Hidden')
    expect(api.updates).toEqual([{ isHidden: true }, { isHidden: false }])
    expect(api.hiddenBy.size).toBe(0)
  })

  test('keeps a company hidden by a member visible to the owner', async ({ page }) => {
    const api = await signInToCompanies(page, { hiddenBy: ['member'] })
    await expect(showHidden(page)).not.toBeChecked()
    await expect(teamCard(page)).not.toContainText('Hidden')
    const items = await openCardMenu(page)
    await expect(items).toHaveText(['Update', 'Archive', 'Hide', 'Delete'])
    expect(api.updates).toHaveLength(0)
  })

  /**
   * Covers:
   * - [AC-US-COMPANIES-006-06]
   * - [AC-US-COMPANIES-007-04]
   */
  test(
    'lets a member hide an archived company without changing its archived state',
    { tag: '@US-COMPANIES-006' },
    async ({ page }) => {
      const api = await signInToCompanies(page, { user: 'member', archived: true })
      await expect(teamCard(page)).toContainText('Archived')
      const items = await openCardMenu(page)
      await expect(items).toHaveText(['Hide'])
      await items.click()
      await confirmVisibility(page).click()
      await expect(toast(page, HIDDEN)).toBeVisible()
      await expect(teamCard(page)).toHaveCount(0)
      await showHidden(page).click()
      await expect(teamCard(page)).toContainText('Hidden')
      await expect(teamCard(page)).toContainText('Archived')
      expect(api.updates).toEqual([{ isHidden: true }])
      expect(api.team?.isArchived).toBe(true)
      expect([...api.hiddenBy]).toEqual([E2E_MEMBER])
    }
  )

  /**
   * Covers:
   * - [AC-US-COMPANIES-003-03]
   * - [AC-US-COMPANIES-003-06]
   */
  test(
    'lists a hidden and archived company only when both filters are on',
    { tag: '@US-COMPANIES-003' },
    async ({ page }) => {
      await signInToCompanies(page, { archived: true, hiddenBy: ['owner'] })
      await expect(teamCard(page)).toContainText('Hidden')
      await expect(teamCard(page)).toContainText('Archived')
      await showHidden(page).click()
      await expect(teamCard(page)).toHaveCount(0)
      await showHidden(page).click()
      await expect(teamCard(page)).toBeVisible()
      await showArchived(page).click()
      await expect(teamCard(page)).toHaveCount(0)
      await showArchived(page).click()
      await expect(teamCard(page)).toBeVisible()
    }
  )

  test('cancelling the confirmation leaves the visibility unchanged', async ({ page }) => {
    const api = await openCompanyActions(page)
    await visibilityAction(page).click()
    await cancelDialog(page).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(visibilityAction(page)).toHaveText('Hide')
    expect(api.updates).toHaveLength(0)
    expect(api.hiddenBy.size).toBe(0)
  })

  test('reports a rejected visibility change and retries successfully', async ({ page }) => {
    const api = await openCompanyActions(page)
    api.failUpdate = true
    await visibilityAction(page).click()
    await confirmVisibility(page).click()
    await expect(dialog(page)).toContainText('Request failed with status code 500', {
      timeout: RETRY_TIMEOUT
    })
    await expect(visibilityAction(page)).toHaveText('Hide')
    expect(api.hiddenBy.size).toBe(0)
    const failedAttempts = api.updates.length
    expect(failedAttempts).toBeGreaterThan(0)
    api.failUpdate = false
    await confirmVisibility(page).click()
    await expect(toast(page, HIDDEN)).toBeVisible()
    await expect(dialog(page)).toHaveCount(0)
    await expect(visibilityAction(page)).toHaveText('Show')
    expect(api.updates).toHaveLength(failedAttempts + 1)
    for (const update of api.updates) expect(update).toEqual({ isHidden: true })
  })
})

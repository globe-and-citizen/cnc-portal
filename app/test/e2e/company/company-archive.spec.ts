import { expect, test } from '../fixtures'
import {
  archiveAction,
  archivedBanner,
  cancelDialog,
  closeCardMenu,
  COMPANY_NAME,
  confirmArchive,
  deleteAction,
  dialog,
  emptyState,
  gate,
  LOAD_TIMEOUT,
  openCardMenu,
  openCompanyActions,
  openCompanyDashboard,
  restoreFromBanner,
  RETRY_TIMEOUT,
  showArchived,
  signInToCompanies,
  teamCard,
  toast,
  updateAction,
  visibilityAction
} from './company-lifecycle-page'

const ARCHIVED = 'Company archived successfully'
const UNARCHIVED = 'Company unarchived successfully'

// Browser coverage of US-COMPANIES-006. The API is simulated, so the server-side
// rejection of writes against an archived company needs backend coverage.
test.describe('Company archiving', { tag: ['@US-COMPANIES-006', '@browser'] }, () => {
  test('lets the owner archive the company from the dashboard and restore it from the banner', async ({
    page
  }) => {
    const api = await openCompanyActions(page)
    await expect(archivedBanner(page)).toHaveCount(0)
    await expect(archiveAction(page)).toHaveText('Archive')
    await archiveAction(page).click()
    await expect(dialog(page)).toContainText('Archive Company')
    await expect(dialog(page)).toContainText(COMPANY_NAME)
    await confirmArchive(page).click()
    await expect(toast(page, ARCHIVED)).toBeVisible()
    await expect(archivedBanner(page)).toBeVisible()
    await expect(archiveAction(page)).toHaveText('Unarchive')
    await expect(updateAction(page)).toBeDisabled()
    expect(api.updates).toEqual([{ isArchived: true }])
    expect(api.team?.isArchived).toBe(true)

    await restoreFromBanner(page).click()
    await expect(toast(page, UNARCHIVED)).toBeVisible()
    await expect(archivedBanner(page)).toHaveCount(0)
    await expect(archiveAction(page)).toHaveText('Archive')
    await expect(updateAction(page)).toBeEnabled()
    expect(api.updates).toEqual([{ isArchived: true }, { isArchived: false }])
    expect(api.team?.isArchived).toBe(false)
  })

  test('removes an archived company from the default list and restores it from the card menu', async ({
    page
  }) => {
    const api = await openCompanyActions(page)
    await archiveAction(page).click()
    await confirmArchive(page).click()
    await expect(toast(page, ARCHIVED)).toBeVisible()

    await page.goto('/teams')
    await expect(emptyState(page)).toBeVisible({ timeout: LOAD_TIMEOUT })
    await expect(teamCard(page)).toHaveCount(0)
    await showArchived(page).click()
    await expect(teamCard(page)).toContainText('Archived')
    let items = await openCardMenu(page)
    await expect(items).toHaveText(['Update', 'Unarchive', 'Hide', 'Delete'])
    await expect(items.filter({ hasText: 'Update' })).toHaveAttribute('aria-disabled', 'true')
    await items.filter({ hasText: 'Unarchive' }).click()
    await expect(dialog(page)).toContainText('Unarchive Company')
    await confirmArchive(page).click()
    await expect(toast(page, UNARCHIVED)).toBeVisible()
    await expect(teamCard(page)).not.toContainText('Archived')
    await showArchived(page).click()
    await expect(teamCard(page)).toContainText(COMPANY_NAME)
    items = await openCardMenu(page)
    await expect(items).toHaveText(['Update', 'Archive', 'Hide', 'Delete'])
    await expect(items.filter({ hasText: 'Update' })).not.toHaveAttribute('aria-disabled', 'true')
    expect(api.updates).toEqual([{ isArchived: true }, { isArchived: false }])
  })

  test('lets the owner archive the company from the card menu', async ({ page }) => {
    const api = await signInToCompanies(page)
    const items = await openCardMenu(page)
    await items.filter({ hasText: 'Archive' }).click()
    await expect(dialog(page)).toContainText(COMPANY_NAME)
    await confirmArchive(page).click()
    await expect(toast(page, ARCHIVED)).toBeVisible()
    await expect(teamCard(page)).toHaveCount(0)
    await expect(emptyState(page)).toBeVisible()
    expect(api.updates).toEqual([{ isArchived: true }])
    expect(api.team?.isArchived).toBe(true)
  })

  test('freezes settings on an archived company while keeping visibility and deletion available', async ({
    page
  }) => {
    const api = await openCompanyActions(page, { archived: true })
    await expect(archivedBanner(page)).toContainText('This team is archived')
    await expect(restoreFromBanner(page)).toBeVisible()
    await expect(updateAction(page)).toBeDisabled()
    await expect(archiveAction(page)).toHaveText('Unarchive')
    await expect(visibilityAction(page)).toBeEnabled()
    await expect(deleteAction(page)).toBeEnabled()
    expect(api.updates).toHaveLength(0)
  })

  test('shows the archived banner to a member without offering to restore', async ({ page }) => {
    const api = await signInToCompanies(page, { user: 'member', archived: true })
    await expect(teamCard(page)).toContainText('Archived')
    const items = await openCardMenu(page)
    await expect(items).toHaveText(['Hide'])
    await closeCardMenu(page)
    await openCompanyDashboard(page)
    await expect(archivedBanner(page)).toBeVisible()
    await expect(restoreFromBanner(page)).toHaveCount(0)
    await expect(archiveAction(page)).toHaveCount(0)
    expect(api.updates).toHaveLength(0)
  })

  test('cancelling the confirmation leaves the company active', async ({ page }) => {
    const api = await openCompanyActions(page)
    await archiveAction(page).click()
    await cancelDialog(page).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(archivedBanner(page)).toHaveCount(0)
    await expect(archiveAction(page)).toHaveText('Archive')
    expect(api.updates).toHaveLength(0)
    expect(api.team?.isArchived).toBe(false)
  })

  test('reports a rejected archive request and retries successfully', async ({ page }) => {
    const api = await openCompanyActions(page)
    api.failUpdate = true
    await archiveAction(page).click()
    await confirmArchive(page).click()
    await expect(dialog(page)).toContainText('Request failed with status code 500', {
      timeout: RETRY_TIMEOUT
    })
    await expect(archivedBanner(page)).toHaveCount(0)
    expect(api.team?.isArchived).toBe(false)
    const failedAttempts = api.updates.length
    expect(failedAttempts).toBeGreaterThan(0)
    api.failUpdate = false
    await confirmArchive(page).click()
    await expect(toast(page, ARCHIVED)).toBeVisible()
    await expect(dialog(page)).toHaveCount(0)
    await expect(archivedBanner(page)).toBeVisible()
    expect(api.updates).toHaveLength(failedAttempts + 1)
    for (const update of api.updates) expect(update).toEqual({ isArchived: true })
  })

  test('disables the confirmation while the archive request is pending', async ({ page }) => {
    const api = await openCompanyActions(page)
    const archiving = gate()
    api.beforeUpdate = () => archiving.promise
    await archiveAction(page).click()
    await confirmArchive(page).click()
    try {
      await expect.poll(() => api.updates.length).toBe(1)
      await expect(confirmArchive(page)).toBeDisabled()
      await expect(archivedBanner(page)).toHaveCount(0)
      expect(api.team?.isArchived).toBe(false)
    } finally {
      archiving.release()
    }
    await expect(archivedBanner(page)).toBeVisible()
    expect(api.updates).toHaveLength(1)
  })
})

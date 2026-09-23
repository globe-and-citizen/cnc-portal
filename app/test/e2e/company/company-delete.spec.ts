import { expect, test } from '../fixtures'
import {
  archiveAction,
  archivedBanner,
  cancelDialog,
  closeCardMenu,
  COMPANIES_URL,
  COMPANY_NAME,
  COMPANY_URL,
  companyHeader,
  confirmDelete,
  deleteAction,
  dialog,
  emptyState,
  errorState,
  gate,
  LOAD_TIMEOUT,
  openCardMenu,
  openCompanyActions,
  openCompanyDashboard,
  RETRY_TIMEOUT,
  SIBLING_NAME,
  signInToCompanies,
  teamCard,
  toast,
  updateAction
} from './company-lifecycle-page'

const DELETED = 'Company deleted successfully'

// Mocked browser coverage of US-COMPANIES-008. The API is simulated, so cascading
// deletion of related records needs backend coverage.
test.describe('Company deletion', { tag: ['@US-COMPANIES-008', '@browser', '@mocked'] }, () => {
  test('lets the owner delete the company from the dashboard and returns to the list', async ({
    page
  }) => {
    const api = await openCompanyActions(page)
    await deleteAction(page).click()
    await expect(dialog(page)).toContainText(COMPANY_NAME)
    await confirmDelete(page).click()
    await expect(toast(page, DELETED)).toBeVisible()
    await expect(page).toHaveURL(COMPANIES_URL, { timeout: LOAD_TIMEOUT })
    await expect(emptyState(page)).toBeVisible()
    await expect(teamCard(page)).toHaveCount(0)
    expect(api.team).toBeNull()
    expect(api.deleteAttempts).toBe(1)
  })

  test('lets the owner delete the company from the card menu without leaving the list', async ({
    page
  }) => {
    const api = await signInToCompanies(page)
    const items = await openCardMenu(page)
    await expect(items).toHaveText(['Update', 'Archive', 'Hide', 'Delete'])
    await items.filter({ hasText: 'Delete' }).click()
    await expect(dialog(page)).toContainText(COMPANY_NAME)
    await confirmDelete(page).click()
    await expect(toast(page, DELETED)).toBeVisible()
    await expect(page).toHaveURL(COMPANIES_URL)
    await expect(teamCard(page)).toHaveCount(0)
    await expect(emptyState(page)).toBeVisible()
    expect(api.team).toBeNull()
    expect(api.deleteAttempts).toBe(1)
  })

  test('targets the card that opened the menu when several companies are listed', async ({
    page
  }) => {
    const api = await signInToCompanies(page, { withSibling: true })
    await expect(teamCard(page, 2)).toContainText(SIBLING_NAME)
    let items = await openCardMenu(page, 2)
    await items.filter({ hasText: 'Delete' }).click()
    await expect(dialog(page)).toContainText(SIBLING_NAME)
    await cancelDialog(page).click()
    await expect(dialog(page)).toHaveCount(0)
    items = await openCardMenu(page, 1)
    await items.filter({ hasText: 'Delete' }).click()
    await expect(dialog(page)).toContainText(COMPANY_NAME)
    await expect(dialog(page)).not.toContainText(SIBLING_NAME)
    await confirmDelete(page).click()
    await expect(toast(page, DELETED)).toBeVisible()
    await expect(teamCard(page, 1)).toHaveCount(0)
    await expect(teamCard(page, 2)).toContainText(SIBLING_NAME)
    expect(api.team).toBeNull()
    expect(api.deleteAttempts).toBe(1)
    expect(api.strayRequests).toEqual([])
  })

  test('cancelling the confirmation leaves the company unchanged', async ({ page }) => {
    const api = await openCompanyActions(page)
    await deleteAction(page).click()
    await cancelDialog(page).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page).toHaveURL(COMPANY_URL)
    await expect(deleteAction(page)).toBeVisible()
    expect(api.deleteAttempts).toBe(0)
    expect(api.team).not.toBeNull()
  })

  test('[AC-US-COMPANIES-008-06] reports a rejected deletion, keeps the company open, and retries successfully', async ({
    page
  }) => {
    const api = await openCompanyActions(page)
    api.failDelete = true
    await deleteAction(page).click()
    await confirmDelete(page).click()
    await expect(dialog(page)).toContainText('Company deletion temporarily unavailable', {
      timeout: RETRY_TIMEOUT
    })
    await expect(page).toHaveURL(COMPANY_URL)
    expect(api.team).not.toBeNull()
    const failedAttempts = api.deleteAttempts
    expect(failedAttempts).toBeGreaterThan(0)
    api.failDelete = false
    await confirmDelete(page).click()
    await expect(toast(page, DELETED)).toBeVisible()
    await expect(page).toHaveURL(COMPANIES_URL, { timeout: LOAD_TIMEOUT })
    expect(api.deleteAttempts).toBe(failedAttempts + 1)
    expect(api.team).toBeNull()
  })

  test('disables the confirmation while the deletion is pending', async ({ page }) => {
    const api = await openCompanyActions(page)
    const deletion = gate()
    api.beforeDelete = () => deletion.promise
    await deleteAction(page).click()
    await confirmDelete(page).click()
    try {
      await expect.poll(() => api.deleteAttempts).toBe(1)
      await expect(confirmDelete(page)).toBeDisabled()
      await expect(page).toHaveURL(COMPANY_URL)
      expect(api.team).not.toBeNull()
    } finally {
      deletion.release()
    }
    await expect(page).toHaveURL(COMPANIES_URL, { timeout: LOAD_TIMEOUT })
    expect(api.deleteAttempts).toBe(1)
    expect(api.team).toBeNull()
  })

  test('still lets the owner delete an archived company', async ({ page }) => {
    const api = await openCompanyActions(page, { archived: true })
    await expect(archivedBanner(page)).toBeVisible()
    await deleteAction(page).click()
    await confirmDelete(page).click()
    await expect(toast(page, DELETED)).toBeVisible()
    await expect(page).toHaveURL(COMPANIES_URL, { timeout: LOAD_TIMEOUT })
    expect(api.team).toBeNull()
  })

  test('reports a deleted company as removed when its dashboard is reopened', async ({ page }) => {
    const api = await openCompanyActions(page)
    await deleteAction(page).click()
    await confirmDelete(page).click()
    await expect(page).toHaveURL(COMPANIES_URL, { timeout: LOAD_TIMEOUT })
    expect(api.team).toBeNull()
    await page.goto('/teams/1')
    await expect(errorState(page)).toContainText('Company not found', { timeout: LOAD_TIMEOUT })
    await expect(companyHeader(page)).toHaveCount(0)
  })

  test('[AC-US-COMPANIES-008-03] does not offer deletion to a non-owner member', async ({
    page
  }) => {
    const api = await signInToCompanies(page, { user: 'member' })
    await expect(teamCard(page)).toContainText('Employee')
    const items = await openCardMenu(page)
    await expect(items).toHaveText(['Hide'])
    await closeCardMenu(page)
    await openCompanyDashboard(page)
    await expect(deleteAction(page)).toHaveCount(0)
    await expect(archiveAction(page)).toHaveCount(0)
    await expect(updateAction(page)).toHaveCount(0)
    expect(api.deleteAttempts).toBe(0)
    expect(api.team).not.toBeNull()
  })
})

import type { Locator } from '@playwright/test'
import { expect, test } from '../fixtures'
import {
  cardDescription,
  cardName,
  companyHeader,
  COMPANY_DESCRIPTION,
  COMPANY_NAME,
  dialog,
  gate,
  LOAD_TIMEOUT,
  openCardMenu,
  openCompanyActions,
  RETRY_TIMEOUT,
  showArchived,
  signInToCompanies,
  toast,
  updateAction
} from './company-lifecycle-page'

const NEW_NAME = 'E2E Renamed Company'
const NEW_DESCRIPTION = 'Updated through the lifecycle E2E suite.'
const UPDATED = 'Company updated successfully'

const nameInput = (form: Locator) => form.getByPlaceholder('Acme Corp')
const descriptionInput = (form: Locator) => form.getByPlaceholder('Enter a short description')
const saveButton = (form: Locator) => form.getByRole('button', { name: 'Save changes' })

async function fillDetails(form: Locator, name: string, description: string) {
  await nameInput(form).fill(name)
  await descriptionInput(form).fill(description)
}

// Browser coverage of US-COMPANIES-004. The API is simulated, so the server-side
// owner check and the archived-company rejection need backend coverage.
test.describe('Company details update', { tag: ['@US-COMPANIES-004', '@browser'] }, () => {
  test('lets the owner update the details from the dashboard and reflects them on the list', async ({
    page
  }) => {
    const api = await openCompanyActions(page)
    await updateAction(page).click()
    const form = dialog(page)
    await expect(nameInput(form)).toHaveValue(COMPANY_NAME)
    await expect(descriptionInput(form)).toHaveValue(COMPANY_DESCRIPTION)
    await fillDetails(form, NEW_NAME, NEW_DESCRIPTION)
    await saveButton(form).click()
    await expect(toast(page, UPDATED)).toBeVisible()
    await expect(dialog(page)).toHaveCount(0)
    await expect(companyHeader(page)).toContainText(NEW_NAME)
    expect(api.updates).toEqual([{ name: NEW_NAME, description: NEW_DESCRIPTION }])
    expect(api.team).toMatchObject({ name: NEW_NAME, description: NEW_DESCRIPTION })

    await page.goto('/teams')
    await expect(cardName(page)).toHaveText(NEW_NAME, { timeout: LOAD_TIMEOUT })
    await expect(cardDescription(page)).toHaveText(NEW_DESCRIPTION)
  })

  test('lets the owner update the details from the card menu', async ({ page }) => {
    const api = await signInToCompanies(page)
    const items = await openCardMenu(page)
    await items.filter({ hasText: 'Update' }).click()
    const form = dialog(page)
    await expect(nameInput(form)).toHaveValue(COMPANY_NAME)
    await fillDetails(form, NEW_NAME, NEW_DESCRIPTION)
    await saveButton(form).click()
    await expect(toast(page, UPDATED)).toBeVisible()
    await expect(cardName(page)).toHaveText(NEW_NAME)
    await expect(cardDescription(page)).toHaveText(NEW_DESCRIPTION)
    expect(api.updates).toEqual([{ name: NEW_NAME, description: NEW_DESCRIPTION }])
  })

  test('requires a valid name and description before submitting', async ({ page }) => {
    const api = await openCompanyActions(page)
    await updateAction(page).click()
    const form = dialog(page)
    await fillDetails(form, 'ab', 'short')
    await saveButton(form).click()
    await expect(form.getByText('Name must be at least 3 characters')).toBeVisible()
    await expect(form.getByText('Description must be at least 10 characters')).toBeVisible()
    expect(api.updates).toHaveLength(0)
    await fillDetails(form, NEW_NAME, NEW_DESCRIPTION)
    await saveButton(form).click()
    await expect(toast(page, UPDATED)).toBeVisible()
    expect(api.updates).toEqual([{ name: NEW_NAME, description: NEW_DESCRIPTION }])
  })

  test('discards unsaved edits when the form is closed and reopened', async ({ page }) => {
    const api = await openCompanyActions(page)
    await updateAction(page).click()
    await fillDetails(dialog(page), NEW_NAME, NEW_DESCRIPTION)
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await updateAction(page).click()
    await expect(nameInput(dialog(page))).toHaveValue(COMPANY_NAME)
    await expect(descriptionInput(dialog(page))).toHaveValue(COMPANY_DESCRIPTION)
    expect(api.updates).toHaveLength(0)
    expect(api.team?.name).toBe(COMPANY_NAME)
  })

  test('reports a rejected update, keeps the edits, and retries successfully', async ({ page }) => {
    const api = await openCompanyActions(page)
    api.failUpdate = true
    await updateAction(page).click()
    const form = dialog(page)
    await fillDetails(form, NEW_NAME, NEW_DESCRIPTION)
    await saveButton(form).click()
    await expect(form).toContainText('Company update temporarily unavailable', {
      timeout: RETRY_TIMEOUT
    })
    await expect(nameInput(form)).toHaveValue(NEW_NAME)
    await expect(companyHeader(page)).toContainText(COMPANY_NAME)
    expect(api.team?.name).toBe(COMPANY_NAME)
    const failedAttempts = api.updates.length
    expect(failedAttempts).toBeGreaterThan(0)
    api.failUpdate = false
    await saveButton(form).click()
    await expect(toast(page, UPDATED)).toBeVisible()
    await expect(companyHeader(page)).toContainText(NEW_NAME)
    expect(api.updates).toHaveLength(failedAttempts + 1)
    for (const update of api.updates) expect(update).toEqual(api.updates[0])
  })

  test('disables the update action on an archived company', async ({ page }) => {
    const api = await openCompanyActions(page, { archived: true })
    await expect(updateAction(page)).toBeDisabled()
    await page.goto('/teams')
    await showArchived(page).click()
    const items = await openCardMenu(page)
    await expect(items.filter({ hasText: 'Update' })).toHaveAttribute('aria-disabled', 'true')
    expect(api.updates).toHaveLength(0)
  })

  test('rejects an update submitted after the company was archived elsewhere', async ({ page }) => {
    const api = await openCompanyActions(page)
    await updateAction(page).click()
    const form = dialog(page)
    await fillDetails(form, NEW_NAME, NEW_DESCRIPTION)
    api.team!.isArchived = true
    await saveButton(form).click()
    await expect(form).toContainText('Team is archived — unarchive to modify', {
      timeout: RETRY_TIMEOUT
    })
    await expect(toast(page, UPDATED)).toHaveCount(0)
    expect(api.team).toMatchObject({ name: COMPANY_NAME, isArchived: true })
    for (const update of api.updates) {
      expect(update).toEqual({ name: NEW_NAME, description: NEW_DESCRIPTION })
    }
  })

  test('disables submission while the update is pending', async ({ page }) => {
    const api = await openCompanyActions(page)
    const update = gate()
    api.beforeUpdate = () => update.promise
    await updateAction(page).click()
    const form = dialog(page)
    await fillDetails(form, NEW_NAME, NEW_DESCRIPTION)
    await saveButton(form).click()
    try {
      await expect.poll(() => api.updates.length).toBe(1)
      await expect(saveButton(form)).toBeDisabled()
      expect(api.team?.name).toBe(COMPANY_NAME)
    } finally {
      update.release()
    }
    await expect(toast(page, UPDATED)).toBeVisible()
    expect(api.updates).toHaveLength(1)
    expect(api.team?.name).toBe(NEW_NAME)
  })
})

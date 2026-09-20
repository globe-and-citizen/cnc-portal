import { expect, type Page } from '@playwright/test'
import type { Team } from '../../../src/types/team'

export interface RealCompanyOptions {
  description?: string
  name?: string
}

export function uniqueCompanyName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function signInToRealStack(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByTestId('sign-in').click()
  await expect(page).toHaveURL(/\/teams$/, { timeout: 60_000 })
}

export async function createRealCompany(
  page: Page,
  options: RealCompanyOptions = {}
): Promise<Team> {
  const name = options.name ?? uniqueCompanyName('E2E Company')
  const description = options.description ?? 'Created by the integrated Companies E2E suite.'

  await signInToRealStack(page)
  await page.locator('[data-test="add-team-card"]').click()
  await expect(page.locator('[data-test="step-1"]')).toBeVisible()
  await page.getByPlaceholder('Acme Corp').fill(name)
  await page.getByPlaceholder('Enter a short description').fill(description)
  await page.locator('[data-test="next-button"]').click()
  await expect(page.locator('[data-test="step-2"]')).toBeVisible()

  const created = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/teams'
  )
  await page.locator('[data-test="create-team-button"]').click()
  const response = await created
  expect(response.ok()).toBe(true)
  const team = (await response.json()) as Team
  await expect(page.locator('[data-test="step-3"]')).toBeVisible()
  return team
}

export async function finishRealCompanyWithoutContracts(page: Page, teamId: string): Promise<void> {
  await page.locator('[data-test="skip-button"]').click()
  await expect(page.locator('[data-test="step-4"]')).toBeVisible()
  await page.locator('[data-test="skip-safe-setup-button"]').click()
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}$`))
}

export async function openRealCompaniesList(page: Page): Promise<void> {
  await page.locator('[data-test="team-picker"]').click()
  await page.locator('[data-test="all-companies"]').click()
  await expect(page).toHaveURL(/\/teams$/)
}

export async function openCompanyMetadataActions(page: Page, companyName: string): Promise<void> {
  const heading = page.getByRole('heading', { name: companyName, exact: true })
  await page.locator('button').filter({ has: heading }).click()
  await expect(page.locator('[data-test="team-meta-update-open"]')).toBeVisible()
}

export async function enterShareDetails(page: Page): Promise<void> {
  await page.getByPlaceholder('Company SHER').fill('E2E Shares')
  await page.getByPlaceholder('SHR', { exact: true }).fill('E2E')
}

export async function deleteCompanyThroughUi(
  page: Page,
  teamId: string,
  companyName: string
): Promise<void> {
  await page.goto(`/teams/${teamId}`)
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}$`))
  await openCompanyMetadataActions(page, companyName)
  await page.locator('[data-test="team-meta-delete-open"]').click()
  await page.locator('[data-test="delete-team-button"]').click()
  await expect(page).toHaveURL(/\/teams$/)
}

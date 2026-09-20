import { expect, type Page } from '@playwright/test'
import type { Team } from '../../../src/types/team'

const BACKEND_API_URL = process.env.E2E_BACKEND_API_URL ?? 'http://localhost:4000/api'

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

async function authToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('authToken'))
  if (!token) throw new Error('The real-stack browser session has no auth token')
  return token
}

export async function fetchRealCompany(page: Page, teamId: string): Promise<Team> {
  const response = await page.request.get(`${BACKEND_API_URL}/teams/${teamId}`, {
    headers: { Authorization: `Bearer ${await authToken(page)}` }
  })
  expect(response.ok()).toBe(true)
  return response.json() as Promise<Team>
}

export async function deleteRealCompany(page: Page, teamId: string): Promise<void> {
  const response = await page.request.delete(`${BACKEND_API_URL}/teams/${teamId}`, {
    headers: { Authorization: `Bearer ${await authToken(page)}` }
  })
  if (response.status() !== 404) expect(response.ok()).toBe(true)
}

export async function realCompanyStatus(page: Page, teamId: string): Promise<number> {
  const response = await page.request.get(`${BACKEND_API_URL}/teams/${teamId}`, {
    headers: { Authorization: `Bearer ${await authToken(page)}` }
  })
  return response.status()
}

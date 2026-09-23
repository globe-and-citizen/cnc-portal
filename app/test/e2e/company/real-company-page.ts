import { expect, type Page } from '@playwright/test'
import type { Address } from 'viem'
import type { Team } from '../../../src/types/team'
import { E2E_OWNER } from '../e2e-chain'
import { openAccountFromSidebar, type E2EUser } from '../e2e-page'
import { stubSafeTransactionService } from '../safe/safe-transaction-service'

export interface RealCompanyOptions {
  description?: string
  name?: string
}

interface OfficerRegistrationResponse {
  officer: {
    address: Address
    deployBlockNumber: string
  }
}

interface RegisteredContract {
  address: Address
  type: string
}

export interface OperationalCompany {
  team: Team
  teamId: string
  officer: OfficerRegistrationResponse['officer']
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

export async function deployOfficerThroughUi(page: Page): Promise<OfficerRegistrationResponse> {
  await enterShareDetails(page)
  const registered = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/contract/officer'
  )
  await page.locator('[data-test="deploy-contracts-button"]').click()
  const response = await registered
  expect(response.ok()).toBe(true)
  const registration = (await response.json()) as OfficerRegistrationResponse
  await expect(page.locator('[data-test="step-4"]')).toBeVisible({ timeout: 120_000 })
  return registration
}

export async function createOperationalCompany(page: Page): Promise<OperationalCompany> {
  const team = await createRealCompany(page)
  const officer = await deployOfficerThroughUi(page)
  return { team, teamId: String(team.id), officer: officer.officer }
}

export async function deploySafeThroughUi(page: Page, teamId: string): Promise<RegisteredContract> {
  const owner: E2EUser = {
    address: E2E_OWNER,
    name: 'E2E Owner',
    imageUrl: null
  }
  await stubSafeTransactionService(page, undefined, {
    incomingTransfers: [],
    transactions: [],
    user: owner
  })
  const registered = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/contract'
  )
  await page.locator('[data-test="deploy-safe-button"]').click()
  const response = await registered
  expect(response.ok()).toBe(true)
  const safe = (await response.json()) as RegisteredContract
  await expect(page.getByText('Safe wallet deployed successfully', { exact: true })).toBeVisible({
    timeout: 60_000
  })
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}$`))
  return safe
}

export async function addRealCompanyMember(
  page: Page,
  teamId: string,
  memberAddress: Address
): Promise<void> {
  await openAccountFromSidebar(page, `/teams/${teamId}/accounts/payroll-account`)
  await page.locator('[data-test="add-member-button"]').click()
  await page.getByPlaceholder('Search by name or address').fill(memberAddress)
  await page
    .locator('[data-test="user-row"]')
    .filter({ hasText: `${memberAddress.slice(0, 6)}...${memberAddress.slice(-4)}` })
    .click()
  await page.locator('[data-test="add-members-submit"]').click()
  await expect(page.getByText('Members added successfully', { exact: true })).toBeVisible()
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

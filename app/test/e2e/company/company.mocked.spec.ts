import type { Page, Request } from '@playwright/test'
import type { Address } from 'viem'
import type { Team } from '../../../src/types/team'
import { expect, test } from '../fixtures'
import { E2E_MEMBER, E2E_OWNER } from '../e2e-chain'
import {
  json,
  rejectNextWalletRequest,
  stubBackend,
  type E2EUser,
  type StubResponse
} from '../e2e-page'
import { enterShareDetails, openCompanyMetadataActions } from './real-company-page'

const owner: E2EUser = { address: E2E_OWNER, name: 'E2E Creator', imageUrl: null }
const member: E2EUser = { address: E2E_MEMBER, name: 'E2E Colleague', imageUrl: null }

interface CompanyInput {
  name: string
  description: string
  members: Array<{ address: Address; name: string }>
}

interface MockedCompanyApi {
  attempts: CompanyInput[]
  companies: Team[]
  failCreation: boolean
  failOfficerRegistration: boolean
  officerRegistrations: unknown[]
  updateAttempts: unknown[]
}

function createCompany(api: MockedCompanyApi, request: Request): StubResponse {
  const body = request.postDataJSON() as CompanyInput
  api.attempts.push(body)
  if (api.failCreation) {
    return json({ message: 'Company creation temporarily unavailable' }, 500)
  }

  const team: Team = {
    id: '1',
    ...body,
    slug: 'e2e-company',
    ownerAddress: E2E_OWNER,
    members: [owner, ...body.members].map((user, index) => ({
      id: String(index + 1),
      name: user.name,
      address: user.address,
      teamId: 1
    })),
    isArchived: false,
    isHidden: false,
    currentOfficer: null,
    teamContracts: []
  }
  api.companies.push(team)
  return json(team, 201)
}

function respond(api: MockedCompanyApi, pathname: string, request: Request) {
  if (pathname === '/api/teams') {
    return request.method() === 'POST' ? createCompany(api, request) : json(api.companies)
  }
  if (pathname === '/api/teams/1') {
    if (request.method() === 'PUT') {
      api.updateAttempts.push(request.postDataJSON())
    }
    return json(api.companies[0])
  }
  if (pathname === '/api/contract/officer' && request.method() === 'POST') {
    api.officerRegistrations.push(request.postDataJSON())
    if (api.failOfficerRegistration) {
      return json({ message: 'Officer registration temporarily unavailable' }, 500)
    }
    return json({ officer: request.postDataJSON() }, 201)
  }
  if (pathname === '/api/contract/officers') return json([])
  return undefined
}

async function openMockedCompanyCreation(page: Page): Promise<MockedCompanyApi> {
  const api: MockedCompanyApi = {
    attempts: [],
    companies: [],
    failCreation: false,
    failOfficerRegistration: false,
    officerRegistrations: [],
    updateAttempts: []
  }
  await stubBackend(page, {
    user: owner,
    users: [member],
    team: null,
    respond: async (pathname, request) => respond(api, pathname, request)
  })
  await page.goto('/')
  await page.getByTestId('sign-in').click()
  await expect(page).toHaveURL(/\/teams$/, { timeout: 60_000 })
  await page.locator('[data-test="add-team-card"]').click()
  await expect(page.locator('[data-test="step-1"]')).toBeVisible()
  return api
}

async function enterCompanyDetails(page: Page, description = ''): Promise<void> {
  await page.getByPlaceholder('Acme Corp').fill('E2E Company')
  await page.getByPlaceholder('Enter a short description').fill(description)
  await page.locator('[data-test="next-button"]').click()
  await expect(page.locator('[data-test="step-2"]')).toBeVisible()
}

async function createMockedCompanyUntilOfficer(page: Page): Promise<MockedCompanyApi> {
  const api = await openMockedCompanyCreation(page)
  await enterCompanyDetails(page, 'Created through the mocked browser suite.')
  await page.locator('[data-test="create-team-button"]').click()
  await expect(page.locator('[data-test="step-3"]')).toBeVisible()
  return api
}

async function finishMockedCompanyWithoutContracts(page: Page): Promise<void> {
  await page.locator('[data-test="skip-button"]').click()
  await expect(page.locator('[data-test="step-4"]')).toBeVisible()
  await page.locator('[data-test="skip-safe-setup-button"]').click()
  await expect(page).toHaveURL(/\/teams\/1$/)
}

test.describe(
  '[US-COMPANIES-001] Mocked company creation variants',
  { tag: ['@US-COMPANIES-001', '@mocked', '@browser'] },
  () => {
    test.describe.configure({ mode: 'parallel' })

    /**
     * Covers:
     * - [AC-US-COMPANIES-001-04]
     * - [AC-US-COMPANIES-001-07]
     */
    test('validates required details and preserves them across the wizard', async ({ page }) => {
      const api = await openMockedCompanyCreation(page)

      await page.locator('[data-test="next-button"]').click()
      await expect(page.getByText('Company name is required', { exact: true })).toBeVisible()
      expect(api.attempts).toHaveLength(0)

      await enterCompanyDetails(page, 'Preserved while navigating between steps.')
      await page.locator('[data-test="previous-button"]').click()
      await expect(page.getByPlaceholder('Acme Corp')).toHaveValue('E2E Company')
      await expect(page.getByPlaceholder('Enter a short description')).toHaveValue(
        'Preserved while navigating between steps.'
      )
      expect(api.attempts).toHaveLength(0)
    })

    test('[AC-US-COMPANIES-001-05] blocks submission for an invalid member supplied by the directory', async ({
      page
    }) => {
      const api = await openMockedCompanyCreation(page)
      await page.route(/\/api\/user(?:\?.*)?$/, (route) =>
        route.fulfill(
          json({
            users: [{ name: 'Invalid member', address: 'invalid-wallet', imageUrl: null }]
          })
        )
      )
      await enterCompanyDetails(page)
      await page.getByPlaceholder('Search by name or address').fill('Invalid member')
      await page.locator('[data-test="user-row"]').filter({ hasText: 'Invalid member' }).click()

      await expect(page.locator('[data-test="create-team-button"]')).toBeDisabled()
      expect(api.attempts).toHaveLength(0)
    })

    test('[AC-US-COMPANIES-001-08] keeps a failed creation recoverable and retries the same details', async ({
      page
    }) => {
      const api = await openMockedCompanyCreation(page)
      api.failCreation = true
      await enterCompanyDetails(page, 'Preserved after an API failure.')
      await page.locator('[data-test="create-team-button"]').click()

      await expect(page.locator('[data-test="create-team-error"]')).toBeVisible({
        timeout: 20_000
      })
      await expect(page.locator('[data-test="step-2"]')).toBeVisible()
      expect(api.companies).toHaveLength(0)

      api.failCreation = false
      await page.locator('[data-test="create-team-button"]').click()
      await expect(page.locator('[data-test="step-3"]')).toBeVisible()
      expect(api.companies).toHaveLength(1)
      for (const attempt of api.attempts) expect(attempt).toEqual(api.attempts[0])
    })
  }
)

test.describe(
  '[US-COMPANIES-002] Mocked Officer deployment variants',
  { tag: ['@US-COMPANIES-002', '@mocked', '@browser'] },
  () => {
    test.setTimeout(180_000)

    /**
     * Covers:
     * - [AC-US-COMPANIES-002-04]
     * - [AC-US-COMPANIES-002-07]
     */
    test('validates share details and keeps wallet rejection recoverable', async ({ page }) => {
      const api = await createMockedCompanyUntilOfficer(page)
      const deploy = page.locator('[data-test="deploy-contracts-button"]')

      await expect(deploy).toBeDisabled()
      await enterShareDetails(page)
      await expect(deploy).toBeEnabled()
      await rejectNextWalletRequest(page)
      await deploy.click()

      await expect(page.locator('[data-test="deploy-error-alert"]')).toBeVisible()
      await expect(page.locator('[data-test="step-3"]')).toBeVisible()
      await expect(page.locator('[data-test="step-4"]')).toHaveCount(0)
      expect(api.officerRegistrations).toHaveLength(0)
    })

    test('[AC-US-COMPANIES-002-06] defers Officer setup and reopens it from the workspace', async ({
      page
    }) => {
      const api = await createMockedCompanyUntilOfficer(page)

      await finishMockedCompanyWithoutContracts(page)
      await page.locator('[data-test="continue-officer-setup-button"]').click()

      await expect(page.locator('[data-test="share-name-input"]')).toBeVisible()
      await expect(page.locator('[data-test="deploy-contracts-button"]')).toBeDisabled()
      expect(api.officerRegistrations).toHaveLength(0)
    })

    test('[AC-US-COMPANIES-002-08] distinguishes a registration failure from a deployment failure', async ({
      page
    }) => {
      const api = await createMockedCompanyUntilOfficer(page)
      api.failOfficerRegistration = true
      await enterShareDetails(page)

      await page.locator('[data-test="deploy-contracts-button"]').click()

      const registrationError = page.locator('[data-test="register-error-alert"]')
      await expect(registrationError).toBeVisible({ timeout: 120_000 })
      await expect(registrationError).toContainText('Failed to complete deployment setup')
      await expect(registrationError).toContainText('Officer registration temporarily unavailable')
      await expect(page.locator('[data-test="deploy-error-alert"]')).toHaveCount(0)
      await expect(page.locator('[data-test="step-3"]')).toBeVisible()
      await expect(page.locator('[data-test="step-4"]')).toHaveCount(0)
      await expect(
        page.getByText('Officer contracts deployed and synced successfully', { exact: true })
      ).toHaveCount(0)
      expect(api.officerRegistrations).toHaveLength(1)
    })
  }
)

test.describe(
  '[US-COMPANIES-004] Mocked company update variants',
  { tag: ['@US-COMPANIES-004', '@mocked', '@browser'] },
  () => {
    test('[AC-US-COMPANIES-004-03] rejects invalid metadata before making an API request', async ({
      page
    }) => {
      const api = await createMockedCompanyUntilOfficer(page)
      await finishMockedCompanyWithoutContracts(page)
      await openCompanyMetadataActions(page, 'E2E Company')
      await page.locator('[data-test="team-meta-update-open"]').click()
      const dialog = page.getByRole('dialog')

      await dialog.getByLabel('Company Name').fill('x')
      await dialog.getByRole('button', { name: 'Save changes' }).click()

      await expect(dialog.getByText('Name must be at least 3 characters')).toBeVisible()
      expect(api.updateAttempts).toHaveLength(0)
    })
  }
)

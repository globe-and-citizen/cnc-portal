// Company-specific Playwright page helpers: the stateful backend stub that
// records every creation and registration attempt, and the wizard steps
// shared by the creation, onboarding, Safe and recovery journeys.
import { expect, type Page, type Request } from '@playwright/test'
import type { Address } from 'viem'
import type { Team } from '../../../src/types/team'
import type { TeamContract } from '../../../src/types/teamContract'
import type { CreateContractBody, CreateOfficerBody } from '../../../src/queries/contract.queries'
import { E2E_MEMBER, E2E_OWNER } from '../e2e-chain'
import { json, stubBackend, type E2EUser, type StubResponse } from '../e2e-page'
import { deployedContracts, type CompanyAddresses } from './company-chain'

export const owner: E2EUser = { address: E2E_OWNER, name: 'E2E Creator', imageUrl: null }
export const member: E2EUser = { address: E2E_MEMBER, name: 'E2E Colleague', imageUrl: null }

export interface CompanyInput {
  name: string
  description: string
  members: Array<{ address: string; name: string }>
}

/** Stateful API boundary: only a successful POST makes a company visible to GET requests. */
export interface CompanyApi {
  /** Every request body received, including the ones answered with an error. */
  attempts: CompanyInput[]
  officerAttempts: CreateOfficerBody[]
  safeAttempts: CreateContractBody[]
  companies: Team[]
  failCreation: boolean
  failOfficerRegistration: boolean
  failSafeRegistration: boolean
  /** Awaited before answering, so a test can hold the request open. */
  beforeCreate?: () => Promise<void>
  beforeOfficerRegistration?: () => Promise<void>
  beforeSafeRegistration?: () => Promise<void>
}

/** A promise the test resolves by hand, to keep a stubbed request pending. */
export function gate() {
  let release = () => {}
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

async function createCompany(api: CompanyApi, request: Request): Promise<StubResponse> {
  const body = request.postDataJSON() as CompanyInput
  api.attempts.push(body)
  await api.beforeCreate?.()
  if (api.failCreation) return json({ message: 'Company creation temporarily unavailable' }, 500)
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

async function registerOfficer(api: CompanyApi, request: Request): Promise<StubResponse> {
  const body = request.postDataJSON() as CreateOfficerBody
  api.officerAttempts.push(body)
  await api.beforeOfficerRegistration?.()
  if (api.failOfficerRegistration) return json({ message: 'Officer registration unavailable' }, 500)
  const team = api.companies[0]!
  const address = body.address as Address
  const contracts = await deployedContracts(address)
  team.currentOfficer = {
    id: 1,
    address,
    teamId: 1,
    deployer: E2E_OWNER,
    deployBlockNumber: String(body.deployBlockNumber),
    deployedAt: body.deployedAt!,
    previousOfficerId: null,
    previousOfficer: null,
    version: '2.0.0',
    createdAt: body.deployedAt!,
    updatedAt: body.deployedAt!
  }
  team.teamContracts = contracts.map(({ contractAddress, contractType }) => ({
    address: contractAddress,
    type: contractType,
    deployer: E2E_OWNER,
    admins: []
  }))
  team.contractVersion = 'V2'
  return json(
    { officer: team.currentOfficer, previousOfficer: null, contractsCreated: contracts.length },
    201
  )
}

async function registerSafe(api: CompanyApi, request: Request): Promise<StubResponse> {
  const body = request.postDataJSON() as CreateContractBody
  api.safeAttempts.push(body)
  await api.beforeSafeRegistration?.()
  if (api.failSafeRegistration) return json({ message: 'Safe registration unavailable' }, 500)
  const team = api.companies[0]!
  team.safeAddress = body.contractAddress as Address
  const contract: TeamContract = {
    address: team.safeAddress,
    type: 'Safe',
    deployer: E2E_OWNER,
    admins: []
  }
  team.teamContracts.push(contract)
  return json(contract, 201)
}

function respond(api: CompanyApi, pathname: string, request: Request) {
  const post = request.method() === 'POST'
  if (pathname === '/api/teams') return post ? createCompany(api, request) : json(api.companies)
  if (pathname === '/api/teams/1') return json(api.companies[0])
  if (pathname === '/api/contract/officer' && post) return registerOfficer(api, request)
  if (pathname === '/api/contract' && post) return registerSafe(api, request)
  if (pathname === '/api/contract/officers') return json([])
  return undefined
}

/**
 * Bind the browser's local-chain address manifest to this test's real deployments.
 * Only configuration is substituted: production components, calldata, RPC and
 * receipts are unchanged. Never read or overwrite a developer's deployment file.
 */
export async function useCompanyInfrastructure(page: Page, addresses: CompanyAddresses) {
  await page.route('**/src/artifacts/deployed_addresses/chain-31337.json*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export default ${JSON.stringify(addresses)};`
    })
  )
}

/** Sign in as the owner with no company yet and open the creation wizard. */
export async function openCompanyCreation(
  page: Page,
  entry: 'card' | 'menu' = 'card'
): Promise<CompanyApi> {
  const api: CompanyApi = {
    attempts: [],
    officerAttempts: [],
    safeAttempts: [],
    companies: [],
    failCreation: false,
    failOfficerRegistration: false,
    failSafeRegistration: false
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
  await expect(page.locator('[data-test="empty-state"]')).toBeVisible()
  if (entry === 'menu') {
    await page.locator('[data-test="team-picker"]').click()
    await page.locator('[data-test="create-company"]').click()
  } else {
    await page.locator('[data-test="add-team-card"]').click()
  }
  await expect(page.locator('[data-test="step-1"]')).toBeVisible()
  return api
}

export async function enterCompanyDetails(page: Page, description = '') {
  await page.getByPlaceholder('Acme Corp').fill('E2E Company')
  await page.getByPlaceholder('Enter a short description').fill(description)
  await page.locator('[data-test="next-button"]').click()
  await expect(page.locator('[data-test="step-2"]')).toBeVisible()
}

export const shareNameInput = (page: Page) => page.getByPlaceholder('Company SHER')
export const shareSymbolInput = (page: Page) => page.getByPlaceholder('SHR', { exact: true })

export async function enterShareDetails(page: Page) {
  await shareNameInput(page).fill('E2E Shares')
  await shareSymbolInput(page).fill('E2E')
}

export async function createCompanyUntilOfficer(page: Page): Promise<CompanyApi> {
  const api = await openCompanyCreation(page)
  await enterCompanyDetails(page)
  await page.locator('[data-test="create-team-button"]').click()
  await expect(page.locator('[data-test="step-3"]')).toBeVisible()
  return api
}

export async function createCompanyUntilSafe(page: Page): Promise<CompanyApi> {
  const api = await createCompanyUntilOfficer(page)
  await page.locator('[data-test="skip-button"]').click()
  await expect(page.locator('[data-test="step-4"]')).toBeVisible()
  return api
}

/** Defer both contract steps, then reach the company from the companies list. */
export async function finishWithoutContracts(page: Page) {
  await expect(page.locator('[data-test="step-3"]')).toBeVisible()
  await expect(page.locator('[data-test="step-3"]')).toContainText('E2E Company')
  await expect(page.locator('[data-test="deploy-contracts-button"]')).toBeDisabled()
  await page.locator('[data-test="skip-button"]').click()
  await expect(page.locator('[data-test="step-4"]')).toBeVisible()
  await page.locator('[data-test="skip-safe-setup-button"]').click()
  await expect(page).toHaveURL(/\/teams\/1$/)
  await expect(page.locator('[data-test="team-picker"]')).toContainText('E2E Company')
  await page.locator('[data-test="team-picker"]').click()
  await page.locator('[data-test="all-companies"]').click()
  await expect(page.locator('[data-test="team-card-1"]')).toContainText('E2E Company')
  await page.locator('[data-test="team-card-1"] [data-test="team-link"]').click()
  await expect(page).toHaveURL(/\/teams\/1$/)
}

/**
 * Playwright helpers for the company lifecycle journeys (update, archive, hide,
 * delete): a stateful backend stub that enforces the portal's ownership rules
 * on PUT and DELETE, plus the two entry points those actions share — the
 * dashboard's company header and the card menu on the Companies list.
 */
import { expect, type Locator, type Page, type Request } from '@playwright/test'
import type { Address } from 'viem'
import type { Team } from '../../../src/types/team'
import type { UpdateTeamBody } from '../../../src/queries/team.queries'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY, E2E_OWNER } from '../e2e-chain'
import { json, stubBackend, useWallet, type E2EUser, type StubResponse } from '../e2e-page'

export const owner: E2EUser = { address: E2E_OWNER, name: 'E2E Creator', imageUrl: null }
export const member: E2EUser = { address: E2E_MEMBER, name: 'E2E Colleague', imageUrl: null }

/** A promise the test resolves by hand, to keep a stubbed request pending. */
export function gate() {
  let release = () => {}
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

export const COMPANY_NAME = 'E2E Lifecycle Company'
export const COMPANY_DESCRIPTION = 'A deterministic company used by the lifecycle E2E suites.'
export const SIBLING_NAME = 'E2E Sibling Company'

export const COMPANIES_URL = /\/teams$/
export const COMPANY_URL = /\/teams\/1$/

/** A rejection only surfaces once the shared HTTP client has exhausted its retries. */
export const RETRY_TIMEOUT = 20_000
/** A route change re-runs the stubbed queries before the page settles. */
export const LOAD_TIMEOUT = 30_000
const SIGN_IN_TIMEOUT = 60_000

type Role = 'owner' | 'member'

export interface LifecycleOptions {
  user?: Role
  archived?: boolean
  /** Users who already hid the company from their own list before signing in. */
  hiddenBy?: Role[]
  /** List a second, read-only company so card actions can be checked to target the right one. */
  withSibling?: boolean
}

const users: Record<Role, E2EUser> = { owner, member }

/**
 * Stateful API boundary for one already-created company. The stub applies
 * the same rules as the real `updateTeam`/`deleteTeam` controllers so the
 * portal is exercised against realistic 403/409/404 answers.
 */
export interface LifecycleApi {
  /** `null` once deleted: the detail endpoint answers 404 and the list is empty. */
  team: Team | null
  /** Members who hid the company from their own list. */
  hiddenBy: Set<Address>
  /** Every PUT body received, including the ones answered with an error. */
  updates: UpdateTeamBody[]
  deleteAttempts: number
  /** Writes aimed at the sibling company, which no journey should ever produce. */
  strayRequests: string[]
  failUpdate: boolean
  failDelete: boolean
  /** Awaited before answering, so a test can hold the request open. */
  beforeUpdate?: () => Promise<void>
  beforeDelete?: () => Promise<void>
}

export const currentUser = (options: LifecycleOptions): E2EUser => users[options.user ?? 'owner']

/** A company with both users as members and no contracts, so no chain writes are needed. */
export function lifecycleTeam({ archived = false }: LifecycleOptions = {}): Team {
  return {
    id: '1',
    name: COMPANY_NAME,
    slug: 'e2e-lifecycle-company',
    description: COMPANY_DESCRIPTION,
    ownerAddress: owner.address,
    members: [
      { id: '1', name: owner.name, address: owner.address, teamId: 1 },
      { id: '2', name: member.name, address: member.address, teamId: 1 }
    ],
    isArchived: archived,
    isHidden: false,
    currentOfficer: null,
    teamContracts: []
  }
}

/** A second company that only exists to sit next to the one under test. */
const siblingTeam = (): Team => ({
  ...lifecycleTeam(),
  id: '2',
  name: SIBLING_NAME,
  slug: 'e2e-sibling-company',
  description: 'A company that no lifecycle journey is allowed to touch.'
})

const forCaller = (api: LifecycleApi, team: Team, caller: Address): Team => ({
  ...team,
  isHidden: api.hiddenBy.has(caller)
})

function listTeams(
  api: LifecycleApi,
  caller: Address,
  request: Request,
  withSibling: boolean
): StubResponse {
  const params = new URL(request.url()).searchParams
  const showHidden = params.get('showHidden') === 'true'
  const showArchived = params.get('showArchived') === 'true'
  const teams: Team[] = []
  if (api.team) {
    const team = forCaller(api, api.team, caller)
    if ((!team.isArchived || showArchived) && (!team.isHidden || showHidden)) teams.push(team)
  }
  if (withSibling) teams.push(siblingTeam())
  return json(teams)
}

/** An archived company only accepts being unarchived, or hidden and shown again. */
function isAllowedOnArchived({ name, description, isArchived, isHidden }: UpdateTeamBody): boolean {
  if (name !== undefined || description !== undefined) return false
  const unarchiving = isArchived === false && isHidden === undefined
  const changingVisibility = isHidden !== undefined && isArchived === undefined
  return unarchiving || changingVisibility
}

function rejectUpdate(team: Team, body: UpdateTeamBody, caller: Address): StubResponse | undefined {
  const isOwner = team.ownerAddress === caller
  const changesMetadata = body.name !== undefined || body.description !== undefined
  if (!team.members.some((entry) => entry.address === caller)) {
    return json({ message: 'Unauthorized: Caller is not a member of the team' }, 403)
  }
  if (team.isArchived && !isAllowedOnArchived(body)) {
    return json({ message: 'Team is archived — unarchive to modify' }, 409)
  }
  if (changesMetadata && !isOwner) {
    return json({ message: 'Unauthorized: Only team owner can update metadata' }, 403)
  }
  if (body.isArchived !== undefined && !isOwner) {
    return json({ message: 'Unauthorized: Only team owner can archive/unarchive the team' }, 403)
  }
  return undefined
}

function applyUpdate(api: LifecycleApi, team: Team, body: UpdateTeamBody, caller: Address) {
  const { name, description, isArchived, isHidden } = body
  if (name !== undefined) team.name = name
  if (description !== undefined) team.description = description
  if (isArchived !== undefined) team.isArchived = isArchived
  if (isHidden === true) api.hiddenBy.add(caller)
  if (isHidden === false) api.hiddenBy.delete(caller)
}

async function updateTeam(api: LifecycleApi, caller: Address, request: Request) {
  const body = request.postDataJSON() as UpdateTeamBody
  api.updates.push(body)
  await api.beforeUpdate?.()
  if (api.failUpdate) return json({ message: 'Company update temporarily unavailable' }, 500)
  if (!api.team) return json({ message: 'Team not found' }, 404)
  const rejection = rejectUpdate(api.team, body, caller)
  if (rejection) return rejection
  applyUpdate(api, api.team, body, caller)
  return json(forCaller(api, api.team, caller))
}

async function deleteTeam(api: LifecycleApi, caller: Address) {
  api.deleteAttempts += 1
  await api.beforeDelete?.()
  if (api.failDelete) return json({ message: 'Company deletion temporarily unavailable' }, 500)
  if (!api.team) return json({ message: 'Team not found' }, 404)
  if (api.team.ownerAddress !== caller) {
    return json({ message: 'Unauthorized: Only team owner can delete the team' }, 403)
  }
  api.team = null
  return json({ message: 'Team deleted successfully' })
}

function respond(
  api: LifecycleApi,
  caller: Address,
  pathname: string,
  request: Request,
  withSibling: boolean
) {
  const method = request.method()
  if (pathname === '/api/teams' && method === 'GET') {
    return listTeams(api, caller, request, withSibling)
  }
  if (pathname === '/api/teams/2') {
    if (method === 'GET') return json(siblingTeam())
    api.strayRequests.push(`${method} ${pathname}`)
    return json({ message: 'Unexpected write to the sibling company' }, 405)
  }
  if (pathname === '/api/teams/1') {
    if (method === 'PUT') return updateTeam(api, caller, request)
    if (method === 'DELETE') return deleteTeam(api, caller)
    if (!api.team) return json({ message: 'Team not found' }, 404)
    return json(forCaller(api, api.team, caller))
  }
  if (pathname === '/api/contract/officers') return json([])
  return undefined
}

export const teamCard = (page: Page, id = 1): Locator =>
  page.locator(`[data-test="team-card-${id}"]`)
export const cardName = (page: Page, id = 1): Locator =>
  teamCard(page, id).locator('[data-test="team-name"]')
export const cardDescription = (page: Page, id = 1): Locator =>
  teamCard(page, id).locator('[data-test="team-desc"]')
export const showHidden = (page: Page): Locator => page.locator('[data-test="toggle-show-hidden"]')
export const showArchived = (page: Page): Locator =>
  page.locator('[data-test="toggle-show-archived"]')
export const emptyState = (page: Page): Locator => page.locator('[data-test="empty-state"]')
export const errorState = (page: Page): Locator => page.locator('[data-test="error-state"]')

export const companyHeader = (page: Page): Locator => page.locator('[data-test="team-meta-toggle"]')
export const updateAction = (page: Page): Locator =>
  page.locator('[data-test="team-meta-update-open"]')
export const archiveAction = (page: Page): Locator =>
  page.locator('[data-test="team-meta-archive-open"]')
export const visibilityAction = (page: Page): Locator =>
  page.locator('[data-test="team-meta-visibility-open"]')
export const deleteAction = (page: Page): Locator =>
  page.locator('[data-test="team-meta-delete-open"]')

export const archivedBanner = (page: Page): Locator =>
  page.locator('[data-test="team-archived-banner"]')
export const restoreFromBanner = (page: Page): Locator =>
  page.locator('[data-test="team-archived-unarchive-button"]')

export const dialog = (page: Page): Locator => page.getByRole('dialog')
export const cancelDialog = (page: Page): Locator =>
  dialog(page).getByRole('button', { name: 'Cancel' })
export const confirmArchive = (page: Page): Locator =>
  page.locator('[data-test="archive-team-button"]')
export const confirmVisibility = (page: Page): Locator =>
  page.locator('[data-test="visibility-team-button"]')
export const confirmDelete = (page: Page): Locator =>
  page.locator('[data-test="delete-team-button"]')

export const toast = (page: Page, title: string): Locator => page.getByText(title, { exact: true })

/**
 * Sign in as the owner or a member of an existing company and land on the
 * Companies list, turning on the filters that an archived or hidden company
 * needs to stay listed.
 */
export async function signInToCompanies(
  page: Page,
  options: LifecycleOptions = {}
): Promise<LifecycleApi> {
  const api: LifecycleApi = {
    team: lifecycleTeam(options),
    hiddenBy: new Set((options.hiddenBy ?? []).map((role) => users[role].address)),
    updates: [],
    deleteAttempts: 0,
    strayRequests: [],
    failUpdate: false,
    failDelete: false
  }
  const user = currentUser(options)
  if (options.user === 'member') await useWallet(page, E2E_MEMBER_PRIVATE_KEY)
  await stubBackend(page, {
    user,
    users: [owner, member],
    team: api.team,
    respond: async (pathname, request) =>
      respond(api, user.address, pathname, request, options.withSibling ?? false)
  })
  await page.goto('/')
  await page.getByTestId('sign-in').click()
  await expect(page).toHaveURL(COMPANIES_URL, { timeout: SIGN_IN_TIMEOUT })
  if (options.archived) await showArchived(page).click()
  if (options.hiddenBy?.includes(options.user ?? 'owner')) await showHidden(page).click()
  await expect(teamCard(page)).toContainText(COMPANY_NAME, { timeout: LOAD_TIMEOUT })
  return api
}

/** Open a card's action menu on the Companies list and return its items. */
export async function openCardMenu(page: Page, id = 1): Promise<Locator> {
  await teamCard(page, id).locator('[data-test="team-menu"]').click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  return menu.getByRole('menuitem')
}

export async function closeCardMenu(page: Page) {
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
}

/** Open the company dashboard from its card and unfold the header actions. */
export async function openCompanyDashboard(page: Page) {
  await teamCard(page).locator('[data-test="team-link"]').click()
  await expect(page).toHaveURL(COMPANY_URL, { timeout: LOAD_TIMEOUT })
  await companyHeader(page).click()
  await expect(visibilityAction(page)).toBeVisible()
}

/** Sign in, then open the company dashboard with its lifecycle actions reachable. */
export async function openCompanyActions(
  page: Page,
  options: LifecycleOptions = {}
): Promise<LifecycleApi> {
  const api = await signInToCompanies(page, options)
  await openCompanyDashboard(page)
  return api
}

import type { Page, Request } from '@playwright/test'
import type { Address } from 'viem'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY, E2E_NEW_SIGNER, E2E_OWNER } from '../e2e-chain'
import {
  json,
  signInAndOpenFirstTeam,
  stubBackend,
  useWallet,
  type E2EUser,
  type StubResponse
} from '../e2e-page'
import type { ElectionsE2EFixture } from './elections-chain'

export type ElectionActor = 'owner' | 'member'

export interface ElectionApi {
  notificationRequests: number
}

const owner: E2EUser = { id: 'owner-1', address: E2E_OWNER, name: 'E2E Owner', imageUrl: null }
const member: E2EUser = {
  id: 'member-1',
  address: E2E_MEMBER,
  name: 'E2E Member',
  imageUrl: null
}
const candidate: E2EUser = {
  id: 'candidate-1',
  address: E2E_NEW_SIGNER,
  name: 'E2E Candidate',
  imageUrl: null
}
const users = [owner, member, candidate]

const electionTeam = (fixture: ElectionsE2EFixture, archived: boolean) => ({
  id: '1',
  name: 'E2E Election Team',
  slug: 'e2e-election-team',
  description: 'A deterministic team used by the Board Elections browser suite.',
  isHidden: false,
  isArchived: archived,
  isMigrated: true,
  ownerAddress: E2E_OWNER,
  members: users.map(({ id, name, address }) => ({ id, name, address, teamId: 1 })),
  currentOfficer: { address: fixture.officer },
  teamContracts: [
    { address: fixture.elections, type: 'Elections', deployer: E2E_OWNER, admins: [] },
    { address: fixture.board, type: 'BoardOfDirectors', deployer: E2E_OWNER, admins: [] }
  ]
})

function electionResponse(
  api: ElectionApi,
  pathname: string,
  request: Request
): StubResponse | undefined {
  if (pathname === '/api/elections/1' && request.method() === 'POST') {
    api.notificationRequests += 1
    return json(null, 201)
  }
  return undefined
}

export async function openBoardElections(
  page: Page,
  fixture: ElectionsE2EFixture,
  options: { actor?: ElectionActor; archived?: boolean } = {}
): Promise<ElectionApi> {
  const actor = options.actor ?? 'owner'
  if (actor === 'member') await useWallet(page, E2E_MEMBER_PRIVATE_KEY)
  const api: ElectionApi = { notificationRequests: 0 }
  await stubBackend(page, {
    user: actor === 'member' ? member : owner,
    users,
    team: electionTeam(fixture, options.archived ?? false),
    respond: async (pathname, request) => electionResponse(api, pathname, request)
  })
  await signInAndOpenFirstTeam(page)
  await page
    .locator('a[href="/teams/1/administration/bod-elections"]')
    .filter({ hasText: 'Administration' })
    .click()
  await page.waitForURL(/\/teams\/1\/administration\/bod-elections$/)
  return api
}

export async function selectElectionCandidates(page: Page): Promise<void> {
  const input = page.getByPlaceholder('Search by name or address')
  for (const name of ['E2E Owner', 'E2E Member', 'E2E Candidate']) {
    await input.click()
    await page.locator('[data-test="user-row"]').filter({ hasText: name }).click()
  }
}

export async function chooseElectionEndDay(page: Page, day: Date): Promise<void> {
  await page.locator('[data-test="endDayButton"]').click()
  const value = [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, '0'),
    String(day.getDate()).padStart(2, '0')
  ].join('-')
  await page
    .locator('[data-reka-popper-content-wrapper] [data-state="open"]')
    .locator(`[data-value="${value}"]`)
    .click()
}

export const normalized = (addresses: readonly Address[]) =>
  addresses.map((address) => address.toLowerCase())

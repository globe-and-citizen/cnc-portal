// Community Credit-specific Playwright page, backend and journey helpers.
import { expect, type Page, type Request } from '@playwright/test'
import type { Address } from 'viem'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY, E2E_OWNER } from '../e2e-chain'
import type { CommunityCreditE2EFixture } from './community-credit-chain'
import { json, signInAndOpenFirstTeam, stubBackend, useWallet, type E2EUser } from '../e2e-page'

interface FixedReturnOfferingResponse {
  id: number
  teamId: number
  offerId: number
  title: string
  purpose: string | null
  createdAt: string
  updatedAt: string
}

export interface TeamOptions {
  archived?: boolean
  user?: 'owner' | 'member'
}

const owner: E2EUser = { address: E2E_OWNER, name: 'E2E Owner', imageUrl: null }
const member: E2EUser = { address: E2E_MEMBER, name: 'E2E Recipient', imageUrl: null }

export const currentUser = (options: TeamOptions): E2EUser =>
  options.user === 'member' ? member : owner

/** Team payload for the Community Credit journey: one Officer, Bank + FixedReturn. */
export const creditTeam = (
  fixture: CommunityCreditE2EFixture,
  { archived = false }: TeamOptions = {}
) => ({
  id: '1',
  name: 'E2E Credit Team',
  slug: 'e2e-credit-team',
  description: 'A deterministic team used by the Community Credit E2E suite.',
  isHidden: false,
  isArchived: archived,
  isMigrated: true,
  ownerAddress: E2E_OWNER,
  members: [
    { id: 'owner-1', name: owner.name, address: owner.address, teamId: 1 },
    { id: 'recipient-1', name: member.name, address: member.address, teamId: 1 }
  ],
  currentOfficer: { address: fixture.officer },
  teamContracts: [
    { address: fixture.bank, type: 'Bank', deployer: E2E_OWNER, admins: [] },
    { address: fixture.fixedReturn, type: 'FixedReturn', deployer: E2E_OWNER, admins: [] }
  ]
})

export async function signInAndOpenTeam(
  page: Page,
  fixture: CommunityCreditE2EFixture,
  options: TeamOptions = {}
): Promise<void> {
  if (options.user === 'member') await useWallet(page, E2E_MEMBER_PRIVATE_KEY)
  // A tiny stateful stub for the offering-title metadata API — the wizard's
  // publish flow POSTs the title right after the on-chain create, then the
  // round list GETs it back; a fixed `[]` response would let the on-chain
  // create succeed while the title silently never round-trips.
  const offerings: FixedReturnOfferingResponse[] = []
  await stubBackend(page, {
    user: currentUser(options),
    team: creditTeam(fixture, options),
    respond: async (pathname: string, request: Request) => {
      if (pathname !== '/api/fixed-return-offering') return undefined
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as {
          teamId: number
          offerId: number
          title: string
          purpose?: string
        }
        const created: FixedReturnOfferingResponse = {
          id: offerings.length + 1,
          teamId: body.teamId,
          offerId: body.offerId,
          title: body.title,
          purpose: body.purpose ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        offerings.push(created)
        return json(created)
      }
      return json(offerings)
    }
  })
  await signInAndOpenFirstTeam(page)
}

/**
 * Reach Community Credit through the sidebar. Navigation stays inside the SPA —
 * a hard reload would drop the in-memory E2E wallet connection (mirrors
 * `openAccountFromSidebar`'s same constraint for the Accounts submenu).
 */
export async function openCommunityCredit(
  page: Page,
  fixture: CommunityCreditE2EFixture,
  options: TeamOptions = {}
): Promise<void> {
  await signInAndOpenTeam(page, fixture, options)
  await page.locator('a[href="/teams/1/community-credit"]').click()
  await expect(page).toHaveURL(/\/teams\/1\/community-credit$/, { timeout: 30_000 })
}

export interface PublishCreditCallOptions {
  name: string
  access?: 'everyone' | 'restricted'
  /** Team member addresses to whitelist, only used when `access` is `'restricted'`. */
  whitelist?: Address[]
}

/** Drives the 3-step New Credit Call wizard to publication, using its own defaults
 *  for target/rate/term unless the journey under test cares about them. */
export async function publishCreditCall(
  page: Page,
  { name, access = 'everyone', whitelist = [] }: PublishCreditCallOptions
): Promise<void> {
  await page.locator('[data-test="new-credit-call"]').click()
  await page.locator('[data-test="cc-name"]').fill(name)
  await page.locator('[data-test="cc-next"]').click()

  // Terms step: accept the wizard's own defaults (6% rate, 90-day term).
  await page.locator('[data-test="cc-next"]').click()

  // Access step.
  if (access === 'restricted') {
    await page.locator('[data-test="access-restricted-button"]').click()
    for (const address of whitelist) {
      await page.locator('[data-test="whitelist-search-address"]').fill(address)
      await page.locator(`[data-test="user-dropdown-${address}"]`).click()
    }
  }
  await page.locator('[data-test="cc-next"]').click()
  await expect(page).toHaveURL(/\/teams\/1\/community-credit$/, { timeout: 30_000 })
}

export async function openRound(page: Page, roundName: string): Promise<void> {
  // `credit-round-card`'s own @click is on an inner title row, not the outer
  // container Playwright's `.click()` would otherwise center-click — target the
  // name text itself so the click reliably lands inside that inner element.
  await page
    .locator('[data-test="credit-round-card"]', { hasText: roundName })
    .getByText(roundName, { exact: true })
    .click()
}

/** Drives the Lend modal to submission (approval, if needed, then the deposit). */
export async function lendToRound(page: Page, amount: string): Promise<void> {
  await page.locator('[data-test="round-cta-lend"]').click()
  await page.locator('[data-test="lend-amount-input"]').fill(amount)
  await page.locator('[data-test="lend-confirm"]').click()
}

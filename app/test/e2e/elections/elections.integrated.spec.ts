import type { Browser, Page } from '@playwright/test'
import type { Hex } from 'viem'
import { expect, test } from '../fixtures'
import {
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_NEW_SIGNER,
  E2E_NEW_SIGNER_PRIVATE_KEY,
  E2E_OWNER
} from '../e2e-chain'
import { useWallet } from '../e2e-page'
import {
  addRealCompanyMember,
  createOperationalCompany,
  deleteCompanyThroughUi,
  signInToRealStack
} from '../company/real-company-page'
import type { Team } from '../../../src/types/team'
import {
  advanceE2ETimeTo,
  currentBoard,
  currentE2ETime,
  electionCandidates,
  electionDetails,
  electionsFixtureFromTeam,
  eligibleVoters,
  nextElectionId,
  voterChoice,
  voteCount
} from './elections-chain'
import { chooseElectionEndDay, normalized } from './elections-page'

const electionNotificationMessage = 'New election created you are invited to participate'
const displayedAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

async function registerRealUser(browser: Browser, privateKey: Hex): Promise<void> {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    await useWallet(page, privateKey)
    await signInToRealStack(page)
  } finally {
    await context.close()
  }
}

async function openRealBoardElections(page: Page, teamId: string): Promise<Team> {
  const teamResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/teams/${teamId}`
  )
  await page.goto(`/teams/${teamId}/administration/bod-elections`)
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/administration/bod-elections$`))
  const response = await teamResponse
  expect(response.ok()).toBe(true)
  const token = await page.evaluate(() => localStorage.getItem('authToken'))
  expect(token).toBeTruthy()
  const teamReadback = await page.request.get(response.url(), {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(teamReadback.ok()).toBe(true)
  return teamReadback.json() as Promise<Team>
}

async function selectRealElectionCandidates(page: Page): Promise<void> {
  const input = page.getByPlaceholder('Search by name or address')
  for (const address of [E2E_OWNER, E2E_MEMBER, E2E_NEW_SIGNER]) {
    await input.click()
    await page.locator(`[data-test="user-dropdown-${address}"]`).click()
  }
}

test.describe(
  '[US-EL-01/02/03/04/07/08] Integrated Board Election lifecycle',
  {
    tag: [
      '@US-EL-01',
      '@US-EL-02',
      '@US-EL-03',
      '@US-EL-04',
      '@US-EL-07',
      '@US-EL-08',
      '@integrated'
    ]
  },
  () => {
    test.setTimeout(300_000)

    /**
     * Covers:
     * - [AC-US-EL-01-01]
     * - [AC-US-EL-01-02]
     * - [AC-US-EL-01-03]
     * - [AC-US-EL-02-01]
     * - [AC-US-EL-02-02]
     * - [AC-US-EL-02-07]
     * - [AC-US-EL-03-01]
     * - [AC-US-EL-03-02]
     * - [AC-US-EL-03-03]
     * - [AC-US-EL-03-06]
     * - [AC-US-EL-04-01]
     * - [AC-US-EL-04-02]
     * - [AC-US-EL-07-01]
     * - [AC-US-EL-07-03]
     * - [AC-US-EL-07-05]
     * - [AC-US-EL-08-01]
     * - [AC-US-EL-08-02]
     * - [AC-US-EL-08-06]
     */
    test('creates, notifies, votes, publishes and reloads one real Board election', async ({
      browser,
      page
    }) => {
      await registerRealUser(browser, E2E_MEMBER_PRIVATE_KEY)
      await registerRealUser(browser, E2E_NEW_SIGNER_PRIVATE_KEY)
      const company = await createOperationalCompany(page)
      let memberContext: Awaited<ReturnType<Browser['newContext']>> | undefined

      try {
        await page.locator('[data-test="skip-safe-setup-button"]').click()
        await expect(page).toHaveURL(new RegExp(`/teams/${company.teamId}$`))
        await addRealCompanyMember(page, company.teamId, E2E_MEMBER)
        await addRealCompanyMember(page, company.teamId, E2E_NEW_SIGNER)

        const creationTime = await currentE2ETime()
        await page.clock.setFixedTime(new Date(creationTime * 1_000))
        const team = await openRealBoardElections(page, company.teamId)
        const fixture = await electionsFixtureFromTeam(team)
        await expect(page.getByRole('button', { name: 'Create Election' })).toBeEnabled()
        await page.getByRole('button', { name: 'Create Election' }).click()
        const dialog = page.getByRole('dialog', { name: 'Create election' })
        await dialog.getByPlaceholder('Title').fill('Integrated Board Election')
        await dialog
          .getByPlaceholder('Description')
          .fill('Elect the integrated company Board of Directors.')
        await dialog.getByPlaceholder('Number of Directors').fill('3')
        await selectRealElectionCandidates(page)
        const tomorrow = new Date(creationTime * 1_000)
        tomorrow.setDate(tomorrow.getDate() + 1)
        await chooseElectionEndDay(page, tomorrow)

        const notificationsCreated = page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            new URL(response.url()).pathname === `/api/elections/${company.teamId}`
        )
        await dialog.getByRole('button', { name: 'Create Election', exact: true }).click()
        const notificationResponse = await notificationsCreated
        expect(notificationResponse.status()).toBe(201)
        await expect(page.getByText('Integrated Board Election', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect.poll(() => nextElectionId(fixture)).toBe(2n)

        const createdElection = await electionDetails(fixture)
        expect(createdElection[1]).toBe('Integrated Board Election')
        expect(createdElection[6]).toBe(3n)
        expect(normalized(await eligibleVoters(fixture)).sort()).toEqual(
          normalized([E2E_OWNER, E2E_MEMBER, E2E_NEW_SIGNER]).sort()
        )

        await advanceE2ETimeTo(createdElection[4] + 1n)
        memberContext = await browser.newContext()
        const memberPage = await memberContext.newPage()
        await useWallet(memberPage, E2E_MEMBER_PRIVATE_KEY)
        await signInToRealStack(memberPage)
        await memberPage.clock.setFixedTime(new Date((await currentE2ETime()) * 1_000))
        await memberPage.locator('[data-test="notifications"]').click()
        const notification = memberPage
          .locator('a[data-test^="notification-"]')
          .filter({ hasText: electionNotificationMessage })
          .first()
        await expect(notification).toBeVisible()
        const notificationRead = memberPage.waitForResponse(
          (response) =>
            response.request().method() === 'PUT' &&
            new URL(response.url()).pathname.startsWith('/api/notification/')
        )
        await notification.click()
        expect((await notificationRead).ok()).toBe(true)
        await expect(memberPage).toHaveURL(
          new RegExp(`/teams/${company.teamId}/administration/bod-elections$`)
        )

        await memberPage.getByRole('button', { name: 'Vote Now' }).click()
        const candidates = await electionCandidates(fixture)
        await memberPage.getByRole('button', { name: 'Cast a Vote' }).first().click()
        await expect(
          memberPage.getByText('Vote Casted successfully!', { exact: true })
        ).toBeVisible({
          timeout: 30_000
        })
        await expect
          .poll(async () => (await voterChoice(fixture, E2E_MEMBER)).toLowerCase())
          .toBe(candidates[0]!.toLowerCase())
        await expect.poll(() => voteCount(fixture)).toBe(1n)
        await expect(memberPage.getByText('Your Vote', { exact: true })).toBeVisible()
        await memberContext.close()
        memberContext = undefined

        await advanceE2ETimeTo(createdElection[5] + 1n)
        await page.clock.setFixedTime(new Date((await currentE2ETime()) * 1_000))
        await page.goto(`/teams/${company.teamId}/administration/bod-elections`)
        const publish = page.getByRole('button', { name: 'Publish Results' })
        await expect(publish).toBeEnabled({ timeout: 30_000 })
        await publish.click()
        await expect(
          page.getByText('Election results published successfully!', { exact: true })
        ).toBeVisible({ timeout: 30_000 })
        await expect.poll(async () => (await electionDetails(fixture))[7]).toBe(true)
        await expect
          .poll(async () => normalized(await currentBoard(fixture)).sort())
          .toEqual(normalized(candidates).sort())
        await expect(page.getByRole('button', { name: 'Create Election' })).toBeEnabled({
          timeout: 30_000
        })
        const currentBoardSection = page.locator('[data-test="board-members-section"]')
        await expect(
          currentBoardSection.getByText('Current Board of Directors', { exact: true })
        ).toBeVisible()
        for (const address of candidates) {
          await expect(
            currentBoardSection.getByText(displayedAddress(address), { exact: true })
          ).toBeVisible()
        }
        await expect(page.getByText('Past Elections', { exact: true })).toBeVisible()

        await page.reload()
        await expect(page.getByText('Current Board of Directors', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect(page.getByText('Integrated Board Election', { exact: true })).toBeVisible()
        await page.getByRole('button', { name: 'View Results', exact: true }).click()
        await expect(page).toHaveURL(
          new RegExp(
            `/teams/${company.teamId}/administration/bod-elections-details\\?electionId=1$`
          )
        )
        await expect(page.getByText('Elected Board of Directors', { exact: true })).toBeVisible()
        await expect(page.getByText('Integrated Board Election', { exact: true })).toBeVisible()
      } finally {
        await memberContext?.close()
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

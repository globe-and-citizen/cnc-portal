import { zeroAddress } from 'viem'
import { expect, test } from '../fixtures'
import { E2E_MEMBER, E2E_NEW_SIGNER, E2E_OWNER } from '../e2e-chain'
import { rejectNextWalletRequest } from '../e2e-page'
import {
  castOwnerVote,
  createElectionFixture,
  currentE2ETime,
  currentBoard,
  deployElectionsE2EFixture,
  electionDetails,
  eligibleVoters,
  makeElectionActive,
  nextElectionId,
  voterChoice,
  voteCount,
  type ElectionsE2EFixture
} from './elections-chain'
import {
  chooseElectionEndDay,
  normalized,
  openBoardElections,
  selectElectionCandidates
} from './elections-page'

let fixture: ElectionsE2EFixture

test.beforeAll(async () => {
  fixture = await deployElectionsE2EFixture()
})

test.describe('Board Elections lifecycle', { tag: ['@browser', '@mocked'] }, () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(180_000)

  /**
   * Covers:
   * - [AC-US-EL-01-01]
   * - [AC-US-EL-01-02]
   * - [AC-US-EL-01-03]
   * - [AC-US-EL-01-08]
   * - [AC-US-EL-04-01]
   * - [AC-US-EL-04-03]
   */
  test('recovers from a rejected creation, then creates and notifies through the portal', async ({
    page
  }) => {
    const creationTime = await currentE2ETime()
    await page.clock.setFixedTime(new Date(creationTime * 1_000))
    const api = await openBoardElections(page, fixture)
    await page.getByRole('button', { name: 'Create Election' }).click()
    const dialog = page.getByRole('dialog', { name: 'Create election' })
    await dialog.getByPlaceholder('Title').fill('E2E Board 2027')
    await dialog.getByPlaceholder('Description').fill('Elect the next Board of Directors.')
    await dialog.getByPlaceholder('Number of Directors').fill('3')
    await selectElectionCandidates(page)
    const tomorrow = new Date(creationTime * 1_000)
    tomorrow.setDate(tomorrow.getDate() + 1)
    await chooseElectionEndDay(page, tomorrow)
    const create = dialog.getByRole('button', { name: 'Create Election', exact: true })

    await rejectNextWalletRequest(page)
    await create.click()
    await expect.poll(() => nextElectionId(fixture)).toBe(1n)
    expect(api.notificationRequests).toBe(0)
    await expect(create).toBeEnabled({ timeout: 30_000 })

    await create.click()
    await expect.poll(() => nextElectionId(fixture)).toBe(2n)
    await expect(page.getByText('E2E Board 2027', { exact: true })).toBeVisible({
      timeout: 30_000
    })
    const details = await electionDetails(fixture)
    expect(details[1]).toBe('E2E Board 2027')
    expect(details[6]).toBe(3n)
    expect(normalized(await eligibleVoters(fixture))).toEqual(
      normalized([E2E_OWNER, E2E_MEMBER, E2E_NEW_SIGNER])
    )
    expect(api.notificationRequests).toBe(1)
  })

  /**
   * Covers:
   * - [AC-US-EL-02-01]
   * - [AC-US-EL-02-02]
   * - [AC-US-EL-02-06]
   * - [AC-US-EL-02-07]
   */
  test('keeps a rejected ballot unchanged, then records and refreshes the accepted vote', async ({
    page
  }) => {
    const startDate = await createElectionFixture(fixture, {
      candidates: [E2E_OWNER, E2E_MEMBER, E2E_NEW_SIGNER],
      voters: [E2E_MEMBER]
    })
    await makeElectionActive()
    await page.clock.setFixedTime(new Date((startDate + 1) * 1_000))
    await openBoardElections(page, fixture, { actor: 'member' })
    await page.getByRole('button', { name: 'Vote Now' }).click()
    const vote = page.getByRole('button', { name: 'Cast a Vote' }).first()

    await rejectNextWalletRequest(page)
    await vote.click()
    await expect.poll(() => voterChoice(fixture, E2E_MEMBER)).toBe(zeroAddress)
    await expect.poll(() => voteCount(fixture)).toBe(0n)
    await expect(vote).toBeEnabled({ timeout: 30_000 })

    await vote.click()
    await expect(page.getByText('Vote Casted successfully!', { exact: true })).toBeVisible({
      timeout: 30_000
    })
    await expect.poll(() => voterChoice(fixture, E2E_MEMBER)).toBe(E2E_OWNER)
    await expect.poll(() => voteCount(fixture)).toBe(1n)
    await expect(page.getByText('Your Vote', { exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('1/1', { exact: true }).first()).toBeVisible()
  })

  /**
   * Covers:
   * - [AC-US-EL-03-02]
   * - [AC-US-EL-03-06]
   * - [AC-US-EL-03-08]
   * - [AC-US-EL-07-02]
   * - [AC-US-EL-08-01]
   * - [AC-US-EL-08-02]
   */
  test('preserves an unpublished result after rejection, then seats and opens the published Board', async ({
    page
  }) => {
    const startDate = await createElectionFixture(fixture, {
      candidates: [E2E_MEMBER, E2E_OWNER, E2E_NEW_SIGNER],
      voters: [E2E_OWNER]
    })
    await makeElectionActive()
    await page.clock.setFixedTime(new Date((startDate + 1) * 1_000))
    await castOwnerVote(fixture, E2E_MEMBER)
    await openBoardElections(page, fixture)
    const publish = page.getByRole('button', { name: 'Publish Results' })

    await rejectNextWalletRequest(page)
    await publish.click()
    await expect.poll(async () => (await electionDetails(fixture))[7]).toBe(false)
    expect(normalized(await currentBoard(fixture))).toEqual(normalized([E2E_OWNER]))
    await expect(publish).toBeEnabled({ timeout: 30_000 })

    await publish.click()
    await expect.poll(async () => (await electionDetails(fixture))[7]).toBe(true)
    await expect
      .poll(async () => normalized(await currentBoard(fixture)).sort())
      .toEqual(normalized([E2E_MEMBER, E2E_OWNER, E2E_NEW_SIGNER]).sort())
    await expect(page.getByRole('button', { name: 'Create Election' })).toBeEnabled({
      timeout: 30_000
    })
    await expect(page.getByText('Past Elections', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'View Results', exact: true }).click()
    await expect(page).toHaveURL(/bod-elections-details\?electionId=1$/)
    await expect(page.getByText('Elected Board of Directors', { exact: true })).toBeVisible()
    await expect(page.getByText('E2E Member', { exact: true }).first()).toBeVisible()
  })

  /**
   * Covers:
   * - [AC-US-EL-01-12]
   * - [AC-US-EL-02-09]
   * - [AC-US-EL-03-10]
   */
  test('blocks election writes while the company is archived', async ({ page }) => {
    const startDate = await createElectionFixture(fixture, {
      candidates: [E2E_OWNER, E2E_MEMBER, E2E_NEW_SIGNER],
      voters: [E2E_OWNER]
    })
    await makeElectionActive()
    await page.clock.setFixedTime(new Date((startDate + 1) * 1_000))
    await openBoardElections(page, fixture, { archived: true })

    await expect(page.getByRole('button', { name: 'Vote Now' })).toBeDisabled()
    await castOwnerVote(fixture, E2E_MEMBER)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Publish Results' })).toBeDisabled({
      timeout: 30_000
    })
    await expect(page.getByRole('button', { name: 'Create Election' })).toBeDisabled()
  })
})

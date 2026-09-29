import { parseUnits, zeroHash, type Address } from 'viem'
import { expect, test } from '../fixtures'
import {
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_OWNER,
  publicClient,
  tokenBalance
} from '../e2e-chain'
import {
  bankUsdcBalance,
  ensureUsdcBalance,
  investorAddressFromOfficer,
  migrationClaimed,
  migrationClaimedEvents,
  migrationComplete,
  migrationCompletedEvents,
  migrationRoot,
  migrationRootSetEvents,
  mintInvestorShares,
  shareholderIssuanceFixtureFromTeam,
  shareholderPosition
} from './shareholder-chain'
import {
  claimMigratedShares,
  completeShareholderMigration,
  dispatchRemainingMigrationClaims,
  distributeUsdcDividends,
  fundBankWithUsdc,
  issueShares,
  openRealShareholderManagement,
  readMigrationSnapshots,
  redeployOfficerWithMigration
} from './shareholder-page'

const normalizedSnapshot = (shareholders: readonly { shareholder: string; amount: string }[]) =>
  shareholders
    .map(({ shareholder, amount }) => ({ shareholder: shareholder.toLowerCase(), amount }))
    .sort((left, right) => left.shareholder.localeCompare(right.shareholder))

const normalizedPosition = (shareholders: readonly { shareholder: Address; amount: bigint }[]) =>
  shareholders
    .map(({ shareholder, amount }) => ({ shareholder: shareholder.toLowerCase(), amount }))
    .sort((left, right) => left.shareholder.localeCompare(right.shareholder))

test.describe(
  '[US-SHER-006/007] Integrated shareholder migration lifecycle',
  { tag: ['@US-SHER-006', '@US-SHER-007', '@integrated'] },
  () => {
    test.setTimeout(420_000)

    /**
     * Reuses Contract Management evidence:
     * - [AC-US-CONTRACT-005-03]
     *
     * Covers Shareholder Management evidence:
     * - [AC-US-SHER-006-01]
     * - [AC-US-SHER-006-02]
     * - [AC-US-SHER-006-03]
     * - [AC-US-SHER-006-05]
     * - [AC-US-SHER-007-01]
     * - [AC-US-SHER-007-02]
     * - [AC-US-SHER-007-03]
     * - [AC-US-SHER-007-04]
     */
    test('redeploys, claims, settles and closes one frozen shareholder snapshot', async ({
      authenticatedPage: page,
      walletPage,
      operationalTeam
    }) => {
      const company = await operationalTeam({
        memberPrivateKeys: [E2E_MEMBER_PRIVATE_KEY]
      })
      const memberPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)

      const previousTeam = await openRealShareholderManagement(page, company.teamId)
      const previousFixture = await shareholderIssuanceFixtureFromTeam(previousTeam)
      await issueShares(page, E2E_OWNER, '30')
      await issueShares(page, E2E_MEMBER, '10')
      await expect
        .poll(() => shareholderPosition(previousFixture, E2E_MEMBER))
        .toMatchObject({
          balance: parseUnits('10', 6),
          totalSupply: parseUnits('40', 6)
        })

      const redeployment = await redeployOfficerWithMigration(
        page,
        company.teamId,
        'Migrated Shares',
        'MIG'
      )
      expect(redeployment.officer.previousOfficer?.address.toLowerCase()).toBe(
        company.officer.address.toLowerCase()
      )
      expect(redeployment.officer.officer.address.toLowerCase()).not.toBe(
        company.officer.address.toLowerCase()
      )

      const currentTeam = await openRealShareholderManagement(page, company.teamId)
      const currentFixture = await shareholderIssuanceFixtureFromTeam(currentTeam)
      expect(currentTeam.currentOfficer?.address.toLowerCase()).toBe(
        redeployment.officer.officer.address.toLowerCase()
      )
      expect(currentTeam.currentOfficer?.previousOfficer?.address.toLowerCase()).toBe(
        company.officer.address.toLowerCase()
      )
      expect(
        (
          await investorAddressFromOfficer(redeployment.officer.officer.address as Address)
        ).toLowerCase()
      ).toBe(currentFixture.investor.toLowerCase())

      const snapshots = await readMigrationSnapshots(page, company.teamId)
      expect(snapshots).toHaveLength(1)
      const snapshot = snapshots[0]!
      expect(snapshot.id).toBe(redeployment.migration.id)
      expect(snapshot.previousInvestorAddress.toLowerCase()).toBe(
        previousFixture.investor.toLowerCase()
      )
      expect(snapshot.newInvestorAddress.toLowerCase()).toBe(currentFixture.investor.toLowerCase())
      expect(BigInt(snapshot.blockNumber)).toBeGreaterThan(0n)
      expect(normalizedSnapshot(snapshot.shareholders)).toEqual(
        normalizedSnapshot([
          { shareholder: E2E_OWNER, amount: parseUnits('30', 6).toString() },
          { shareholder: E2E_MEMBER, amount: parseUnits('10', 6).toString() }
        ])
      )
      expect(Object.keys(snapshot.proofs).sort()).toEqual(
        [E2E_OWNER.toLowerCase(), E2E_MEMBER.toLowerCase()].sort()
      )
      expect(await migrationRoot(currentFixture)).toBe(snapshot.merkleRoot)
      expect(await migrationComplete(currentFixture)).toBe(false)
      expect(await shareholderPosition(currentFixture)).toEqual({
        balance: 0n,
        shareholders: [],
        symbol: 'MIG',
        totalSupply: 0n
      })

      const rootEvents = await migrationRootSetEvents(currentFixture)
      expect(rootEvents).toHaveLength(1)
      expect(rootEvents[0]?.args).toMatchObject({ root: snapshot.merkleRoot })
      expect(rootEvents[0]?.transactionHash).toBeTruthy()
      expect(
        (await publicClient.getTransactionReceipt({ hash: rootEvents[0]!.transactionHash! })).status
      ).toBe('success')

      await mintInvestorShares(previousFixture, E2E_MEMBER, parseUnits('5', 6))
      expect((await shareholderPosition(previousFixture, E2E_MEMBER)).balance).toBe(
        parseUnits('15', 6)
      )

      await openRealShareholderManagement(memberPage, company.teamId)
      await claimMigratedShares(memberPage, '10')
      await expect.poll(() => migrationClaimed(currentFixture, E2E_MEMBER)).toBe(true)
      await expect
        .poll(() => shareholderPosition(currentFixture, E2E_MEMBER))
        .toMatchObject({
          balance: parseUnits('10', 6),
          totalSupply: parseUnits('10', 6)
        })
      await memberPage.reload()
      await expect(memberPage.getByText('Migration status: Open', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      const claimedRow = memberPage.getByRole('row').filter({ hasText: '100.00%' })
      await expect(claimedRow).toHaveCount(1)
      await expect(claimedRow).toContainText('10 MIG')

      let claimEvents = await migrationClaimedEvents(currentFixture)
      expect(claimEvents).toHaveLength(1)
      expect(claimEvents[0]?.args).toMatchObject({
        shareholder: E2E_MEMBER,
        amount: parseUnits('10', 6)
      })
      expect(claimEvents[0]?.transactionHash).toBeTruthy()
      expect(
        (await publicClient.getTransactionReceipt({ hash: claimEvents[0]!.transactionHash! }))
          .status
      ).toBe('success')

      await openRealShareholderManagement(page, company.teamId)
      await dispatchRemainingMigrationClaims(page)
      await expect.poll(() => migrationClaimed(currentFixture, E2E_OWNER)).toBe(true)
      await expect
        .poll(() => shareholderPosition(currentFixture))
        .toMatchObject({
          balance: parseUnits('30', 6),
          totalSupply: parseUnits('40', 6)
        })
      const settledPosition = await shareholderPosition(currentFixture, E2E_MEMBER)
      expect(settledPosition.balance).toBe(parseUnits('10', 6))
      expect(normalizedPosition(settledPosition.shareholders)).toEqual(
        normalizedPosition([
          { shareholder: E2E_OWNER, amount: parseUnits('30', 6) },
          { shareholder: E2E_MEMBER, amount: parseUnits('10', 6) }
        ])
      )

      claimEvents = await migrationClaimedEvents(currentFixture)
      expect(claimEvents).toHaveLength(2)
      expect(claimEvents.map((event) => event.args)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            shareholder: E2E_OWNER,
            amount: parseUnits('30', 6)
          }),
          expect.objectContaining({
            shareholder: E2E_MEMBER,
            amount: parseUnits('10', 6)
          })
        ])
      )

      await completeShareholderMigration(page)
      await expect.poll(() => migrationComplete(currentFixture)).toBe(true)
      const completedEvents = await migrationCompletedEvents(currentFixture)
      expect(completedEvents).toHaveLength(1)
      expect(completedEvents[0]?.transactionHash).toBeTruthy()
      expect(
        (
          await publicClient.getTransactionReceipt({
            hash: completedEvents[0]!.transactionHash!
          })
        ).status
      ).toBe('success')

      await page.reload()
      await expect(page.getByText('Migration status: Complete', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect(page.getByText('2 Investors', { exact: true })).toBeVisible()
      await expect(page.getByText('40 MIG', { exact: true })).toBeVisible()
      const shareholderRows = page.getByRole('row').filter({ hasText: /25\.00%|75\.00%/ })
      await expect(shareholderRows).toHaveCount(2)
      await expect(shareholderRows.filter({ hasText: '75.00%' })).toContainText('30 MIG')
      await expect(shareholderRows.filter({ hasText: '25.00%' })).toContainText('10 MIG')

      await memberPage.reload()
      await expect(memberPage.getByText('Migration status: Complete', { exact: true })).toBeVisible(
        { timeout: 30_000 }
      )
      await memberPage.locator('[data-test="claim-button"]').click()
      await expect(memberPage.locator('[data-test="claim-error"]')).toBeVisible({
        timeout: 30_000
      })
      expect((await shareholderPosition(currentFixture, E2E_MEMBER)).balance).toBe(
        parseUnits('10', 6)
      )
      expect(await migrationClaimedEvents(currentFixture)).toHaveLength(2)

      await ensureUsdcBalance(currentFixture, E2E_OWNER, parseUnits('4', 6))
      await fundBankWithUsdc(page, company.teamId, '4')
      await expect.poll(() => bankUsdcBalance(currentFixture)).toBe(parseUnits('4', 6))
      const ownerUsdcBefore = await tokenBalance(currentFixture.usdc, E2E_OWNER)
      const memberUsdcBefore = await tokenBalance(currentFixture.usdc, E2E_MEMBER)

      await openRealShareholderManagement(page, company.teamId)
      await distributeUsdcDividends(page, '4')
      await expect.poll(() => bankUsdcBalance(currentFixture)).toBe(0n)
      await expect
        .poll(() => tokenBalance(currentFixture.usdc, E2E_OWNER))
        .toBe(ownerUsdcBefore + parseUnits('3', 6))
      await expect
        .poll(() => tokenBalance(currentFixture.usdc, E2E_MEMBER))
        .toBe(memberUsdcBefore + parseUnits('1', 6))
      expect(await migrationRoot(currentFixture)).not.toBe(zeroHash)
      expect(await migrationComplete(currentFixture)).toBe(true)
    })
  }
)

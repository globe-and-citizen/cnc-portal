import { keccak256, toBytes, type Address } from 'viem'
import type { Team } from '../../src/types/team'
import { expect, test } from './fixtures/integrated'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY, publicClient, artifact } from './e2e-chain'

const minterRole = keccak256(toBytes('MINTER_ROLE'))

async function hasMinterRole(investor: Address, account: Address): Promise<boolean> {
  const investorArtifact = await artifact('artifacts/contracts/Investor/Investor.sol/Investor.json')
  return publicClient.readContract({
    address: investor,
    abi: investorArtifact.abi,
    functionName: 'hasRole',
    args: [minterRole, account]
  }) as Promise<boolean>
}

test.describe(
  '[US-SHER-009] Integrated Investor permission lifecycle',
  { tag: ['@US-SHER-009', '@integrated'] },
  () => {
    test.setTimeout(240_000)

    /**
     * Covers:
     * - [AC-US-SHER-009-01]
     * - [AC-US-SHER-009-03]
     * - [AC-US-SHER-009-04]
     * - [AC-US-SHER-009-05]
     */
    test('grants, persists, and revokes a real Investor minter role', async ({
      authenticatedPage: page,
      operationalTeam
    }) => {
      const teamFixture = await operationalTeam({
        memberPrivateKeys: [E2E_MEMBER_PRIVATE_KEY]
      })

      await page.goto(`/teams/${teamFixture.teamId}`)
      await expect(page).toHaveURL(new RegExp(`/teams/${teamFixture.teamId}$`))

      const teamLoaded = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          new URL(response.url()).pathname === `/api/teams/${teamFixture.teamId}`
      )
      await page.goto(`/teams/${teamFixture.teamId}/sher-token`)
      const teamResponse = await teamLoaded
      expect(teamResponse.ok()).toBe(true)
      const team = (await teamResponse.json()) as Team
      const investor = team.teamContracts.find((contract) => contract.type === 'Investor')?.address
      if (!investor) throw new Error('Integrated company is missing its Investor contract')

      expect(await hasMinterRole(investor, E2E_MEMBER)).toBe(false)

      await expect(page.locator('[data-test="investor-permissions-section"]')).toBeVisible({
        timeout: 30_000
      })
      await page.locator('[data-test="grant-minter-open"]').click()
      const grantDialog = page.getByRole('dialog', { name: 'Grant Investor minter role' })
      await grantDialog.getByPlaceholder('Address').fill(E2E_MEMBER)
      await grantDialog.locator('[data-test="grant-minter-confirm"]').click()
      await expect(page.getByText('Minter role granted', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect.poll(() => hasMinterRole(investor, E2E_MEMBER)).toBe(true)

      await page.locator(`a[href="/teams/${teamFixture.teamId}"]`).first().click()
      await page.locator(`a[href="/teams/${teamFixture.teamId}/sher-token"]`).click()
      const revokeButton = page.locator(`[data-test="revoke-minter-${E2E_MEMBER.toLowerCase()}"]`)
      await expect(revokeButton).toBeVisible({ timeout: 30_000 })
      await revokeButton.click()
      await page
        .getByRole('dialog', { name: 'Revoke Investor minter role' })
        .locator('[data-test="revoke-minter-confirm"]')
        .click()
      await expect(page.getByText('Minter role revoked', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect.poll(() => hasMinterRole(investor, E2E_MEMBER)).toBe(false)
    })
  }
)

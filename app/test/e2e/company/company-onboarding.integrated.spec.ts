import type { Address } from 'viem'
import { expect, test } from '../fixtures'
import { E2E_OWNER, hasCode, publicClient } from '../e2e-chain'
import {
  deployedContracts,
  expectedContractTypes,
  investorDetails,
  officerOwner,
  ownerNonce
} from './company-chain'
import { enterShareDetails } from './company-page'
import {
  createRealCompany,
  deleteRealCompany,
  fetchRealCompany,
  openCompanyMetadataActions,
  openRealCompaniesList
} from './real-company-page'

test.describe(
  '[US-COMPANIES-001/002/003] Integrated company onboarding',
  {
    tag: ['@US-COMPANIES-001', '@US-COMPANIES-002', '@US-COMPANIES-003', '@integrated']
  },
  () => {
    test.setTimeout(180_000)

    /**
     * Covers:
     * - [AC-US-COMPANIES-001-01]
     * - [AC-US-COMPANIES-001-02]
     * - [AC-US-COMPANIES-001-03]
     * - [AC-US-COMPANIES-002-01]
     * - [AC-US-COMPANIES-002-02]
     * - [AC-US-COMPANIES-002-03]
     * - [AC-US-COMPANIES-003-01]
     * - [AC-US-COMPANIES-003-02]
     */
    test('creates, deploys and opens an operational company', async ({ page }) => {
      const team = await createRealCompany(page)
      const teamId = String(team.id)

      try {
        const created = await fetchRealCompany(page, teamId)
        expect(created).toMatchObject({
          id: team.id,
          name: team.name,
          description: team.description,
          ownerAddress: E2E_OWNER,
          isArchived: false,
          isHidden: false
        })
        expect(
          created.members.some(({ address }) => address.toLowerCase() === E2E_OWNER.toLowerCase())
        ).toBe(true)

        const before = await ownerNonce()
        await enterShareDetails(page)
        await page.locator('[data-test="deploy-contracts-button"]').click()
        await expect(page.locator('[data-test="step-4"]')).toBeVisible({ timeout: 120_000 })

        const persisted = await fetchRealCompany(page, teamId)
        const officer = persisted.currentOfficer?.address as Address | undefined
        expect(officer).toBeDefined()
        expect(await ownerNonce()).toBe(before + 1)
        expect(await hasCode(officer!)).toBe(true)
        expect(await officerOwner(officer!)).toBe(E2E_OWNER)

        const contracts = await deployedContracts(officer!)
        expect(contracts.map(({ contractType }) => contractType).sort()).toEqual(
          expectedContractTypes
        )
        for (const { contractAddress } of contracts) {
          expect(await hasCode(contractAddress)).toBe(true)
        }

        const investor = contracts.find(({ contractType }) => contractType === 'Investor')
        expect(investor).toBeDefined()
        expect(await investorDetails(investor!.contractAddress)).toEqual({
          name: 'E2E Shares',
          symbol: 'E2E',
          owner: E2E_OWNER
        })

        const deploymentBlock = await publicClient.getBlock({
          blockNumber: BigInt(persisted.currentOfficer!.deployBlockNumber!)
        })
        expect(deploymentBlock.transactions).toHaveLength(1)

        await page.locator('[data-test="skip-safe-setup-button"]').click()
        await expect(page).toHaveURL(new RegExp(`/teams/${teamId}$`))
        await openRealCompaniesList(page)
        const card = page.locator(`[data-test="team-card-${teamId}"]`)
        await expect(card).toContainText(team.name)
        await card.locator('[data-test="team-link"]').click()
        await expect(page).toHaveURL(new RegExp(`/teams/${teamId}$`))
        await openCompanyMetadataActions(page, team.name)
        await expect(page.getByText(team.description!, { exact: true })).toBeVisible()
        await expect(page.getByText('Team Members', { exact: true })).toBeVisible()
        await expect(page.locator(`a[href="/teams/${teamId}/accounts/bank-account"]`)).toBeVisible()
      } finally {
        await deleteRealCompany(page, teamId)
      }
    })
  }
)

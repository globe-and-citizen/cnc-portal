import type { Address } from 'viem'
import { expect, test } from '../fixtures/integrated'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY, E2E_OWNER, hasCode, publicClient } from '../e2e-chain'
import { openAccountFromSidebar } from '../e2e-page'
import { deleteIntegratedTeam } from '../integrated-api'
import {
  deployedContracts,
  expectedContractTypes,
  investorDetails,
  officerOwner,
  ownerNonce
} from './company-chain'
import {
  createRealCompany,
  deleteCompanyThroughUi,
  enterShareDetails,
  finishRealCompanyWithoutContracts,
  openCompanyMetadataActions,
  openRealCompaniesList,
  uniqueCompanyName
} from './real-company-page'

const card = (page: Parameters<typeof createRealCompany>[0], teamId: string) =>
  page.locator(`[data-test="team-card-${teamId}"]`)

interface OfficerRegistrationResponse {
  officer: {
    address: Address
    deployBlockNumber: string
  }
}

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
        expect(team).toMatchObject({
          id: team.id,
          name: team.name,
          description: team.description,
          ownerAddress: E2E_OWNER,
          isArchived: false,
          isHidden: false
        })
        expect(
          team.members.some(({ address }) => address.toLowerCase() === E2E_OWNER.toLowerCase())
        ).toBe(true)

        const before = await ownerNonce()
        await enterShareDetails(page)
        const registered = page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            new URL(response.url()).pathname === '/api/contract/officer'
        )
        await page.locator('[data-test="deploy-contracts-button"]').click()
        const registrationResponse = await registered
        expect(registrationResponse.ok()).toBe(true)
        const registration = (await registrationResponse.json()) as OfficerRegistrationResponse
        await expect(page.locator('[data-test="step-4"]')).toBeVisible({ timeout: 120_000 })

        const officer = registration.officer.address
        expect(await ownerNonce()).toBe(before + 1)
        expect(await hasCode(officer)).toBe(true)
        expect(await officerOwner(officer)).toBe(E2E_OWNER)

        const contracts = await deployedContracts(officer)
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
          blockNumber: BigInt(registration.officer.deployBlockNumber)
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
        await deleteCompanyThroughUi(page, teamId, team.name)
      }
    })
  }
)

test.describe(
  '[US-COMPANIES-003/004/005] Integrated company administration',
  {
    tag: ['@US-COMPANIES-003', '@US-COMPANIES-004', '@US-COMPANIES-005', '@integrated']
  },
  () => {
    test.setTimeout(180_000)

    /**
     * Covers:
     * - [AC-US-COMPANIES-003-01]
     * - [AC-US-COMPANIES-003-05]
     * - [AC-US-COMPANIES-004-01]
     * - [AC-US-COMPANIES-005-01]
     * - [AC-US-COMPANIES-005-02]
     * - [AC-US-COMPANIES-005-03]
     */
    test('updates company details and manages the member lifecycle', async ({
      walletPage,
      page
    }) => {
      const memberPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)

      const company = await createRealCompany(page)
      const teamId = String(company.id)
      const updatedName = uniqueCompanyName('Updated E2E Company')
      const updatedDescription = 'Updated by the integrated company-administration journey.'
      let currentName = company.name

      try {
        await finishRealCompanyWithoutContracts(page, teamId)
        await openCompanyMetadataActions(page, company.name)
        await page.locator('[data-test="team-meta-update-open"]').click()
        const dialog = page.getByRole('dialog')
        const name = dialog.getByLabel('Company Name')
        const description = dialog.getByLabel('Description')
        await name.fill(updatedName)
        await description.fill(updatedDescription)
        await dialog.getByRole('button', { name: 'Save changes' }).click()
        await expect(page.getByText('Company updated successfully', { exact: true })).toBeVisible()
        currentName = updatedName

        await page.reload()
        await openCompanyMetadataActions(page, updatedName)
        await expect(page.getByText(updatedName, { exact: true }).first()).toBeVisible()
        await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible()
        await openRealCompaniesList(page)
        await expect(card(page, teamId)).toContainText(updatedName)
        await expect(card(page, teamId)).toContainText(updatedDescription)
        await card(page, teamId).locator('[data-test="team-link"]').click()
        await openAccountFromSidebar(page, `/teams/${teamId}/accounts/payroll-account`)
        await expect(page.locator('[data-test="members-table"]')).toContainText('1')

        await page.locator('[data-test="add-member-button"]').click()
        await page.getByPlaceholder('Search by name or address').fill(E2E_MEMBER)
        await page
          .locator('[data-test="user-row"]')
          .filter({ hasText: `${E2E_MEMBER.slice(0, 6)}...${E2E_MEMBER.slice(-4)}` })
          .click()
        await page.locator('[data-test="add-members-submit"]').click()
        await expect(page.getByText('Members added successfully', { exact: true })).toBeVisible()

        const memberRow = page
          .locator('[data-test="members-table"] tbody tr')
          .filter({ hasText: E2E_MEMBER.slice(0, 6) })
        await expect(memberRow).toBeVisible()
        await expect(page.locator('[data-test="members-table"]')).toContainText('2')

        await memberPage.goto('/teams')
        await expect(card(memberPage, teamId)).toContainText(updatedName)
        await card(memberPage, teamId).locator('[data-test="team-link"]').click()
        await expect(memberPage).toHaveURL(new RegExp(`/teams/${teamId}$`))
        await expect(
          memberPage.getByRole('heading', { name: updatedName, exact: true })
        ).toBeVisible()

        await memberRow.locator('[data-test="delete-member-button"]').click()
        await page.locator('[data-test="delete-member-confirm-button"]').click()
        await expect(memberRow).toHaveCount(0)
        await expect(page.locator('[data-test="members-table"]')).toContainText('1')

        await memberPage.goto('/teams')
        await expect(card(memberPage, teamId)).toHaveCount(0)
        const forbidden = memberPage.waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            new URL(response.url()).pathname === `/api/teams/${teamId}`
        )
        await memberPage.goto(`/teams/${teamId}`)
        expect((await forbidden).status()).toBe(403)
        await expect(memberPage.locator('[data-test="error-state"]')).toContainText(
          "We couldn't load this company",
          { timeout: 20_000 }
        )
      } finally {
        await deleteCompanyThroughUi(page, teamId, currentName)
      }
    })
  }
)

test.describe('[US-COMPANIES-008] Integrated company deletion', { tag: '@integrated' }, () => {
  test.setTimeout(180_000)

  /**
   * Covers:
   * - [AC-US-COMPANIES-008-01]
   * - [AC-US-COMPANIES-008-04]
   * - [AC-US-COMPANIES-008-05]
   */
  test('keeps a cancelled deletion and makes the company unavailable after confirmation', async ({
    page
  }) => {
    const company = await createRealCompany(page)
    const teamId = String(company.id)

    try {
      await finishRealCompanyWithoutContracts(page, teamId)

      await openCompanyMetadataActions(page, company.name)
      await page.locator('[data-test="team-meta-delete-open"]').click()
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
      const retained = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          new URL(response.url()).pathname === `/api/teams/${teamId}`
      )
      await page.reload()
      expect((await retained).status()).toBe(200)
      await expect(page.getByRole('heading', { name: company.name, exact: true })).toBeVisible()

      await openCompanyMetadataActions(page, company.name)
      await page.locator('[data-test="team-meta-delete-open"]').click()
      const deleted = page.waitForResponse(
        (response) =>
          response.request().method() === 'DELETE' &&
          new URL(response.url()).pathname === `/api/teams/${teamId}`
      )
      await page.locator('[data-test="delete-team-button"]').click()
      expect((await deleted).status()).toBe(204)
      await expect(page).toHaveURL(/\/teams$/)
      await expect(card(page, teamId)).toHaveCount(0)
      await page.reload()
      await expect(card(page, teamId)).toHaveCount(0)

      const unavailable = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          new URL(response.url()).pathname === `/api/teams/${teamId}`
      )
      await page.goto(`/teams/${teamId}`)
      expect((await unavailable).status()).toBe(404)
      await expect(page.locator('[data-test="error-state"]')).toContainText('Company not found')
    } finally {
      await deleteIntegratedTeam(teamId)
    }
  })
})

import type { Address } from 'viem'
import { expect, test } from '../fixtures'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY, E2E_OWNER, hasCode, publicClient } from '../e2e-chain'
import { openAccountFromSidebar, useWallet } from '../e2e-page'
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
  finishRealCompanyWithoutContracts,
  openCompanyMetadataActions,
  openRealCompaniesList,
  realCompanyStatus,
  signInToRealStack,
  uniqueCompanyName
} from './real-company-page'

const card = (page: Parameters<typeof createRealCompany>[0], teamId: string) =>
  page.locator(`[data-test="team-card-${teamId}"]`)

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

test.describe('[US-COMPANIES-004] Integrated company details', { tag: '@integrated' }, () => {
  /**
   * Covers:
   * - [AC-US-COMPANIES-004-01]
   * - [AC-US-COMPANIES-004-03]
   */
  test('validates and persists updated company metadata', async ({ page }) => {
    const company = await createRealCompany(page)
    const teamId = String(company.id)
    const updatedName = uniqueCompanyName('Updated E2E Company')
    const updatedDescription = 'Updated by the integrated company-details journey.'

    try {
      await finishRealCompanyWithoutContracts(page, teamId)
      await openCompanyMetadataActions(page, company.name)
      await page.locator('[data-test="team-meta-update-open"]').click()
      const dialog = page.getByRole('dialog')
      const name = dialog.getByLabel('Company Name')
      const description = dialog.getByLabel('Description')
      await name.fill('x')
      await dialog.getByRole('button', { name: 'Save changes' }).click()
      await expect(dialog.getByText('Name must be at least 3 characters')).toBeVisible()
      await name.fill(updatedName)
      await description.fill(updatedDescription)
      await dialog.getByRole('button', { name: 'Save changes' }).click()
      await expect(page.getByText('Company updated successfully', { exact: true })).toBeVisible()

      const persisted = await fetchRealCompany(page, teamId)
      expect(persisted).toMatchObject({ name: updatedName, description: updatedDescription })
      await expect(page.getByText(updatedName, { exact: true }).first()).toBeVisible()
      await openRealCompaniesList(page)
      await expect(card(page, teamId)).toContainText(updatedName)
      await expect(card(page, teamId)).toContainText(updatedDescription)
    } finally {
      await deleteRealCompany(page, teamId)
    }
  })
})

test.describe('[US-COMPANIES-005] Integrated company membership', { tag: '@integrated' }, () => {
  /**
   * Covers:
   * - [AC-US-COMPANIES-005-01]
   * - [AC-US-COMPANIES-005-02]
   * - [AC-US-COMPANIES-005-03]
   */
  test('adds an eligible portal user and removes the same member', async ({ browser, page }) => {
    const memberContext = await browser.newContext()
    const memberPage = await memberContext.newPage()
    await useWallet(memberPage, E2E_MEMBER_PRIVATE_KEY)
    await signInToRealStack(memberPage)
    await memberContext.close()

    const company = await createRealCompany(page)
    const teamId = String(company.id)

    try {
      await finishRealCompanyWithoutContracts(page, teamId)
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
      await expect.poll(async () => (await fetchRealCompany(page, teamId)).members.length).toBe(2)

      const memberRow = page
        .locator('[data-test="members-table"] tbody tr')
        .filter({ hasText: E2E_MEMBER.slice(0, 6) })
      await expect(memberRow).toBeVisible()
      await memberRow.locator('[data-test="delete-member-button"]').click()
      await page.locator('[data-test="delete-member-confirm-button"]').click()
      await expect.poll(async () => (await fetchRealCompany(page, teamId)).members.length).toBe(1)
      expect(
        (await fetchRealCompany(page, teamId)).members.some(
          ({ address }) => address.toLowerCase() === E2E_MEMBER.toLowerCase()
        )
      ).toBe(false)
    } finally {
      await deleteRealCompany(page, teamId)
    }
  })
})

test.describe('[US-COMPANIES-006] Integrated company lifecycle', { tag: '@integrated' }, () => {
  /**
   * Covers:
   * - [AC-US-COMPANIES-006-01]
   * - [AC-US-COMPANIES-006-02]
   * - [AC-US-COMPANIES-006-03]
   */
  test('archives, finds and restores the same company', async ({ page }) => {
    const company = await createRealCompany(page)
    const teamId = String(company.id)

    try {
      await finishRealCompanyWithoutContracts(page, teamId)
      await openCompanyMetadataActions(page, company.name)
      await page.locator('[data-test="team-meta-archive-open"]').click()
      await page.locator('[data-test="archive-team-button"]').click()
      await expect(page.locator('[data-test="team-archived-banner"]')).toBeVisible()

      await openRealCompaniesList(page)
      await expect(card(page, teamId)).toHaveCount(0)
      await page.locator('[data-test="toggle-show-archived"]').click()
      await expect(card(page, teamId)).toContainText('Archived')
      await card(page, teamId).locator('[data-test="team-link"]').click()
      await page.locator('[data-test="team-archived-unarchive-button"]').click()
      await expect(page.getByText('Company unarchived successfully', { exact: true })).toBeVisible()
      await expect(page.locator('[data-test="team-archived-banner"]')).toHaveCount(0)

      expect((await fetchRealCompany(page, teamId)).isArchived).toBe(false)
      await openRealCompaniesList(page)
      await expect(card(page, teamId)).toBeVisible()
    } finally {
      await deleteRealCompany(page, teamId)
    }
  })
})

test.describe('[US-COMPANIES-007] Integrated list visibility', { tag: '@integrated' }, () => {
  /**
   * Covers:
   * - [AC-US-COMPANIES-007-01]
   * - [AC-US-COMPANIES-007-02]
   */
  test('hides the company from the default list and shows it again', async ({ page }) => {
    const company = await createRealCompany(page)
    const teamId = String(company.id)

    try {
      await finishRealCompanyWithoutContracts(page, teamId)
      await openCompanyMetadataActions(page, company.name)
      await page.locator('[data-test="team-meta-visibility-open"]').click()
      await page.locator('[data-test="visibility-team-button"]').click()

      await openRealCompaniesList(page)
      await expect(card(page, teamId)).toHaveCount(0)
      await page.locator('[data-test="toggle-show-hidden"]').click()
      await expect(card(page, teamId)).toContainText('Hidden')
      await card(page, teamId).locator('[data-test="team-link"]').click()
      await openCompanyMetadataActions(page, company.name)
      await page.locator('[data-test="team-meta-visibility-open"]').click()
      await page.locator('[data-test="visibility-team-button"]').click()

      await expect(page.getByText('Company is visible again', { exact: true })).toBeVisible()
      await expect.poll(async () => (await fetchRealCompany(page, teamId)).isHidden).toBe(false)
      await openRealCompaniesList(page)
      await expect(card(page, teamId)).toBeVisible()
    } finally {
      await deleteRealCompany(page, teamId)
    }
  })
})

test.describe('[US-COMPANIES-008] Integrated company deletion', { tag: '@integrated' }, () => {
  /**
   * Covers:
   * - [AC-US-COMPANIES-008-01]
   * - [AC-US-COMPANIES-008-04]
   * - [AC-US-COMPANIES-008-05]
   */
  test('keeps a cancelled deletion and permanently deletes after confirmation', async ({
    page
  }) => {
    const company = await createRealCompany(page)
    const teamId = String(company.id)
    let deleted = false

    try {
      await finishRealCompanyWithoutContracts(page, teamId)
      await openCompanyMetadataActions(page, company.name)
      await page.locator('[data-test="team-meta-delete-open"]').click()
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
      expect(await realCompanyStatus(page, teamId)).toBe(200)

      await page.locator('[data-test="team-meta-delete-open"]').click()
      await page.locator('[data-test="delete-team-button"]').click()
      await expect(page).toHaveURL(/\/teams$/)
      await expect(card(page, teamId)).toHaveCount(0)
      expect(await realCompanyStatus(page, teamId)).toBe(404)
      deleted = true
    } finally {
      if (!deleted) await deleteRealCompany(page, teamId)
    }
  })
})

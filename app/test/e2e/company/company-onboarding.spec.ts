import type { Address } from 'viem'
import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures'
import { E2E_OWNER, hasCode, publicClient, snapshotChain, revertChain } from '../e2e-chain'
import { deploySafeE2EFixture, safeOwners, safeThreshold } from '../safe/safe-chain'
import { rejectNextWalletRequest } from '../e2e-page'
import {
  breakContract,
  deployCompanyInfrastructure,
  deployedContracts,
  drainBalance,
  expectedContractTypes,
  investorDetails,
  officerOwner,
  ownerNonce,
  type CompanyAddresses
} from './company-chain'
import {
  createCompanyUntilOfficer,
  enterShareDetails,
  gate,
  shareNameInput,
  shareSymbolInput,
  useCompanyInfrastructure
} from './company-page'

test.describe('[US-COMPANIES-002] Officer onboarding', { tag: '@US-COMPANIES-002' }, () => {
  let addresses: CompanyAddresses
  let snapshot: string

  test.beforeAll(async () => {
    addresses = await deployCompanyInfrastructure()
  })
  test.beforeEach(async ({ page }) => {
    snapshot = await snapshotChain()
    await useCompanyInfrastructure(page, addresses)
  })
  test.afterEach(async () => {
    await revertChain(snapshot)
  })

  /** Deploy the Officer suite with the shared share details; returns the mocked API. */
  async function deployOfficer(page: Page) {
    const api = await createCompanyUntilOfficer(page)
    await enterShareDetails(page)
    await page.locator('[data-test="deploy-contracts-button"]').click()
    await expect(page.locator('[data-test="step-4"]')).toBeVisible({ timeout: 60_000 })
    expect(api.officerAttempts).toHaveLength(1)
    return api
  }

  async function verifyOfficer(officer: Address) {
    expect(await hasCode(officer)).toBe(true)
    expect(await officerOwner(officer)).toBe(E2E_OWNER)
    const contracts = await deployedContracts(officer)
    expect(contracts.map((c) => c.contractType).sort()).toEqual(expectedContractTypes)
    for (const item of contracts) expect(await hasCode(item.contractAddress)).toBe(true)
    const investor = contracts.find((c) => c.contractType === 'Investor')!.contractAddress
    expect(await investorDetails(investor)).toEqual({
      name: 'E2E Shares',
      symbol: 'E2E',
      owner: E2E_OWNER
    })
  }

  test.setTimeout(180_000)
  /**
   * Covers:
   * - [AC-US-COMPANIES-002-01]
   * - [AC-US-COMPANIES-002-02]
   * - [AC-US-COMPANIES-002-03]
   */
  test(
    'deploys and registers the Officer suite and a Safe through the complete company wizard',
    { tag: ['@US-COMPANIES-001', '@US-COMPANIES-002', '@US-SAFE-001'] },
    async ({ page }) => {
      const api = await deployOfficer(page)
      const officer = api.officerAttempts[0]!
      expect(officer).toMatchObject({
        teamId: '1',
        deployBlockNumber: expect.any(Number),
        deployedAt: expect.any(String)
      })
      await verifyOfficer(officer.address as Address)
      const block = await publicClient.getBlock({
        blockNumber: BigInt(officer.deployBlockNumber!)
      })
      expect(block.transactions).toHaveLength(1)
      await page.locator('[data-test="deploy-safe-button"]').click()
      await expect(page).toHaveURL(/\/teams\/1$/, { timeout: 60_000 })
      expect(api.safeAttempts).toHaveLength(1)
      const safe = api.safeAttempts[0]!
      expect(safe).toMatchObject({ teamId: '1', contractType: 'Safe', deployer: E2E_OWNER })
      expect(await safeOwners(safe.contractAddress as Address)).toEqual([E2E_OWNER])
      expect(await safeThreshold(safe.contractAddress as Address)).toBe(1)
      await expect(page.locator('[data-test="team-picker"]')).toContainText('E2E Company')
      expect(api.attempts).toHaveLength(1)
    }
  )

  /**
   * Covers:
   * - [AC-US-COMPANIES-002-04]
   */
  test('requires both share name and symbol before requesting deployment', async ({ page }) => {
    const api = await createCompanyUntilOfficer(page)
    const before = await ownerNonce()
    const deploy = page.locator('[data-test="deploy-contracts-button"]')
    await expect(deploy).toBeDisabled()
    await shareNameInput(page).fill('E2E Shares')
    await expect(deploy).toBeDisabled()
    await shareNameInput(page).fill('')
    await shareSymbolInput(page).fill('E2E')
    await expect(deploy).toBeDisabled()
    await enterShareDetails(page)
    await expect(deploy).toBeEnabled()
    expect(api.officerAttempts).toHaveLength(0)
    expect(await ownerNonce()).toBe(before)
  })

  /** Each cause returns the step that lifts it before the retry. */
  const failures: Record<string, (page: Page) => Promise<() => Promise<void>>> = {
    'wallet rejection': async (page) => {
      await rejectNextWalletRequest(page)
      return async () => {}
    },
    'reverting factory': () => breakContract(addresses['Officer#FactoryBeacon']!),
    'insufficient gas funds': () => drainBalance(E2E_OWNER)
  }

  for (const [failure, cause] of Object.entries(failures)) {
    /**
     * Covers:
     * - [AC-US-COMPANIES-002-07]
     */
    test(`keeps Officer setup recoverable after ${failure}`, async ({ page }) => {
      const api = await createCompanyUntilOfficer(page)
      await enterShareDetails(page)
      const before = await ownerNonce()
      const restore = await cause(page)
      await page.locator('[data-test="deploy-contracts-button"]').click()
      await expect(page.locator('[data-test="deploy-error-alert"]')).toBeVisible({
        timeout: 45_000
      })
      await expect(page.locator('[data-test="step-3"]')).toBeVisible()
      await expect(page.locator('[data-test="step-4"]')).toHaveCount(0)
      expect(api.officerAttempts).toHaveLength(0)
      expect(await ownerNonce()).toBe(before)
      await expect(shareNameInput(page)).toHaveValue('E2E Shares')
      await expect(shareSymbolInput(page)).toHaveValue('E2E')
      await restore()
      await page.locator('[data-test="deploy-contracts-button"]').click()
      await expect(page.locator('[data-test="step-4"]')).toBeVisible({ timeout: 60_000 })
      expect(api.officerAttempts).toHaveLength(1)
      expect(await ownerNonce()).toBe(before + 1)
      await verifyOfficer(api.officerAttempts[0]!.address as Address)
    })
  }

  test('reports a missing required beacon without requesting a transaction', async ({ page }) => {
    const incomplete = { ...addresses }
    delete incomplete['BankBeaconModule#Beacon']
    await useCompanyInfrastructure(page, incomplete)
    const api = await createCompanyUntilOfficer(page)
    await enterShareDetails(page)
    const before = await ownerNonce()
    await page.locator('[data-test="deploy-contracts-button"]').click()
    await expect(page.locator('[data-test="deploy-error-alert"]')).toBeVisible()
    await expect(page.locator('[data-test="step-3"]')).toBeVisible()
    expect(api.officerAttempts).toHaveLength(0)
    expect(await ownerNonce()).toBe(before)
  })

  /**
   * Covers:
   * - [AC-US-COMPANIES-002-08]
   */
  test('distinguishes a mined deployment from a failed Officer registration', async ({ page }) => {
    const api = await createCompanyUntilOfficer(page)
    api.failOfficerRegistration = true
    await enterShareDetails(page)
    const before = await ownerNonce()
    await page.locator('[data-test="deploy-contracts-button"]').click()
    await expect(page.locator('[data-test="register-error-alert"]')).toContainText(
      'Officer registration unavailable',
      { timeout: 45_000 }
    )
    await expect(page.locator('[data-test="deploy-error-alert"]')).toHaveCount(0)
    await expect(page.locator('[data-test="step-4"]')).toHaveCount(0)
    await expect(
      page.getByText('Officer contracts deployed and synced successfully', { exact: true })
    ).toHaveCount(0)
    expect(api.officerAttempts.length).toBeGreaterThan(0)
    const officer = api.officerAttempts[0]!.address as Address
    expect(new Set(api.officerAttempts.map((attempt) => attempt.address)).size).toBe(1)
    await verifyOfficer(officer)
    expect(await ownerNonce()).toBe(before + 1)
    expect(api.companies[0]!.currentOfficer).toBeNull()
    // No registration-only retry is currently exposed for Officer. Do not
    // click Deploy again and silently accept a duplicate on-chain deployment.
  })

  test('prevents a second deployment while Officer registration is pending', async ({ page }) => {
    const api = await createCompanyUntilOfficer(page)
    const registration = gate()
    api.beforeOfficerRegistration = () => registration.promise
    await enterShareDetails(page)
    const before = await ownerNonce()
    await page.locator('[data-test="deploy-contracts-button"]').click()
    try {
      await expect.poll(() => api.officerAttempts.length, { timeout: 45_000 }).toBe(1)
      await expect(page.locator('[data-test="deploy-contracts-button"]')).toBeDisabled()
      await expect(page.locator('[data-test="step-4"]')).toHaveCount(0)
    } finally {
      registration.release()
    }
    await expect(page.locator('[data-test="step-4"]')).toBeVisible({ timeout: 30_000 })
    expect(api.officerAttempts).toHaveLength(1)
    expect(await ownerNonce()).toBe(before + 1)
    await page.locator('[data-test="skip-safe-setup-button"]').click()
    await expect(page).toHaveURL(/\/teams\/1$/)
    expect(api.safeAttempts).toHaveLength(0)
  })

  test('deploys Officer contracts and then imports an existing Safe', async ({ page }) => {
    const { multisigSafe } = await deploySafeE2EFixture()
    const before = await ownerNonce()
    const api = await deployOfficer(page)
    await page.getByRole('tab', { name: 'Import an existing Safe' }).click()
    await page.locator('input[data-test="safe-import-address-input"]').fill(multisigSafe)
    await page.locator('[data-test="inspect-safe-button"]').click()
    await expect(page.locator('[data-test="safe-import-summary"]')).toContainText('2 of 2')
    await page.locator('[data-test="confirm-safe-import-button"]').click()
    await expect(page).toHaveURL(/\/teams\/1$/)
    expect(api.safeAttempts).toHaveLength(1)
    expect(api.companies[0]!.currentOfficer?.address).toBe(api.officerAttempts[0]!.address)
    expect(api.companies[0]!.safeAddress?.toLowerCase()).toBe(multisigSafe.toLowerCase())
    expect(await safeThreshold(multisigSafe)).toBe(2)
    expect(await ownerNonce()).toBe(before + 1)
  })

  test('deploys the core suite when optional Vesting and FixedReturn beacons are absent', async ({
    page
  }) => {
    const coreOnly = { ...addresses }
    delete coreOnly['VestingBeaconModule#Beacon']
    delete coreOnly['FixedReturnBeaconModule#Beacon']
    await useCompanyInfrastructure(page, coreOnly)
    const api = await deployOfficer(page)
    const contracts = await deployedContracts(api.officerAttempts[0]!.address as Address)
    expect(contracts.map((c) => c.contractType).sort()).toEqual(
      expectedContractTypes.filter((type) => type !== 'Vesting' && type !== 'FixedReturn')
    )
  })
})

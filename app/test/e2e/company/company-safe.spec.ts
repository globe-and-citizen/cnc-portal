import type { Address } from 'viem'
import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures'
import {
  E2E_OWNER,
  E2E_MEMBER,
  E2E_USDC_ADDRESS,
  hasCode,
  snapshotChain,
  revertChain
} from '../e2e-chain'
import { E2E_SAFE_INFRA } from '../../../src/e2e/chain'
import { E2E_RPC_ROUTE, failRpcCalls, rejectNextWalletRequest, type RpcCall } from '../e2e-page'
import { openSafeAccount } from '../safe/safe-page'
import {
  deploySafeE2EFixture,
  safeOwners,
  safeThreshold,
  safeNonce,
  type SafeE2EFixture
} from '../safe/safe-chain'
import { breakContract, ownerNonce } from './company-chain'
import { createCompanyUntilSafe, gate } from './company-page'

test.describe(
  'Safe setup during company creation',
  { tag: ['@US-COMPANIES-001', '@US-SAFE-001'] },
  () => {
    let fixture: SafeE2EFixture
    let snapshot: string

    test.beforeAll(async () => {
      fixture = await deploySafeE2EFixture()
    })
    test.beforeEach(async () => {
      snapshot = await snapshotChain()
    })
    test.afterEach(async () => {
      await revertChain(snapshot)
    })

    async function openImport(page: Page) {
      const api = await createCompanyUntilSafe(page)
      await page.getByRole('tab', { name: 'Import an existing Safe' }).click()
      return api
    }

    async function inspect(page: Page, address: string) {
      await page.locator('input[data-test="safe-import-address-input"]').fill(address)
      await page.locator('[data-test="inspect-safe-button"]').click()
    }

    async function verifyCreatedSafe(address: Address) {
      expect(await hasCode(address)).toBe(true)
      expect(await safeOwners(address)).toEqual([E2E_OWNER])
      expect(await safeThreshold(address)).toBe(1)
    }

    test.setTimeout(120_000)

    test('deploys and links a Safe when Officer setup was deferred', async ({ page }) => {
      const api = await createCompanyUntilSafe(page)
      const before = await ownerNonce()
      await page.locator('[data-test="deploy-safe-button"]').click()
      await expect(page).toHaveURL(/\/teams\/1$/, { timeout: 45_000 })
      expect(api.officerAttempts).toHaveLength(0)
      expect(api.safeAttempts).toHaveLength(1)
      expect(api.safeAttempts[0]).toMatchObject({
        teamId: '1',
        contractType: 'Safe',
        deployer: E2E_OWNER
      })
      await verifyCreatedSafe(api.safeAttempts[0]!.contractAddress as Address)
      expect(api.companies[0]!.safeAddress).toBe(api.safeAttempts[0]!.contractAddress)
      expect(await ownerNonce()).toBe(before + 1)
    })

    for (const failure of ['wallet rejection', 'reverting factory'] as const) {
      test(`does not register a Safe after ${failure} and allows retry`, async ({ page }) => {
        const api = await createCompanyUntilSafe(page)
        const before = await ownerNonce()
        let restore = async () => {}
        if (failure === 'wallet rejection') await rejectNextWalletRequest(page)
        else restore = await breakContract(E2E_SAFE_INFRA.proxyFactory)
        await page.locator('[data-test="deploy-safe-button"]').click()
        await expect(page.getByText('Error', { exact: true })).toBeVisible({ timeout: 30_000 })
        await expect(page.locator('[data-test="deploy-safe-button"]')).toBeEnabled()
        await expect(page.locator('[data-test="step-4"]')).toBeVisible()
        await expect(page.locator('[data-test="safe-registration-pending"]')).toHaveCount(0)
        expect(api.safeAttempts).toHaveLength(0)
        expect(await ownerNonce()).toBe(before)
        await restore()
        await page.locator('[data-test="deploy-safe-button"]').click()
        await expect(page).toHaveURL(/\/teams\/1$/, { timeout: 45_000 })
        expect(api.safeAttempts).toHaveLength(1)
        await verifyCreatedSafe(api.safeAttempts[0]!.contractAddress as Address)
        expect(await ownerNonce()).toBe(before + 1)
      })
    }

    test('retries registration of the same deployed Safe without sending another transaction', async ({
      page
    }) => {
      const api = await createCompanyUntilSafe(page)
      api.failSafeRegistration = true
      const before = await ownerNonce()
      await page.locator('[data-test="deploy-safe-button"]').click()
      await expect(page.locator('[data-test="safe-registration-pending"]')).toBeVisible({
        timeout: 45_000
      })
      await expect(page.locator('[data-test="deploy-safe-button"]')).toHaveCount(0)
      await expect(page.locator('[data-test="step-4"]')).toBeVisible()
      expect(api.companies[0]!.safeAddress).toBeUndefined()
      expect(api.safeAttempts.length).toBeGreaterThan(0)
      const safe = api.safeAttempts[0]!.contractAddress as Address
      await verifyCreatedSafe(safe)
      expect(await ownerNonce()).toBe(before + 1)
      const failedAttempts = api.safeAttempts.length
      api.failSafeRegistration = false
      await page.locator('[data-test="retry-safe-registration-button"]').click()
      await expect(page).toHaveURL(/\/teams\/1$/)
      expect(api.safeAttempts).toHaveLength(failedAttempts + 1)
      expect(new Set(api.safeAttempts.map((attempt) => attempt.contractAddress))).toEqual(
        new Set([safe])
      )
      expect(api.companies[0]!.safeAddress).toBe(safe)
      expect(await ownerNonce()).toBe(before + 1)
    })

    test('keeps deployment disabled until the Safe registration finishes', async ({ page }) => {
      const api = await createCompanyUntilSafe(page)
      const registration = gate()
      api.beforeSafeRegistration = () => registration.promise
      const before = await ownerNonce()
      await page.locator('[data-test="deploy-safe-button"]').click()
      try {
        await expect.poll(() => api.safeAttempts.length, { timeout: 30_000 }).toBe(1)
        await expect(page.locator('[data-test="deploy-safe-button"]')).toBeDisabled()
        await expect(page.locator('[data-test="step-4"]')).toBeVisible()
      } finally {
        registration.release()
      }
      await expect(page).toHaveURL(/\/teams\/1$/)
      expect(api.safeAttempts).toHaveLength(1)
      expect(await ownerNonce()).toBe(before + 1)
    })

    test('imports an inspected multisig Safe without changing owners, threshold or nonce', async ({
      page
    }) => {
      const api = await openImport(page)
      const before = await ownerNonce()
      const nonce = await safeNonce(fixture.multisigSafe)
      await expect(page.locator('[data-test="confirm-safe-import-button"]')).toBeDisabled()
      await inspect(page, fixture.multisigSafe)
      await expect(page.locator('[data-test="safe-import-summary"]')).toContainText('2 of 2')
      await page.locator('[data-test="safe-import-owners-toggle"]').click()
      await expect(page.locator('[data-test="safe-import-summary"]')).toContainText(
        'Connected wallet'
      )
      await page.locator('[data-test="confirm-safe-import-button"]').click()
      await expect(page).toHaveURL(/\/teams\/1$/)
      expect(api.safeAttempts).toHaveLength(1)
      expect(api.safeAttempts[0]!.contractAddress.toLowerCase()).toBe(
        fixture.multisigSafe.toLowerCase()
      )
      expect(await safeOwners(fixture.multisigSafe)).toEqual([E2E_OWNER, E2E_MEMBER])
      expect(await safeThreshold(fixture.multisigSafe)).toBe(2)
      expect(await safeNonce(fixture.multisigSafe)).toBe(nonce)
      expect(await ownerNonce()).toBe(before)
    })

    const invalidImports = [
      ['malformed address', 'not-an-address', 'Enter a valid Safe address'],
      ['wallet address without contract', E2E_OWNER, 'No supported Safe was found'],
      ['non-Safe token contract', E2E_USDC_ADDRESS, 'No supported Safe was found']
    ] as const

    for (const [name, address, message] of invalidImports) {
      test(`rejects importing a ${name}`, async ({ page }) => {
        const api = await openImport(page)
        const before = await ownerNonce()
        await expect(page.locator('[data-test="inspect-safe-button"]')).toBeDisabled()
        await inspect(page, address)
        await expect(page.locator('[data-test="safe-import-error"]')).toContainText(message, {
          timeout: 30_000
        })
        await expect(page.locator('[data-test="safe-import-summary"]')).toHaveCount(0)
        await expect(page.locator('[data-test="confirm-safe-import-button"]')).toBeDisabled()
        expect(api.safeAttempts).toHaveLength(0)
        expect(await ownerNonce()).toBe(before)
      })
    }

    test('requires another inspection after editing or resetting a verified address', async ({
      page
    }) => {
      const api = await openImport(page)
      await inspect(page, fixture.safe)
      await expect(page.locator('[data-test="confirm-safe-import-button"]')).toBeEnabled()
      await page.locator('input[data-test="safe-import-address-input"]').fill(fixture.multisigSafe)
      await expect(page.locator('[data-test="safe-import-summary"]')).toHaveCount(0)
      await expect(page.locator('[data-test="confirm-safe-import-button"]')).toBeDisabled()
      await page.locator('[data-test="inspect-safe-button"]').click()
      await expect(page.locator('[data-test="safe-import-summary"]')).toContainText('2 of 2')
      await page.locator('[data-test="safe-import-reset-button"]').click()
      await expect(page.locator('input[data-test="safe-import-address-input"]')).toHaveValue('')
      await expect(page.locator('[data-test="safe-import-summary"]')).toHaveCount(0)
      await expect(page.locator('[data-test="confirm-safe-import-button"]')).toBeDisabled()
      expect(api.safeAttempts).toHaveLength(0)
    })

    test('keeps an inspected Safe available after registration failure and retries without chain writes', async ({
      page
    }) => {
      const api = await openImport(page)
      api.failSafeRegistration = true
      const before = await ownerNonce()
      await inspect(page, fixture.safe)
      await expect(page.locator('[data-test="safe-import-summary"]')).toBeVisible()
      await page.locator('[data-test="confirm-safe-import-button"]').click()
      await expect(page.locator('[data-test="safe-import-error"]')).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('[data-test="safe-import-summary"]')).toBeVisible()
      await expect(page.locator('[data-test="step-4"]')).toBeVisible()
      expect(api.companies[0]!.safeAddress).toBeUndefined()
      const failedAttempts = api.safeAttempts.length
      expect(failedAttempts).toBeGreaterThan(0)
      api.failSafeRegistration = false
      await page.locator('[data-test="confirm-safe-import-button"]').click()
      await expect(page).toHaveURL(/\/teams\/1$/)
      expect(api.safeAttempts).toHaveLength(failedAttempts + 1)
      expect(
        new Set(api.safeAttempts.map((attempt) => attempt.contractAddress.toLowerCase()))
      ).toEqual(new Set([fixture.safe.toLowerCase()]))
      expect(await ownerNonce()).toBe(before)
    })

    test('allows deferring Safe setup from the import tab without attaching a wallet', async ({
      page
    }) => {
      const api = await openImport(page)
      await inspect(page, fixture.safe)
      await expect(page.locator('[data-test="safe-import-summary"]')).toBeVisible()
      const before = await ownerNonce()
      await page.locator('[data-test="skip-safe-setup-button"]').click()
      await expect(page).toHaveURL(/\/teams\/1$/)
      expect(api.safeAttempts).toHaveLength(0)
      expect(api.companies[0]!.safeAddress).toBeUndefined()
      expect(await ownerNonce()).toBe(before)
    })

    test('reports an RPC failure during inspection and permits a fresh inspection', async ({
      page
    }) => {
      const api = await openImport(page)
      let unavailable = true
      const isSafeRead = (call: RpcCall) =>
        unavailable &&
        call.method === 'eth_call' &&
        (call.params?.[0] as { to?: string } | undefined)?.to?.toLowerCase() ===
          fixture.safe.toLowerCase()
      await page.route(E2E_RPC_ROUTE, (route) =>
        failRpcCalls(route, isSafeRead, 'E2E inspection unavailable')
      )
      await inspect(page, fixture.safe)
      await expect(page.locator('[data-test="safe-import-error"]')).toBeVisible({ timeout: 30_000 })
      await expect(page.locator('[data-test="confirm-safe-import-button"]')).toBeDisabled()
      expect(api.safeAttempts).toHaveLength(0)
      unavailable = false
      await page.locator('[data-test="inspect-safe-button"]').click()
      await expect(page.locator('[data-test="safe-import-summary"]')).toContainText('1 of 1')
      await expect(page.locator('[data-test="confirm-safe-import-button"]')).toBeEnabled()
    })

    // Creation always makes the caller owner. Exercise permission/lifecycle
    // boundaries from the same setup cards in an existing company's Safe page.
    for (const restriction of ['non-owner member', 'archived company'] as const) {
      test(`blocks Safe setup for a ${restriction}`, async ({ page }) => {
        await openSafeAccount(page, fixture, {
          safeAddress: null,
          user: restriction === 'non-owner member' ? 'member' : 'owner',
          archived: restriction === 'archived company'
        })
        const before = await ownerNonce()
        await expect(page.locator('[data-test="deploy-safe-button"]')).toBeDisabled()
        if (restriction === 'non-owner member') {
          await expect(
            page.locator('[data-test="safe-deployment-permission-notice"]')
          ).toBeVisible()
        }
        await inspect(page, fixture.safe)
        await expect(page.locator('[data-test="safe-import-summary"]')).toBeVisible()
        await expect(page.locator('[data-test="confirm-safe-import-button"]')).toBeDisabled()
        expect(await ownerNonce()).toBe(before)
      })
    }
  }
)

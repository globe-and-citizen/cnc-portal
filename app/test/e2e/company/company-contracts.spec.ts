/* eslint-disable max-lines -- Keep related Safe setup and chain-recovery scenarios in one discoverable spec. */
import type { Address, Hex } from 'viem'
import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures'
import {
  E2E_OWNER,
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_USDC_ADDRESS,
  E2E_USDCE_ADDRESS,
  hasCode,
  publicClient,
  snapshotChain,
  revertChain,
  walletClient
} from '../e2e-chain'
import { E2E_SAFE_INFRA } from '../../../src/e2e/chain'
import {
  E2E_RPC_ROUTE,
  failRpcCalls,
  openAccountFromSidebar,
  rejectNextWalletRequest,
  type RpcCall,
  useWallet
} from '../e2e-page'
import { openSafeAccount } from '../safe/safe-page'
import { stubSafeTransactionService } from '../safe/safe-transaction-service'
import {
  deploySafeE2EFixture,
  safeOwners,
  safeThreshold,
  safeNonce,
  type SafeE2EFixture
} from '../safe/safe-chain'
import {
  breakContract,
  deployCompanyInfrastructure,
  mineBlock,
  ownerNonce,
  setAutomine,
  type CompanyAddresses
} from './company-chain'
import {
  createCompanyUntilOfficer,
  createCompanyUntilSafe,
  enterShareDetails,
  gate,
  owner,
  useCompanyInfrastructure,
  type CompanyApi
} from './company-page'

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

test.describe('Company transaction and session recovery', () => {
  let addresses: CompanyAddresses
  let snapshot: string

  test.beforeAll(async () => {
    addresses = await deployCompanyInfrastructure()
  })
  test.beforeEach(async ({ page }) => {
    snapshot = await snapshotChain()
    await useCompanyInfrastructure(page, addresses)
  })
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'wait' })
    await setAutomine(true)
    await revertChain(snapshot)
  })

  type Kind = 'Officer' | 'Safe'

  const deployments: Record<
    Kind,
    {
      open: (page: Page) => Promise<CompanyApi>
      button: string
      factory: () => Address
      attempts: (api: CompanyApi) => unknown[]
      expectRegistered: (page: Page, api: CompanyApi) => Promise<void>
    }
  > = {
    Officer: {
      open: async (page) => {
        const api = await createCompanyUntilOfficer(page)
        await enterShareDetails(page)
        return api
      },
      button: 'deploy-contracts-button',
      factory: () => addresses['Officer#FactoryBeacon']!,
      attempts: (api) => api.officerAttempts,
      expectRegistered: async (page, api) => {
        await expect(page.locator('[data-test="step-4"]')).toBeVisible({ timeout: 30_000 })
        expect(api.companies[0]!.currentOfficer).not.toBeNull()
      }
    },
    Safe: {
      open: createCompanyUntilSafe,
      button: 'deploy-safe-button',
      factory: () => E2E_SAFE_INFRA.proxyFactory,
      attempts: (api) => api.safeAttempts,
      expectRegistered: async (page, api) => {
        await expect(page).toHaveURL(/\/teams\/1$/, { timeout: 30_000 })
        expect(api.companies[0]!.safeAddress).toBeTruthy()
      }
    }
  }

  const kinds = Object.keys(deployments) as Kind[]
  const pendingTransactions = async () =>
    (await publicClient.getBlock({ blockTag: 'pending' })).transactions

  test.describe('Deployment transaction outcomes', () => {
    test.setTimeout(90_000)
    const outcomes = [
      'delayed confirmation',
      'mined revert',
      'cancellation',
      'replacement'
    ] as const

    for (const kind of kinds) {
      for (const outcome of outcomes) {
        test(`${kind}: handles ${outcome} after broadcasting`, async ({ page }) => {
          const deployment = deployments[kind]
          const api = await deployment.open(page)
          const button = page.locator(`[data-test="${deployment.button}"]`)
          const attempts = deployment.attempts(api)
          const nonce = await ownerNonce()
          await setAutomine(false)
          await button.click()
          await expect.poll(async () => (await pendingTransactions()).length).toBe(1)
          await expect(button).toBeDisabled()
          expect(attempts).toHaveLength(0)
          expect(await ownerNonce()).toBe(nonce)
          const hash = (await pendingTransactions())[0] as Hex
          const pending = await publicClient.getTransaction({ hash })
          let minedHash = hash
          let restoreFactory = async () => {}
          if (outcome === 'mined revert') restoreFactory = await breakContract(deployment.factory())
          if (outcome === 'cancellation' || outcome === 'replacement') {
            const fee = (pending.maxFeePerGas ?? pending.gasPrice ?? 1_000_000_000n) * 3n
            const replacement =
              outcome === 'cancellation'
                ? { to: E2E_OWNER, data: '0x' as Hex, value: 0n }
                : { to: pending.to!, data: pending.input, value: pending.value }
            minedHash = await walletClient.sendTransaction({
              ...replacement,
              nonce: pending.nonce,
              gas: pending.gas,
              maxFeePerGas: fee,
              maxPriorityFeePerGas: fee
            })
          }
          await mineBlock()
          await setAutomine(true)
          const receipt = await publicClient.getTransactionReceipt({ hash: minedHash })
          expect(receipt.status).toBe(outcome === 'mined revert' ? 'reverted' : 'success')
          expect(await ownerNonce()).toBe(nonce + 1)

          const retried = outcome === 'mined revert' || outcome === 'cancellation'
          if (retried) {
            const error =
              kind === 'Officer'
                ? page.locator('[data-test="deploy-error-alert"]')
                : page.getByText('Error', { exact: true })
            await expect(error).toBeVisible({ timeout: 30_000 })
            expect(attempts).toHaveLength(0)
            await expect(button).toBeEnabled()
            await restoreFactory()
            await button.click()
          }
          await deployment.expectRegistered(page, api)
          expect(attempts).toHaveLength(1)
          expect(await ownerNonce()).toBe(nonce + (retried ? 2 : 1))
        })
      }
    }
  })

  test.describe('Local chain reorganization', () => {
    for (const kind of kinds) {
      test(`${kind}: registers only after the transaction is included again`, async ({ page }) => {
        const deployment = deployments[kind]
        const api = await deployment.open(page)
        const attempts = deployment.attempts(api)
        const nonce = await ownerNonce()
        const fork = await snapshotChain()
        let raw: Hex | undefined
        const receipts = gate()
        await page.route(E2E_RPC_ROUTE, async (route) => {
          const payload = route.request().postDataJSON()
          const calls = Array.isArray(payload) ? payload : [payload]
          for (const call of calls) {
            if (call.method === 'eth_sendRawTransaction') raw = call.params[0]
          }
          if (calls.some((call) => call.method === 'eth_getTransactionReceipt')) {
            await receipts.promise
          }
          await route.continue()
        })
        await page.locator(`[data-test="${deployment.button}"]`).click()
        try {
          await expect.poll(ownerNonce).toBe(nonce + 1)
          expect(raw).toBeTruthy()
          expect(attempts).toHaveLength(0)
          await revertChain(fork)
          expect(await ownerNonce()).toBe(nonce)
          const hash = await publicClient.sendRawTransaction({ serializedTransaction: raw! })
          expect((await publicClient.getTransactionReceipt({ hash })).status).toBe('success')
        } finally {
          receipts.release()
        }
        await deployment.expectRegistered(page, api)
        expect(attempts).toHaveLength(1)
        expect(await ownerNonce()).toBe(nonce + 1)
      })
    }
  })

  test.describe('Session recovery', () => {
    for (const kind of kinds) {
      test(`retains the created company after reloading at ${kind} setup`, async ({ page }) => {
        const api = await deployments[kind].open(page)
        const nonce = await ownerNonce()
        await page.reload()
        await expect(page.locator('[data-test="team-card-1"]')).toContainText('E2E Company', {
          timeout: 30_000
        })
        await page.locator('[data-test="team-card-1"] [data-test="team-link"]').click()
        await expect(page).toHaveURL(/\/teams\/1$/)
        expect(api.attempts).toHaveLength(1)
        expect(api.officerAttempts).toHaveLength(0)
        expect(api.safeAttempts).toHaveLength(0)
        expect(await ownerNonce()).toBe(nonce)
      })
    }

    test('recovers a mined but unregistered Safe by importing its address after reload', async ({
      page
    }) => {
      const api = await createCompanyUntilSafe(page)
      api.failSafeRegistration = true
      await page.locator('[data-test="deploy-safe-button"]').click()
      await expect(page.locator('[data-test="safe-registration-pending"]')).toBeVisible({
        timeout: 30_000
      })
      const safe = api.safeAttempts[0]!.contractAddress as Address
      const nonce = await ownerNonce()
      await stubSafeTransactionService(
        page,
        { safe, multisigSafe: safe, usdc: E2E_USDC_ADDRESS, usdcE: E2E_USDCE_ADDRESS },
        { user: owner, incomingTransfers: [] }
      )
      await page.reload()
      await page.locator('[data-test="team-card-1"] [data-test="team-link"]').click()
      await openAccountFromSidebar(page, '/teams/1/accounts/safe-account/0x')
      await expect(page.locator('[data-test="retry-safe-registration-button"]')).toHaveCount(0)
      api.failSafeRegistration = false
      await page.locator('input[data-test="safe-import-address-input"]').fill(safe)
      await page.locator('[data-test="inspect-safe-button"]').click()
      await expect(page.locator('[data-test="safe-import-summary"]')).toBeVisible()
      await page.locator('[data-test="confirm-safe-import-button"]').click()
      await expect.poll(() => api.companies[0]!.safeAddress).toBe(safe)
      expect(await ownerNonce()).toBe(nonce)
    })

    test('locks a restored owner session when another wallet account is connected', async ({
      page
    }) => {
      const api = await createCompanyUntilOfficer(page)
      const nonce = await ownerNonce()
      await useWallet(page, E2E_MEMBER_PRIVATE_KEY)
      await page.reload()
      await expect(page.getByRole('heading', { name: '🔒 Session Locked' })).toBeVisible()
      await expect(page.locator('[data-test="deploy-contracts-button"]')).toHaveCount(0)
      expect(api.officerAttempts).toHaveLength(0)
      expect(await ownerNonce()).toBe(nonce)
    })
  })
})

import type { Address, Hex } from 'viem'
import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures'
import {
  E2E_OWNER,
  E2E_USDC_ADDRESS,
  E2E_USDCE_ADDRESS,
  E2E_MEMBER_PRIVATE_KEY,
  publicClient,
  walletClient,
  snapshotChain,
  revertChain
} from '../e2e-chain'
import { E2E_RPC_ROUTE, openAccountFromSidebar, useWallet } from '../e2e-page'
import { stubSafeTransactionService } from '../safe/safe-transaction-service'
import { E2E_SAFE_INFRA } from '../../../src/e2e/chain'
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

// These cases manipulate only the dedicated local chain, including its mempool.
// API state survives page reload through the existing stateful route fixture.
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

/** What each deployment step of the wizard needs and records. */
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

test.describe('Company deployment transaction recovery', () => {
  test.setTimeout(90_000)
  const outcomes = ['delayed confirmation', 'mined revert', 'cancellation', 'replacement'] as const

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
          // Outbid the browser's transaction at the same nonce.
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

        // A revert or a cancellation reaches the UI as a failure the user retries.
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

test.describe('Company deployment across a local chain reorganization', () => {
  for (const kind of kinds) {
    test(`${kind}: registers only after the transaction is included again`, async ({ page }) => {
      const deployment = deployments[kind]
      const api = await deployment.open(page)
      const attempts = deployment.attempts(api)
      const nonce = await ownerNonce()
      const fork = await snapshotChain()
      let raw: Hex | undefined
      const receipts = gate()
      // Delay receipt visibility in the browser while a real mined block is
      // removed on Hardhat. Never fabricate a successful receipt.
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

test.describe('Company session recovery', () => {
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
    // The in-memory retry address is lost on reload. Manual import remains a
    // recovery route if the user retained the address from the transaction.
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
    // Connector captures its account at startup; this covers a changed account
    // across reload, not an extension's live accountsChanged event.
    await useWallet(page, E2E_MEMBER_PRIVATE_KEY)
    await page.reload()
    await expect(page.getByRole('heading', { name: '🔒 Session Locked' })).toBeVisible()
    await expect(page.locator('[data-test="deploy-contracts-button"]')).toHaveCount(0)
    expect(api.officerAttempts).toHaveLength(0)
    expect(await ownerNonce()).toBe(nonce)
  })
})

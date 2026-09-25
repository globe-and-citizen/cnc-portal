import { expect, test } from '../fixtures'
import { parseEther, parseUnits } from 'viem'
import {
  E2E_MEMBER,
  E2E_NEW_SIGNER,
  nativeBalance,
  revertChain,
  sendNative,
  sendToken,
  snapshotChain,
  tokenBalance
} from '../e2e-chain'
import { dialogAmount, selectToken } from '../e2e-page'
import {
  deploySafeE2EFixture,
  memberSafeSignature,
  safeOwners,
  safeThreshold,
  safeTransactionHash,
  type SafeE2EFixture
} from './safe-chain'
import { openSafeAccount } from './safe-page'
import { transaction } from './safe-transaction'

let fixture: SafeE2EFixture
let snapshotId: string

test.beforeAll(async () => {
  fixture = await deploySafeE2EFixture()
})

test.beforeEach(async () => {
  snapshotId = await snapshotChain()
})

test.afterEach(async () => {
  await revertChain(snapshotId)
})

test.describe('Safe Account', { tag: ['@browser', '@mocked'] }, () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(180_000)

  /**
   * Covers:
   * - [AC-US-SAFE-002-01]
   * - [AC-US-SAFE-002-02]
   * - [AC-US-SAFE-002-04]
   * - [AC-US-SAFE-003-04]
   * - [AC-US-SAFE-003-05]
   */
  test(
    'lets a company member inspect a real Safe and its incoming transfers without signer permission',
    { tag: ['@US-SAFE-002', '@US-SAFE-003'] },
    async ({ page }) => {
      await sendNative(fixture.safe, '1')
      await sendToken(fixture.usdc, fixture.safe, '2')
      await openSafeAccount(page, fixture, { user: 'member' })

      await expect(page.getByRole('heading', { name: 'Team Safe' })).toBeVisible()
      await expect(page.locator('[data-test="safe-threshold-summary"]')).toHaveText(
        '1 of 1 signers'
      )
      await expect(page.locator('[data-test="safe-user-role"]')).toHaveText('Viewer / depositor')
      await expect(page.locator('[data-test="transfer-button"]')).toBeDisabled()
      await expect(page.locator('[data-test="add-signer-button"]')).toBeDisabled()
      await expect(page.locator('[data-test="update-threshold-button"]')).toBeDisabled()
      await expect(page.locator('[data-test="incoming-transfers-table"]')).toBeVisible()
      await expect(page.locator('[data-test="transfer-type-badge"]')).toHaveCount(2)
      await expect(page.locator('[data-test="safe-deposit-token-symbol"]')).toHaveText('USDC')
    }
  )

  /**
   * Covers:
   * - [AC-US-SAFE-001-01]
   * - [AC-US-SAFE-001-03]
   * - [AC-US-SAFE-001-05]
   */
  test(
    'lets the company owner deploy and register a new Safe from the setup journey',
    { tag: '@US-SAFE-001' },
    async ({ page }) => {
      await openSafeAccount(page, fixture, { safeAddress: null })

      await expect(page.getByRole('heading', { name: 'Set up your team Safe' })).toBeVisible()
      await page.locator('[data-test="deploy-safe-button"]').click()

      await expect(
        page.getByText('Safe wallet deployed successfully', { exact: true })
      ).toBeVisible({
        timeout: 60_000
      })
      await expect(page.locator('[data-test="safe-wallet-view"]')).toBeVisible()
      await expect(page.locator('[data-test="safe-threshold-summary"]')).toHaveText(
        '1 of 1 signers'
      )
    }
  )

  /**
   * Covers:
   * - [AC-US-SAFE-001-02]
   * - [AC-US-SAFE-001-03]
   */
  test(
    'lets the company owner inspect and import an existing Safe without changing it',
    { tag: '@US-SAFE-001' },
    async ({ page }) => {
      await openSafeAccount(page, fixture, { safeAddress: null })

      await page.locator('[data-test="safe-import-address-input"]').fill(fixture.safe)
      await page.locator('[data-test="inspect-safe-button"]').click()
      await expect(page.locator('[data-test="safe-import-summary"]')).toContainText('1 of 1')
      await page.locator('[data-test="confirm-safe-import-button"]').click()

      await expect(page.getByText('Safe imported successfully', { exact: true })).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/safe-account/${fixture.safe}$`, 'i'))
      await expect(page.locator('[data-test="safe-wallet-view"]')).toBeVisible()
    }
  )

  /**
   * Covers:
   * - [AC-US-SAFE-003-01]
   * - [AC-US-SAFE-003-03]
   */
  test(
    'lets the Safe owner deposit native and ERC-20 assets and refreshes its holdings',
    { tag: '@US-SAFE-003' },
    async ({ page }) => {
      await openSafeAccount(page, fixture)

      await expect(page.locator('[data-test="transfer-button"]')).toBeEnabled()
      await page.locator('[data-test="deposit-button"]').click()
      let deposit = page.getByRole('dialog', { name: 'Deposit funds' })
      await dialogAmount(deposit).fill('0.5')
      await deposit.locator('[data-test="deposit-button"]').click()
      await expect(page.getByText('GO deposited successfully', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect.poll(() => nativeBalance(fixture.safe)).toBe(parseEther('0.5'))

      await page.locator('[data-test="deposit-button"]').click()
      deposit = page.getByRole('dialog', { name: 'Deposit funds' })
      await selectToken(page, deposit, 'USDC')
      await dialogAmount(deposit).fill('1')
      await deposit.locator('[data-test="deposit-button"]').click()
      await expect(page.getByText('USDC deposited successfully', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect.poll(() => tokenBalance(fixture.usdc, fixture.safe)).toBe(parseUnits('1', 6))
      await expect(page.locator('[data-test="safe-wallet-overview-card"]')).toContainText('$1.50', {
        timeout: 30_000
      })
    }
  )

  test(
    '[AC-US-SAFE-003-09] blocks Safe deposits and transfer proposals when the team is archived',
    { tag: '@US-SAFE-003' },
    async ({ page }) => {
      await openSafeAccount(page, fixture, { archived: true })

      await expect(page.locator('[data-test="deposit-button"]')).toBeDisabled()
      await expect(page.locator('[data-test="transfer-button"]')).toBeDisabled()
    }
  )

  /**
   * Covers:
   * - [AC-US-SAFE-003-02]
   * - [AC-US-SAFE-003-03]
   * - [AC-US-SAFE-003-06]
   */
  test(
    'lets a sole Safe owner execute an outgoing transfer and refresh the balance',
    { tag: '@US-SAFE-003' },
    async ({ page }) => {
      await sendNative(fixture.safe, '0.5')
      const memberBefore = await nativeBalance(E2E_MEMBER)
      await openSafeAccount(page, fixture)

      await page.locator('[data-test="transfer-button"]').click()
      const transfer = page.getByRole('dialog', { name: 'Create a Safe transfer' })
      await transfer.getByPlaceholder('Name').fill('E2E Member')
      await transfer.locator('[data-test="user-row"]').filter({ hasText: 'E2E Member' }).click()
      await selectToken(page, transfer, 'GO')
      await dialogAmount(transfer).fill('0.25')
      await transfer.locator('[data-test="transferButton"]').click()

      await expect(page.getByText('Transfer proposed', { exact: true })).toBeVisible({
        timeout: 60_000
      })
      await expect.poll(() => nativeBalance(fixture.safe)).toBe(parseEther('0.25'))
      await expect.poll(() => nativeBalance(E2E_MEMBER)).toBe(memberBefore + parseEther('0.25'))
    }
  )

  /**
   * Covers:
   * - [AC-US-SAFE-004-01]
   * - [AC-US-SAFE-004-02]
   * - [AC-US-SAFE-004-03]
   * - [AC-US-SAFE-004-04]
   */
  test(
    'lets a Safe owner add and remove a signer, then change the threshold on-chain',
    { tag: '@US-SAFE-004' },
    async ({ page }) => {
      await openSafeAccount(page, fixture)

      const addSigner = async () => {
        await page.locator('[data-test="add-signer-button"]').click()
        const dialog = page.getByRole('dialog', { name: 'Add Safe Signers' })
        await dialog.getByPlaceholder('Search by name or address').fill('E2E Member')
        await dialog.locator('[data-test="user-row"]').filter({ hasText: 'E2E Member' }).click()
        await dialog.locator('[data-test="add-signers-button"]').click()
        await expect(page.getByText('Signers added successfully', { exact: true })).toBeVisible({
          timeout: 60_000
        })
      }

      await addSigner()
      await expect
        .poll(() => safeOwners(fixture.safe))
        .toEqual(expect.arrayContaining([E2E_MEMBER]))

      const memberOwner = page.locator('[data-test="owner-item"]').filter({ hasText: 'E2E Member' })
      await memberOwner.locator('[data-test="remove-owner-button"]').click()
      await expect(page.getByText('Owner removed successfully', { exact: true })).toBeVisible({
        timeout: 60_000
      })
      await expect.poll(() => safeOwners(fixture.safe)).not.toContain(E2E_MEMBER)

      await addSigner()
      await page.locator('[data-test="update-threshold-button"]').click()
      const threshold = page.getByRole('dialog', { name: 'Update Threshold' })
      await threshold.locator('[data-test="threshold-input"]').fill('2')
      await threshold.locator('[data-test="update-threshold-button"]').click()
      await expect(page.getByText('Threshold updated successfully', { exact: true })).toBeVisible({
        timeout: 60_000
      })
      await expect.poll(() => safeThreshold(fixture.safe)).toBe(2)
    }
  )

  /**
   * Covers:
   * - [AC-US-SAFE-005-01]
   * - [AC-US-SAFE-005-02]
   * - [AC-US-SAFE-005-03]
   * - [AC-US-SAFE-005-04]
   */
  test(
    'lets a company member review, filter, and inspect every Safe transaction state',
    { tag: '@US-SAFE-005' },
    async ({ page }) => {
      const pending = transaction(fixture.safe, {
        safeTxHash: `0x${'b'.repeat(64)}`,
        dataDecoded: {
          method: 'transfer',
          parameters: [
            { name: 'to', type: 'address', value: E2E_NEW_SIGNER },
            { name: 'value', type: 'uint256', value: parseEther('0.1').toString() }
          ]
        }
      })
      const completed = transaction(fixture.safe, {
        safeTxHash: `0x${'c'.repeat(64)}`,
        isExecuted: true,
        isSuccessful: true,
        executionDate: '2026-01-01T00:01:00Z'
      })
      const invalid = transaction(fixture.safe, {
        safeTxHash: `0x${'d'.repeat(64)}`,
        nonce: -1
      })
      await openSafeAccount(page, fixture, {
        user: 'member',
        transactions: [pending, completed, invalid]
      })

      const transactions = page.locator('[data-test="safe-transactions-card"]')
      const transactionTable = transactions.locator('[data-test="safe-transactions-table"]')
      const transactionStates = transactionTable.locator('[data-test="safe-transaction-state"]')
      await expect(transactionStates.filter({ hasText: 'Pending approvals' })).toBeVisible()
      await expect(transactions.locator('[data-test="approve-button"]')).toHaveCount(0)
      await transactionTable.locator('[data-test="view-details-button"]').click()
      await expect(page.getByRole('dialog', { name: 'Transaction Details' })).toContainText(
        'Pending approvals'
      )
      await page.locator('[data-test="close-transaction-details-button"]').click()

      await transactions.locator('[data-test="safe-transaction-filter-all"]').click()
      await expect(transactionStates.filter({ hasText: 'Executed' }).first()).toBeVisible()
      await expect(transactionStates.filter({ hasText: 'Invalid' }).first()).toBeVisible()
      await transactions.locator('[data-test="safe-transaction-filter-executed"]').click()
      await expect(transactionStates.filter({ hasText: 'Executed' }).first()).toBeVisible()
      await expect(transactionStates.filter({ hasText: 'Invalid' })).toHaveCount(0)
    }
  )

  /**
   * Covers:
   * - [AC-US-SAFE-006-01]
   * - [AC-US-SAFE-006-02]
   * - [AC-US-SAFE-006-03]
   * - [AC-US-SAFE-006-06]
   */
  test(
    'collects a second signer approval and executes the real Safe transaction',
    { tag: '@US-SAFE-006' },
    async ({ page }) => {
      await sendNative(fixture.multisigSafe, '0.5')
      const safeTxHash = await safeTransactionHash(fixture.multisigSafe, {
        to: E2E_NEW_SIGNER,
        value: parseEther('0.25')
      })
      const pending = transaction(fixture.multisigSafe, {
        to: E2E_NEW_SIGNER,
        value: parseEther('0.25').toString(),
        safeTxHash,
        confirmationsRequired: 2,
        confirmations: [
          {
            owner: E2E_MEMBER,
            submissionDate: '2026-01-01T00:00:00Z',
            transactionHash: null,
            signature: await memberSafeSignature(safeTxHash),
            signatureType: 'ETH_SIGN'
          }
        ]
      })
      await openSafeAccount(page, fixture, {
        safeAddress: fixture.multisigSafe,
        transactions: [pending]
      })

      const transactionTable = page.locator('[data-test="safe-transactions-table"]')
      await transactionTable.locator('[data-test="approve-button"]').click()
      await expect(
        page.getByText('Transaction approved successfully', { exact: true })
      ).toBeVisible({
        timeout: 60_000
      })
      await expect(transactionTable.locator('[data-test="execute-button"]')).toBeVisible({
        timeout: 30_000
      })
      await transactionTable.locator('[data-test="execute-button"]').click()

      await expect(
        page.getByText('Transaction executed successfully', { exact: true })
      ).toBeVisible({
        timeout: 60_000
      })
      await expect.poll(() => nativeBalance(fixture.multisigSafe)).toBe(parseEther('0.25'))
      await page.locator('[data-test="safe-transaction-filter-all"]').click()
      await expect(
        transactionTable
          .locator('[data-test="safe-transaction-state"]')
          .filter({ hasText: 'Executed' })
      ).toBeVisible({ timeout: 30_000 })
    }
  )
})

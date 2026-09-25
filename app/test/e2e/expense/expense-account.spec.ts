import { expect, test } from '../fixtures'
import { parseUnits } from 'viem'
import {
  E2E_MEMBER,
  nativeBalance,
  revertChain,
  sendNative,
  sendToken,
  snapshotChain,
  tokenBalance
} from '../e2e-chain'
import { dialogAmount, E2E_RPC_ROUTE, failLogReads } from '../e2e-page'
import { deployBankE2EFixture, type BankE2EFixture } from '../bank/bank-chain'
import { selectRecipient } from '../bank/bank-page'
import { signExpenseApproval } from './expense-chain'
import {
  addExpenseApproval,
  chooseApprovalDate,
  createExpenseApi,
  openExpenseAccount
} from './expense-page'

let fixture: BankE2EFixture
let snapshotId: string

test.beforeAll(async () => {
  fixture = await deployBankE2EFixture()
})

test.beforeEach(async () => {
  snapshotId = await snapshotChain()
})

test.afterEach(async () => {
  await revertChain(snapshotId)
})

test.describe('Expense Account', { tag: ['@browser', '@mocked'] }, () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(180_000)

  /**
   * Covers:
   * - [AC-US-EXP-001-01]
   * - [AC-US-EXP-001-02]
   * - [AC-US-EXP-001-03]
   * - [AC-US-EXP-004-01]
   * - [AC-US-EXP-004-03]
   */
  test(
    'lets the owner sign a USDC approval and exposes the funded account, approval, and history',
    { tag: ['@US-EXP-001', '@US-EXP-004'] },
    async ({ page }) => {
      const api = createExpenseApi()
      await sendNative(fixture.expenseAccount, '2')
      await sendToken(fixture.usdc, fixture.expenseAccount, '12')
      await openExpenseAccount(page, fixture, api)

      await expect(page.locator('[data-test="expense-account-address"]')).toContainText(
        fixture.expenseAccount
      )
      await expect(page.locator('[data-test="contract-owner-name"]')).toHaveText('E2E Owner')
      await expect(page.getByText('Token Holding', { exact: true })).toBeVisible()
      await expect(page.locator('[data-test="expense-account-balance"]')).toContainText('$14.00')
      await expect(page.locator('[data-test="approvals-empty"]')).toBeVisible()

      await page.locator('[data-test="approve-users-button"]').click()
      const approvalDialog = page.getByRole('dialog', { name: 'Grant Spending Approval' })
      await approvalDialog.locator('[data-test="member-name-input"]').fill('E2E Recipient')
      await approvalDialog.locator('[data-test="user-row"]').click()
      await approvalDialog.locator('[data-test="token-selector"]').click()
      await page.getByRole('option', { name: 'USDC', exact: true }).click()
      await approvalDialog.locator('[data-test="amount-input"]').fill('5')

      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      await chooseApprovalDate(page, '[data-test="start-date-picker"]', today)
      await chooseApprovalDate(page, '[data-test="end-date-picker"]', tomorrow)
      await approvalDialog.locator('[data-test="approve-button"]').click()

      const reviewDialog = page.getByRole('dialog', { name: 'Review & Sign' })
      await expect(reviewDialog).toContainText('5 USDC')
      await reviewDialog.locator('[data-test="approve-button"]').click()
      await expect(page.getByText('User approved successfully', { exact: true })).toBeVisible({
        timeout: 30_000
      })

      await expect.poll(() => api.expenses.length).toBe(1)
      expect(api.expenses[0]).toMatchObject({
        userAddress: E2E_MEMBER,
        data: {
          amount: 5,
          tokenAddress: fixture.usdc,
          signedAgainstContractAddress: fixture.expenseAccount
        }
      })
      await expect(page.getByText('E2E Recipient', { exact: true }).last()).toBeVisible()
      await expect(
        page
          .locator('[data-test="claims-table"]')
          .getByRole('table')
          .getByText('enabled', { exact: true })
      ).toBeVisible()

      const history = page.locator('[data-test="expense-transactions"]')
      await expect(history.getByText('Deposit', { exact: true })).toBeVisible({ timeout: 30_000 })
      await history.locator('[data-test="expense-transaction-history-type-filter"]').click()
      await page.getByRole('option', { name: 'Deposit', exact: true }).click()
      await expect(history.locator('tbody').getByText('Deposit', { exact: true })).toHaveCount(1)
    }
  )

  /**
   * Covers:
   * - [AC-US-EXP-002-01]
   * - [AC-US-EXP-002-02]
   * - [AC-US-EXP-002-06]
   * - [AC-US-EXP-002-10]
   * - [AC-US-EXP-004-02]
   * - [AC-US-EXP-004-06]
   */
  test(
    'lets an approved recipient spend a signed ERC-20 budget exactly once and reflects its exhaustion',
    { tag: '@US-EXP-002' },
    async ({ page }) => {
      const api = createExpenseApi()
      const approval = await signExpenseApproval(fixture, { amount: 5 })
      addExpenseApproval(api, approval)
      await sendToken(fixture.usdc, fixture.expenseAccount, '10')
      const recipientBefore = await tokenBalance(fixture.usdc, E2E_MEMBER)
      await openExpenseAccount(page, fixture, api, { user: 'member' })

      await expect(page.locator('[data-test="approve-users-button"]')).toBeDisabled()
      await expect(page.getByText('E2E Recipient', { exact: true }).last()).toBeVisible()
      await page.locator('[data-test="transfer-button"]').click()
      const transfer = page.getByRole('dialog', { name: 'Transfer from Expenses Contract' })
      await expect(transfer).toContainText('Spendable balance: 5 USDC')
      await selectRecipient(transfer)
      await dialogAmount(transfer).fill('3')
      await transfer.locator('[data-test="transferButton"]').click()
      await expect(page.getByText('Transfer Successful', { exact: true })).toBeVisible({
        timeout: 30_000
      })

      await expect
        .poll(() => tokenBalance(fixture.usdc, fixture.expenseAccount))
        .toBe(parseUnits('7', 6))
      await expect
        .poll(() => tokenBalance(fixture.usdc, E2E_MEMBER))
        .toBe(recipientBefore + parseUnits('3', 6))

      await expect(page.locator('[data-test="transfer-button"]')).toBeDisabled({ timeout: 30_000 })
    }
  )

  /**
   * Covers:
   * - [AC-US-EXP-003-01]
   * - [AC-US-EXP-003-02]
   * - [AC-US-EXP-003-03]
   */
  test(
    'deactivates and reactivates a recurring approval as the contract owner',
    { tag: '@US-EXP-003' },
    async ({ page }) => {
      const api = createExpenseApi()
      addExpenseApproval(api, await signExpenseApproval(fixture, { frequencyType: 2, amount: 5 }))
      await openExpenseAccount(page, fixture, api)

      await page.locator('[data-test="disable-button"]').click()
      await expect(page.getByText('Approval deactivated', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect(
        page
          .locator('[data-test="claims-table"]')
          .getByRole('table')
          .getByText('disabled', { exact: true })
      ).toBeVisible({ timeout: 30_000 })
      await page.locator('[data-test="enable-button"]').click()
      await expect(page.getByText('Approval activated', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect(
        page
          .locator('[data-test="claims-table"]')
          .getByRole('table')
          .getByText('enabled', { exact: true })
      ).toBeVisible({ timeout: 30_000 })
    }
  )

  /**
   * Covers:
   * - [AC-US-EXP-004-01]
   * - [AC-US-EXP-004-08]
   */
  test(
    'keeps the read-only account available to a member when history reads fail',
    { tag: '@US-EXP-004' },
    async ({ page }) => {
      const api = createExpenseApi()
      await sendNative(fixture.expenseAccount, '1')
      await page.route(E2E_RPC_ROUTE, failLogReads)
      await openExpenseAccount(page, fixture, api, { user: 'member' })

      await expect(page.locator('[data-test="expense-account-address"]')).toContainText(
        fixture.expenseAccount
      )
      await expect(page.locator('[data-test="contract-owner-name"]')).toHaveText('E2E Owner')
      await expect(page.locator('[data-test="approve-users-button"]')).toBeDisabled()
      const history = page.locator('[data-test="expense-transactions"]')
      await expect(history).toBeVisible()
    }
  )

  /**
   * Covers:
   * - [AC-US-EXP-001-08]
   * - [AC-US-EXP-002-08]
   */
  test(
    'prevents an archived company from granting or spending an approval',
    { tag: ['@US-EXP-001', '@US-EXP-002', '@US-EXP-003'] },
    async ({ page }) => {
      const api = createExpenseApi()
      addExpenseApproval(api, await signExpenseApproval(fixture))
      await openExpenseAccount(page, fixture, api, { archived: true, user: 'member' })

      await expect(page.locator('[data-test="approve-users-button"]')).toBeDisabled()
      await expect(page.locator('[data-test="transfer-button"]')).toBeDisabled()
      await expect.poll(() => nativeBalance(fixture.expenseAccount)).toBe(0n)
    }
  )
})

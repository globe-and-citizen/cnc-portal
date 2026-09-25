import { expect, test } from '../fixtures'
import { parseEther, parseUnits } from 'viem'
import {
  E2E_MEMBER,
  nativeBalance,
  revertChain,
  sendNative,
  sendToken,
  snapshotChain,
  tokenBalance
} from '../e2e-chain'
import {
  dialogAmount,
  E2E_RPC_ROUTE,
  failLogReads,
  openAccountFromSidebar,
  rejectNextWalletRequest,
  selectToken
} from '../e2e-page'
import {
  boardActionCount,
  deployBankE2EFixture,
  grossForNet,
  pauseBank,
  setBankFee,
  transferBankOwnership,
  unpauseBank,
  type BankE2EFixture
} from './bank-chain'
import {
  exerciseCashOutRecovery,
  exerciseMemberBankAccess,
  openBankAccount,
  selectRecipient,
  signInAndOpenTeam
} from './bank-page'

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

test.describe('Bank Account', { tag: ['@browser', '@mocked'] }, () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(180_000)

  /**
   * Covers:
   * - [AC-US-BANK-001-04]
   * - [AC-US-BANK-001-05]
   * - [AC-US-BANK-001-09]
   * - [AC-US-BANK-001-10]
   * - [AC-US-BANK-003-01]
   * - [AC-US-BANK-003-03]
   * - [AC-US-BANK-003-06]
   * - [AC-US-BANK-003-07]
   */
  test(
    'funds native and ERC-20 balances, enforces deposit rules, and exposes complete history controls',
    { tag: ['@US-BANK-001', '@US-BANK-003'] },
    async ({ page }) => {
      // A raw ERC-20 transfer without a Bank event must still appear once in history.
      await sendToken(fixture.usdc, fixture.bank, '3')
      await openBankAccount(page, fixture)

      await expect(page.getByRole('heading', { name: 'Balance' })).toBeVisible()
      await expect(page.getByText('Token Holding', { exact: true })).toBeVisible()
      await expect(page.locator('[data-test="contract-owner-name"]')).toHaveText('E2E Owner')
      await expect(page.locator('[data-test="bank-contract-address"]')).toContainText(fixture.bank)
      await expect(page.locator('[data-test="bank-total-usd"]')).toHaveText('$3.00')
      await expect(page.locator('[data-test="bank-total-local"]')).toContainText('$3.00 USD')
      await expect(
        page.locator('[data-test="bank-transactions"]').getByText('Token received', { exact: true })
      ).toHaveCount(1)

      await page.getByRole('button', { name: 'Deposit', exact: true }).click()
      let deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
      await dialogAmount(deposit).fill('100000')
      await expect(deposit.locator('[data-test="deposit-button"]')).toBeDisabled()
      await deposit.locator('[data-test="cancel-button"]').click()
      await expect.poll(() => nativeBalance(fixture.bank)).toBe(0n)

      // Rejecting the wallet request keeps the modal open and changes no funds.
      await page.getByRole('button', { name: 'Deposit', exact: true }).click()
      deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
      await dialogAmount(deposit).fill('0.25')
      await rejectNextWalletRequest(page)
      await deposit.locator('[data-test="deposit-button"]').click()
      await expect(deposit.locator('[data-test="error-alert"]')).toBeVisible()
      await expect.poll(() => nativeBalance(fixture.bank)).toBe(0n)

      await pauseBank(fixture.bank)
      await dialogAmount(deposit).fill('0.25')
      await deposit.locator('[data-test="deposit-button"]').click()
      await expect(deposit.locator('[data-test="error-alert"]')).toBeVisible()
      await expect.poll(() => nativeBalance(fixture.bank)).toBe(0n)
      await unpauseBank(fixture.bank)

      await dialogAmount(deposit).fill('2')
      await deposit.locator('[data-test="deposit-button"]').click()
      await expect(page.getByText('GO deposited successfully', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect.poll(() => nativeBalance(fixture.bank)).toBe(parseEther('2'))
      await expect(page.locator('[data-test="bank-total-usd"]')).toHaveText('$5.00', {
        timeout: 30_000
      })

      await page.getByRole('button', { name: 'Deposit', exact: true }).click()
      deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
      await selectToken(page, deposit, 'USDC')
      await dialogAmount(deposit).fill('0.0000001')
      await deposit.locator('[data-test="deposit-button"]').click()
      await expect(
        deposit.getByText('Enter a valid token amount with up to 6 decimal places.')
      ).toBeVisible()

      await dialogAmount(deposit).fill('10')
      await deposit.locator('[data-test="deposit-button"]').click()
      await expect(page.getByText('USDC deposited successfully', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect.poll(() => tokenBalance(fixture.usdc, fixture.bank)).toBe(parseUnits('13', 6))
      await expect(page.locator('[data-test="bank-total-usd"]')).toHaveText('$15.00', {
        timeout: 30_000
      })

      const history = page.locator('[data-test="bank-transactions"]')
      await expect(history.getByText('Deposit', { exact: true })).toBeVisible({ timeout: 30_000 })
      await expect(history.getByText('Token deposit', { exact: true })).toBeVisible()
      await expect(history.getByText('Counterparty', { exact: true })).toBeVisible()
      await expect(history.getByText('Tx Hash', { exact: true })).toBeVisible()
      await history.locator('[data-test="bank-transaction-detail-button"]').first().click()
      await expect(page.getByText('Transaction detail', { exact: true })).toBeVisible()
      await expect(page.getByText('Tx hash', { exact: true })).toBeVisible()
      await page
        .getByRole('dialog', { name: 'Transaction detail' })
        .getByRole('button', { name: 'Close', exact: true })
        .last()
        .click()

      await history.locator('[data-test="bank-transaction-history-type-filter"]').click()
      await page.getByRole('option', { name: 'Token received', exact: true }).click()
      await expect(
        history.locator('tbody').getByText('Token received', { exact: true })
      ).toHaveCount(1)
      await expect(
        history.locator('tbody').getByText('Token deposit', { exact: true })
      ).toHaveCount(0)

      await history.locator('[data-test="bank-transaction-history-date-select"] button').click()
      await page.locator('[data-test="date-picker-month-previous"]').click()
      await expect(history.getByText('No data', { exact: true })).toBeVisible()
    }
  )

  /**
   * Covers:
   * - [AC-US-BANK-002-01]
   * - [AC-US-BANK-002-03]
   * - [AC-US-BANK-002-09]
   * - [AC-US-BANK-002-10]
   * - [AC-US-BANK-002-12]
   * - [AC-US-BANK-002-13]
   */
  test(
    'transfers native and ERC-20 funds with exact fees and preserves balances on failure or rejection',
    { tag: '@US-BANK-002' },
    async ({ page }) => {
      await sendNative(fixture.bank, '5')
      await sendToken(fixture.usdc, fixture.bank, '20')
      await setBankFee(fixture.feeCollector, 100)
      await openBankAccount(page, fixture)

      const recipientNativeBefore = await nativeBalance(E2E_MEMBER)
      const collectorNativeBefore = await nativeBalance(fixture.feeCollector)
      await page.getByRole('button', { name: 'Transfer', exact: true }).click()
      let transfer = page.getByRole('dialog', { name: 'Transfer from Bank Contract' })
      await selectRecipient(transfer)
      await selectToken(page, transfer, 'GO')
      await dialogAmount(transfer).fill('1')
      await expect(transfer.getByText('Recipient receives')).toBeVisible()
      await transfer.locator('[data-test="transferButton"]').click()
      await expect(page.getByText('Transferred successfully', { exact: true })).toBeVisible({
        timeout: 30_000
      })

      const nativeGross = grossForNet(parseEther('1'), 100n)
      await expect
        .poll(() => nativeBalance(E2E_MEMBER))
        .toBe(recipientNativeBefore + parseEther('1'))
      await expect.poll(() => nativeBalance(fixture.bank)).toBe(parseEther('5') - nativeGross)
      await expect
        .poll(() => nativeBalance(fixture.feeCollector))
        .toBe(collectorNativeBefore + nativeGross - parseEther('1'))

      const recipientTokenBefore = await tokenBalance(fixture.usdc, E2E_MEMBER)
      const collectorTokenBefore = await tokenBalance(fixture.usdc, fixture.feeCollector)
      await page.getByRole('button', { name: 'Transfer', exact: true }).click()
      transfer = page.getByRole('dialog', { name: 'Transfer from Bank Contract' })
      await selectRecipient(transfer)
      await selectToken(page, transfer, 'USDC')
      await dialogAmount(transfer).fill('4')
      await transfer.locator('[data-test="transferButton"]').click()
      await expect(page.getByText('Transferred successfully', { exact: true })).toBeVisible({
        timeout: 30_000
      })

      const tokenGross = grossForNet(parseUnits('4', 6), 100n)
      await expect
        .poll(() => tokenBalance(fixture.usdc, E2E_MEMBER))
        .toBe(recipientTokenBefore + parseUnits('4', 6))
      await expect
        .poll(() => tokenBalance(fixture.usdc, fixture.feeCollector))
        .toBe(collectorTokenBefore + tokenGross - parseUnits('4', 6))

      await pauseBank(fixture.bank)
      const beforeFailure = await tokenBalance(fixture.usdc, fixture.bank)
      await page.getByRole('button', { name: 'Transfer', exact: true }).click()
      transfer = page.getByRole('dialog', { name: 'Transfer from Bank Contract' })
      await selectRecipient(transfer)
      await selectToken(page, transfer, 'USDC')
      await dialogAmount(transfer).fill('1')
      await transfer.locator('[data-test="transferButton"]').click()
      await expect(transfer.locator('[data-test="error-alert"]')).toBeVisible({ timeout: 30_000 })
      await expect.poll(() => tokenBalance(fixture.usdc, fixture.bank)).toBe(beforeFailure)
      await unpauseBank(fixture.bank)

      await rejectNextWalletRequest(page)
      await transfer.locator('[data-test="transferButton"]').click()
      await expect(transfer.locator('[data-test="transferButton"]')).toBeEnabled({
        timeout: 30_000
      })
      await expect.poll(() => tokenBalance(fixture.usdc, fixture.bank)).toBe(beforeFailure)
    }
  )

  /**
   * Covers:
   * - [AC-US-BANK-002-02]
   * - [AC-US-BANK-002-05]
   */
  test(
    'submits a Bank transfer as a Board action without moving funds immediately',
    { tag: '@US-BANK-002' },
    async ({ page }) => {
      await sendToken(fixture.usdc, fixture.bank, '8')
      await transferBankOwnership(fixture.bank, fixture.board)
      await openBankAccount(page, fixture)

      await expect(page.locator('[data-test="transfer-button"]')).toBeEnabled({ timeout: 30_000 })
      await page.locator('[data-test="transfer-button"]').click()
      const transfer = page.getByRole('dialog', { name: 'Transfer from Bank Contract' })
      await expect(transfer.locator('[data-test="bod-action-alert"]')).toBeVisible()
      await selectRecipient(transfer)
      await selectToken(page, transfer, 'USDC')
      await dialogAmount(transfer).fill('2')
      await transfer.locator('[data-test="transferButton"]').click()

      await expect(
        page.getByText('Action added successfully, waiting for confirmation', { exact: true })
      ).toBeVisible({ timeout: 30_000 })
      await expect.poll(() => boardActionCount(fixture.board)).toBe(1n)
      await expect.poll(() => tokenBalance(fixture.usdc, fixture.bank)).toBe(parseUnits('8', 6))
      await expect.poll(() => tokenBalance(fixture.usdc, E2E_MEMBER)).toBe(0n)
    }
  )

  /**
   * Covers:
   * - [AC-US-BANK-003-01]
   * - [AC-US-BANK-003-03]
   * - [AC-US-BANK-003-04]
   * - [AC-US-BANK-003-07]
   */
  test(
    'lets a non-owner member fund and inspect the Bank but not transfer or cash out',
    { tag: ['@US-BANK-001', '@US-BANK-003'] },
    async ({ page }) => {
      await exerciseMemberBankAccess(page, fixture)
    }
  )

  /**
   * Covers:
   * - [AC-US-BANK-004-01]
   * - [AC-US-BANK-004-06]
   * - [AC-US-BANK-004-07]
   */
  test(
    'keeps the Bank history usable when RPC log reads fail',
    { tag: '@US-BANK-003' },
    async ({ page }) => {
      await page.route(E2E_RPC_ROUTE, failLogReads)
      await openBankAccount(page, fixture)

      const history = page.locator('[data-test="bank-transactions"]')
      await expect(history.getByText('No data', { exact: true })).toBeVisible({
        timeout: 45_000
      })
    }
  )

  test(
    'stops a rejected cash-out, resumes it, and drains source accounts through the Bank',
    { tag: '@US-BANK-004' },
    async ({ page }) => {
      await exerciseCashOutRecovery(page, fixture)
    }
  )

  test(
    '[AC-US-BANK-004-08] disables an unfunded cash-out run',
    { tag: '@US-BANK-004' },
    async ({ page }) => {
      await signInAndOpenTeam(page, fixture)
      await expect(page.locator('[data-test="cash-out-all-button"]')).toBeDisabled({
        timeout: 30_000
      })
    }
  )

  /**
   * Covers:
   * - [AC-US-BANK-001-08]
   * - [AC-US-BANK-002-11]
   * - [AC-US-BANK-004-03]
   */
  test(
    'blocks funding, transfers, and cash-out for an archived team',
    { tag: ['@US-BANK-001', '@US-BANK-002', '@US-BANK-004'] },
    async ({ page }) => {
      await sendToken(fixture.usdc, fixture.bank, '1')
      await signInAndOpenTeam(page, fixture, { archived: true })
      await expect(page.locator('[data-test="cash-out-all-button"]')).toBeDisabled({
        timeout: 30_000
      })
      await openAccountFromSidebar(page, '/teams/1/accounts/bank-account')
      await expect(page.locator('[data-test="deposit-button"]')).toBeDisabled()
      await expect(page.locator('[data-test="transfer-button"]')).toBeDisabled()
    }
  )
})

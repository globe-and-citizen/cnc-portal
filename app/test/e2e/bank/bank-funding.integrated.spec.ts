import { parseEther, parseUnits, type Address } from 'viem'
import { expect, test } from '../fixtures/integrated'
import { E2E_OWNER, nativeBalance, publicClient, tokenBalance } from '../e2e-chain'
import { dialogAmount, openAccountFromSidebar } from '../e2e-page'
import { createOperationalCompany, deleteCompanyThroughUi } from '../company/real-company-page'
import { grossForNet } from './bank-chain'
import {
  addressFrom,
  bankDepositReceipt,
  depositUsdc,
  expectBankHistoryEntry
} from './bank-integrated-helpers'
import { transferBankToContract } from './bank-page'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const deploymentManifest = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../../src/artifacts/deployed_addresses/chain-31337.json', import.meta.url)
    ),
    'utf8'
  )
) as Record<string, string>
const usdc = deploymentManifest['MockTokens#USDC'] as Address
const feeCollector = deploymentManifest['FeeCollectorModule#FeeCollector'] as Address

test.describe(
  '[US-BANK-001/002/003] Integrated Bank funding',
  {
    tag: ['@US-BANK-001', '@US-BANK-002', '@US-BANK-003', '@integrated']
  },
  () => {
    test.setTimeout(240_000)

    /**
     * Covers:
     * - [AC-US-BANK-001-01]
     * - [AC-US-BANK-001-02]
     * - [AC-US-BANK-001-03]
     * - [AC-US-BANK-002-01]
     * - [AC-US-BANK-002-03]
     * - [AC-US-BANK-002-09]
     * - [AC-US-BANK-003-01]
     * - [AC-US-BANK-003-02]
     */
    test('funds the company Bank and transfers to the Expense Account', async ({ page }) => {
      const company = await createOperationalCompany(page)

      try {
        await page.locator('[data-test="skip-safe-setup-button"]').click()
        await expect(page).toHaveURL(new RegExp(`/teams/${company.teamId}$`))
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        const bank = await addressFrom(page.locator('[data-test="bank-contract-address"]'))
        const nativeFromBlock = await publicClient.getBlockNumber()
        await page.getByRole('button', { name: 'Deposit', exact: true }).click()
        const nativeDeposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
        await dialogAmount(nativeDeposit).fill('1')
        await nativeDeposit.locator('[data-test="deposit-button"]').click()
        await expect(page.getByText('GO deposited successfully', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect.poll(() => nativeBalance(bank)).toBe(parseEther('1'))
        const nativeDepositHash = await bankDepositReceipt({
          bank,
          depositor: E2E_OWNER,
          fromBlock: nativeFromBlock,
          amount: parseEther('1')
        })

        const tokenFromBlock = await publicClient.getBlockNumber()
        await depositUsdc(page, '2')
        await expect.poll(() => tokenBalance(usdc, bank)).toBe(parseUnits('2', 6))
        const tokenDepositHash = await bankDepositReceipt({
          bank,
          depositor: E2E_OWNER,
          fromBlock: tokenFromBlock,
          amount: parseUnits('2', 6),
          token: usdc
        })

        const history = page.locator('[data-test="bank-transactions"]')
        await expect(history.getByText('Deposit', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect(history.getByText('Token deposit', { exact: true })).toBeVisible()
        await expect(history.getByText('Date', { exact: true })).toBeVisible()
        await expect(history.getByText('Counterparty', { exact: true })).toBeVisible()
        await expect(history.getByText('Value (USD)', { exact: true })).toBeVisible()
        await expect(history.getByText('Tx Hash', { exact: true })).toBeVisible()
        await history.locator('[data-test="bank-transaction-detail-button"]').first().click()
        const transactionDetail = page.getByRole('dialog', { name: 'Transaction detail' })
        await expect(transactionDetail.getByText('Tx hash', { exact: true })).toBeVisible()
        await expect(transactionDetail.getByText('Timestamp', { exact: true })).toBeVisible()
        await expect(transactionDetail.getByText('Amount', { exact: true })).toBeVisible()
        await transactionDetail.getByRole('button', { name: 'Close', exact: true }).last().click()

        await page.reload()
        await expect(page.locator('[data-test="bank-contract-address"]')).toContainText(bank)
        const holdings = page
          .getByRole('table')
          .filter({ has: page.getByRole('columnheader', { name: 'RANK', exact: true }) })
        await expect(holdings.getByRole('cell', { name: '1 GO', exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect(holdings.getByRole('cell', { name: '2 USDC', exact: true })).toBeVisible()
        await expectBankHistoryEntry(page, nativeDepositHash, 'Deposit', '1 GO')
        await expectBankHistoryEntry(page, tokenDepositHash, 'Token deposit', '2 USDC')

        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/expense-account`)
        const expense = await addressFrom(page.locator('[data-test="expense-account-address"]'))
        const expenseBefore = await nativeBalance(expense)
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        const collectorBefore = await nativeBalance(feeCollector)
        const requestedNet = parseEther('0.25')
        const transferGross = grossForNet(requestedNet, 50n)
        await transferBankToContract(page, 'ExpenseAccountEIP712', '0.25', 'GO')
        await expect.poll(() => nativeBalance(expense)).toBe(expenseBefore + requestedNet)
        await expect.poll(() => nativeBalance(bank)).toBe(parseEther('1') - transferGross)
        await expect
          .poll(() => nativeBalance(feeCollector))
          .toBe(collectorBefore + transferGross - requestedNet)
        await expect(history.getByText('Transfer', { exact: true })).toBeVisible({
          timeout: 30_000
        })
      } finally {
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

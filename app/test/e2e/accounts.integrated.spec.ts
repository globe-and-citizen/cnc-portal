import type { Address } from 'viem'
import { parseEther, parseUnits } from 'viem'
import type { Locator, Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from './fixtures'
import {
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_OWNER,
  nativeBalance,
  tokenBalance
} from './e2e-chain'
import { dialogAmount, openAccountFromSidebar, selectToken, useWallet } from './e2e-page'
import { grossForNet } from './bank/bank-chain'
import { completeCashOut, transferBankToContract } from './bank/bank-page'
import {
  addRealCompanyMember,
  createOperationalCompany,
  deleteCompanyThroughUi,
  deploySafeThroughUi,
  signInToRealStack
} from './company/real-company-page'
import { chooseApprovalDate } from './expense/expense-page'

const deploymentManifest = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../src/artifacts/deployed_addresses/chain-31337.json', import.meta.url)
    ),
    'utf8'
  )
) as Record<string, string>
const usdc = deploymentManifest['MockTokens#USDC'] as Address
const feeCollector = deploymentManifest['FeeCollectorModule#FeeCollector'] as Address
const bankFeeBps = 50n

const addressFrom = async (selector: Locator) => {
  const text = await selector.textContent()
  const [address] = text?.match(/0x[a-fA-F0-9]{40}/) ?? []
  if (!address) throw new Error('Expected a contract address in the account view')
  return address as Address
}

async function depositUsdc(page: Page, amount: string) {
  await page.getByRole('button', { name: 'Deposit', exact: true }).click()
  const deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
  await selectToken(page, deposit, 'USDC')
  await dialogAmount(deposit).fill(amount)
  await deposit.locator('[data-test="deposit-button"]').click()
  await expect(page.getByText('USDC deposited successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
}

test.describe(
  '[US-SAFE-001/US-BANK-001/002/003] Integrated treasury readiness',
  {
    tag: ['@US-SAFE-001', '@US-BANK-001', '@US-BANK-002', '@US-BANK-003', '@integrated']
  },
  () => {
    test.setTimeout(240_000)

    /**
     * Covers:
     * - [AC-US-SAFE-001-01]
     * - [AC-US-SAFE-001-03]
     * - [AC-US-SAFE-001-05]
     * - [AC-US-BANK-001-01]
     * - [AC-US-BANK-001-02]
     * - [AC-US-BANK-001-03]
     * - [AC-US-BANK-002-01]
     * - [AC-US-BANK-002-03]
     * - [AC-US-BANK-002-09]
     * - [AC-US-BANK-003-02]
     */
    test('deploys the company Safe and funds the Bank through the product UI', async ({ page }) => {
      const company = await createOperationalCompany(page)

      try {
        const safe = await deploySafeThroughUi(page, company.teamId)
        expect(safe.type).toBe('Safe')

        await openAccountFromSidebar(
          page,
          `/teams/${company.teamId}/accounts/safe-account/${safe.address}`
        )
        await expect(page.locator('[data-test="safe-wallet-view"]')).toBeVisible()
        await expect(page.locator('[data-test="safe-threshold-summary"]')).toHaveText(
          '1 of 1 signers'
        )

        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        const bank = await addressFrom(page.locator('[data-test="bank-contract-address"]'))
        await page.getByRole('button', { name: 'Deposit', exact: true }).click()
        const nativeDeposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
        await dialogAmount(nativeDeposit).fill('1')
        await nativeDeposit.locator('[data-test="deposit-button"]').click()
        await expect(page.getByText('GO deposited successfully', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect.poll(() => nativeBalance(bank)).toBe(parseEther('1'))

        await depositUsdc(page, '2')
        await expect.poll(() => tokenBalance(usdc, bank)).toBe(parseUnits('2', 6))
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
        await transactionDetail.getByRole('button', { name: 'Close', exact: true }).click()

        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/expense-account`)
        const expense = await addressFrom(page.locator('[data-test="expense-account-address"]'))
        const expenseBefore = await nativeBalance(expense)
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        const collectorBefore = await nativeBalance(feeCollector)
        const requestedNet = parseEther('0.25')
        const transferGross = grossForNet(requestedNet, bankFeeBps)
        await transferBankToContract(page, 'ExpenseAccountEIP712', '0.25')
        await expect.poll(() => nativeBalance(expense)).toBe(expenseBefore + requestedNet)
        await expect.poll(() => nativeBalance(bank)).toBe(parseEther('1') - transferGross)
        await expect
          .poll(() => nativeBalance(feeCollector))
          .toBe(collectorBefore + transferGross - requestedNet)
      } finally {
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

test.describe(
  '[US-BANK-002/004/US-EXP-001/002/003/004] Integrated expense allowance',
  {
    tag: [
      '@US-BANK-002',
      '@US-BANK-004',
      '@US-EXP-001',
      '@US-EXP-002',
      '@US-EXP-003',
      '@US-EXP-004',
      '@integrated'
    ]
  },
  () => {
    test.setTimeout(300_000)

    /**
     * Covers:
     * - [AC-US-EXP-001-01]
     * - [AC-US-EXP-001-02]
     * - [AC-US-EXP-001-03]
     * - [AC-US-EXP-002-01]
     * - [AC-US-EXP-002-02]
     * - [AC-US-EXP-003-01]
     * - [AC-US-EXP-003-02]
     * - [AC-US-EXP-003-03]
     * - [AC-US-EXP-004-02]
     * - [AC-US-EXP-004-04]
     * - [AC-US-BANK-002-10]
     * - [AC-US-BANK-004-01]
     */
    test('grants, spends and controls one persisted allowance', async ({ browser, page }) => {
      const memberContext = await browser.newContext()
      const memberPage = await memberContext.newPage()
      await useWallet(memberPage, E2E_MEMBER_PRIVATE_KEY)
      await signInToRealStack(memberPage)
      await memberContext.close()

      const company = await createOperationalCompany(page)

      try {
        await page.locator('[data-test="skip-safe-setup-button"]').click()
        await addRealCompanyMember(page, company.teamId, E2E_MEMBER)
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        const bank = await addressFrom(page.locator('[data-test="bank-contract-address"]'))
        await depositUsdc(page, '10')

        const collectorBefore = await tokenBalance(usdc, feeCollector)
        const requestedNet = parseUnits('8', 6)
        const transferGross = grossForNet(requestedNet, bankFeeBps)
        await transferBankToContract(page, 'ExpenseAccountEIP712', '8', 'USDC')

        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/expense-account`)
        const expense = await addressFrom(page.locator('[data-test="expense-account-address"]'))
        await expect.poll(() => tokenBalance(usdc, expense)).toBe(requestedNet)
        await expect.poll(() => tokenBalance(usdc, bank)).toBe(parseUnits('10', 6) - transferGross)
        await expect
          .poll(() => tokenBalance(usdc, feeCollector))
          .toBe(collectorBefore + transferGross - requestedNet)
        await page.locator('[data-test="approve-users-button"]').click()
        const approval = page.getByRole('dialog', { name: 'Grant Spending Approval' })
        await approval.locator('[data-test="member-address-input"]').fill(E2E_MEMBER)
        await expect(approval.locator('[data-test="user-row"]')).toBeVisible()
        await approval.locator('[data-test="user-row"]').click()
        await approval.locator('[data-test="token-selector"]').click()
        await page.getByRole('option', { name: 'USDC', exact: true }).click()
        await approval.locator('[data-test="amount-input"]').fill('5')
        await approval.locator('[data-test="frequency-select"]').click()
        await page.getByRole('option', { name: 'Weekly', exact: true }).click()
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)
        await chooseApprovalDate(page, '[data-test="start-date-picker"]', today)
        await chooseApprovalDate(page, '[data-test="end-date-picker"]', tomorrow)
        await approval.locator('[data-test="approve-button"]').click()
        const persistedApproval = page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            new URL(response.url()).pathname === '/api/expense'
        )
        await page
          .getByRole('dialog', { name: 'Review & Sign' })
          .locator('[data-test="approve-button"]')
          .click()
        const approvalResponse = await persistedApproval
        expect(approvalResponse.ok()).toBe(true)
        const approvalRecord = (await approvalResponse.json()) as {
          userAddress: string
          data: {
            amount: number
            frequencyType: number
            startDate: number
            endDate: number
            tokenAddress: string
            approvedAddress: string
            signedAgainstContractAddress: string
            chainId: number
          }
        }
        expect(approvalRecord.userAddress.toLowerCase()).toBe(E2E_MEMBER.toLowerCase())
        expect(approvalRecord.data).toMatchObject({
          amount: 5,
          frequencyType: 2,
          tokenAddress: usdc,
          approvedAddress: E2E_MEMBER,
          signedAgainstContractAddress: expense,
          chainId: 31337
        })
        expect(approvalRecord.data.startDate).toBeGreaterThan(0)
        expect(approvalRecord.data.endDate).toBeGreaterThan(approvalRecord.data.startDate)
        await expect(page.getByText('User approved successfully', { exact: true })).toBeVisible({
          timeout: 30_000
        })

        const spendingContext = await browser.newContext()
        const spendingPage = await spendingContext.newPage()
        await useWallet(spendingPage, E2E_MEMBER_PRIVATE_KEY)
        await signInToRealStack(spendingPage)
        await spendingPage.goto(`/teams/${company.teamId}`)
        await openAccountFromSidebar(
          spendingPage,
          `/teams/${company.teamId}/accounts/expense-account`
        )
        const memberBefore = await tokenBalance(usdc, E2E_MEMBER)
        await spendingPage.locator('[data-test="transfer-button"]').click()
        const spend = spendingPage.getByRole('dialog', {
          name: 'Transfer from Expenses Contract'
        })
        await spend.getByPlaceholder('Address').fill(E2E_MEMBER)
        await spend.locator('[data-test="user-row"]').click()
        await dialogAmount(spend).fill('3')
        await spend.locator('[data-test="transferButton"]').click()
        await expect(spendingPage.getByText('Transfer Successful', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect
          .poll(() => tokenBalance(usdc, E2E_MEMBER))
          .toBe(memberBefore + parseUnits('3', 6))
        await expect.poll(() => tokenBalance(usdc, expense)).toBe(parseUnits('5', 6))
        await spendingContext.close()

        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/expense-account`)
        await page.locator('[data-test="disable-button"]').click()
        await expect(page.getByText('Approval deactivated', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/expense-account`)
        await expect(page.locator('[data-test="enable-button"]')).toBeVisible()
        await page.locator('[data-test="enable-button"]').click()
        await expect(page.getByText('Approval activated', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/expense-account`)
        await expect(page.locator('[data-test="disable-button"]')).toBeVisible()

        const reviewContext = await browser.newContext()
        const reviewPage = await reviewContext.newPage()
        try {
          await signInToRealStack(reviewPage)
          await reviewPage.goto(`/teams/${company.teamId}`)
          await openAccountFromSidebar(
            reviewPage,
            `/teams/${company.teamId}/accounts/expense-account`
          )
          await expect(
            reviewPage
              .locator('[data-test="expense-transactions"]')
              .getByText('Token transfer', { exact: true })
          ).toBeVisible({ timeout: 30_000 })
        } finally {
          await reviewContext.close()
        }

        const ownerBeforeCashOut = await tokenBalance(usdc, E2E_OWNER)
        await page.goto(`/teams/${company.teamId}`)
        await completeCashOut(page)
        await expect.poll(() => tokenBalance(usdc, expense)).toBe(0n)
        await expect.poll(() => tokenBalance(usdc, bank)).toBe(0n)
        await expect.poll(() => tokenBalance(usdc, E2E_OWNER)).toBeGreaterThan(ownerBeforeCashOut)
      } finally {
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

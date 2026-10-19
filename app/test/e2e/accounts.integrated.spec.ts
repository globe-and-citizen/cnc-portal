import type { Address } from 'viem'
import { keccak256, parseUnits, type Hex } from 'viem'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from './fixtures/integrated'
import {
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_OWNER,
  E2E_OWNER_PRIVATE_KEY,
  memberAccount,
  publicClient,
  tokenBalance
} from './e2e-chain'
import { dialogAmount, openAccountFromSidebar } from './e2e-page'
import { grossForNet } from './bank/bank-chain'
import { addressFrom, depositUsdc } from './bank/bank-integrated-helpers'
import { completeCashOut, transferBankToContract } from './bank/bank-page'
import {
  addRealCompanyMember,
  createOperationalCompany,
  deleteCompanyThroughUi
} from './company/real-company-page'
import { chooseApprovalDate } from './expense/expense-page'
import { expenseAccountEip712Abi } from '../../src/artifacts/abi/generated'

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
     * - [AC-US-EXP-003-05]
     * - [AC-US-EXP-004-01]
     * - [AC-US-EXP-004-02]
     * - [AC-US-EXP-004-04]
     * - [AC-US-BANK-002-10]
     * - [AC-US-BANK-004-01]
     */
    test('grants, spends and controls one persisted allowance', async ({ walletPage, page }) => {
      const memberPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)

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
        const expense = await transferBankToContract(page, 'ExpenseAccountEIP712', '8', 'USDC')
        await expect.poll(() => tokenBalance(usdc, expense)).toBe(requestedNet)

        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/expense-account`)
        await expect(page.locator('[data-test="expense-account-address"]')).toContainText(expense)
        await expect(page.locator('[data-test="expense-account-balance"]')).toContainText('$8.00')
        await expect(page.getByText('Month Spent', { exact: true })).toBeVisible()
        await expect(page.getByText('Total Approved', { exact: true })).toBeVisible()
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
          signature: Hex
          data: {
            amount: number
            frequencyType: number
            customFrequency: number
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
        await expect(
          page
            .locator('[data-variant="info"]')
            .filter({ hasText: 'Total Approved' })
            .locator('[data-test="amount"]')
        ).toHaveText('1')

        await memberPage.goto(`/teams/${company.teamId}`)
        await openAccountFromSidebar(
          memberPage,
          `/teams/${company.teamId}/accounts/expense-account`
        )
        const memberBefore = await tokenBalance(usdc, E2E_MEMBER)
        await memberPage.locator('[data-test="transfer-button"]').click()
        const spend = memberPage.getByRole('dialog', {
          name: 'Transfer from Expenses Contract'
        })
        await spend.getByPlaceholder('Address').fill(E2E_MEMBER)
        await spend.locator('[data-test="user-row"]').click()
        await dialogAmount(spend).fill('3')
        await spend.locator('[data-test="transferButton"]').click()
        await expect(memberPage.getByText('Transfer Successful', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect
          .poll(() => tokenBalance(usdc, E2E_MEMBER))
          .toBe(memberBefore + parseUnits('3', 6))
        await expect.poll(() => tokenBalance(usdc, expense)).toBe(parseUnits('5', 6))

        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/expense-account`)
        await page.locator('[data-test="disable-button"]').click()
        await expect(page.getByText('Approval deactivated', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/expense-account`)
        await expect(page.locator('[data-test="enable-button"]')).toBeVisible()
        await memberPage.reload()
        await expect(memberPage.locator('[data-test="transfer-button"]')).toBeDisabled()

        const recipientWhileDisabled = await tokenBalance(usdc, E2E_MEMBER)
        const expenseWhileDisabled = await tokenBalance(usdc, expense)
        const signatureHash = keccak256(approvalRecord.signature)
        const usageWhileDisabled = (await publicClient.readContract({
          address: expense,
          abi: expenseAccountEip712Abi,
          functionName: 'getExpenseBalance',
          args: [signatureHash]
        })) as { totalWithdrawn: bigint; state: number }
        expect(Number(usageWhileDisabled.state)).toBe(2)

        // The browser hides Spend for a disabled approval. Exercise the same
        // signed request at the real contract boundary so the UI cannot mask
        // a missing on-chain authorization check.
        await expect(
          publicClient.simulateContract({
            account: memberAccount,
            address: expense,
            abi: expenseAccountEip712Abi,
            functionName: 'transfer',
            args: [
              E2E_MEMBER,
              parseUnits('1', 6),
              {
                amount: parseUnits(String(approvalRecord.data.amount), 6),
                frequencyType: approvalRecord.data.frequencyType,
                customFrequency: BigInt(approvalRecord.data.customFrequency),
                startDate: BigInt(approvalRecord.data.startDate),
                endDate: BigInt(approvalRecord.data.endDate),
                tokenAddress: usdc,
                approvedAddress: E2E_MEMBER
              },
              approvalRecord.signature
            ]
          })
        ).rejects.toThrow('ExpenseAccountEIP712__ApprovalInactive')
        expect(await tokenBalance(usdc, E2E_MEMBER)).toBe(recipientWhileDisabled)
        expect(await tokenBalance(usdc, expense)).toBe(expenseWhileDisabled)
        const usageAfterRejectedSpend = (await publicClient.readContract({
          address: expense,
          abi: expenseAccountEip712Abi,
          functionName: 'getExpenseBalance',
          args: [signatureHash]
        })) as { totalWithdrawn: bigint; state: number }
        expect(usageAfterRejectedSpend.totalWithdrawn).toBe(usageWhileDisabled.totalWithdrawn)
        expect(usageAfterRejectedSpend.state).toBe(usageWhileDisabled.state)

        await page.locator('[data-test="enable-button"]').click()
        await expect(page.getByText('Approval activated', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/bank-account`)
        await openAccountFromSidebar(page, `/teams/${company.teamId}/accounts/expense-account`)
        await expect(page.locator('[data-test="disable-button"]')).toBeVisible()

        await memberPage.reload()
        await expect(memberPage.locator('[data-test="transfer-button"]')).toBeEnabled()
        await memberPage.locator('[data-test="transfer-button"]').click()
        const secondSpend = memberPage.getByRole('dialog', {
          name: 'Transfer from Expenses Contract'
        })
        await secondSpend.getByPlaceholder('Address').fill(E2E_MEMBER)
        await secondSpend.locator('[data-test="user-row"]').click()
        await dialogAmount(secondSpend).fill('1')
        await secondSpend.locator('[data-test="transferButton"]').click()
        await expect(memberPage.getByText('Transfer Successful', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect
          .poll(() => tokenBalance(usdc, E2E_MEMBER))
          .toBe(memberBefore + parseUnits('4', 6))
        await expect.poll(() => tokenBalance(usdc, expense)).toBe(parseUnits('4', 6))

        await page.reload()
        await expect(page.locator('[data-test="expense-account-balance"]')).toContainText('$4.00')
        await expect(page.locator('[data-test="disable-button"]')).toBeVisible()
        await memberPage.reload()
        await expect(memberPage.locator('[data-test="expense-account-balance"]')).toContainText(
          '$4.00'
        )
        await expect(memberPage.locator('[data-test="transfer-button"]')).toBeEnabled()
        const finalUsage = (await publicClient.readContract({
          address: expense,
          abi: expenseAccountEip712Abi,
          functionName: 'getExpenseBalance',
          args: [signatureHash]
        })) as { totalWithdrawn: bigint; state: number }
        expect(finalUsage.totalWithdrawn).toBe(parseUnits('4', 6))
        expect(Number(finalUsage.state)).not.toBe(2)

        const reviewPage = await walletPage(E2E_OWNER_PRIVATE_KEY)
        await reviewPage.goto(`/teams/${company.teamId}`)
        await openAccountFromSidebar(
          reviewPage,
          `/teams/${company.teamId}/accounts/expense-account`
        )
        await reviewPage.reload()
        await expect(
          reviewPage
            .locator('[data-test="expense-transactions"]')
            .getByText('Token transfer', { exact: true })
        ).toHaveCount(2, { timeout: 30_000 })

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

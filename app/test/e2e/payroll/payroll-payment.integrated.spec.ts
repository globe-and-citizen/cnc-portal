import { parseEther, parseUnits, type Hex } from 'viem'
import { expect, test } from '../fixtures/integrated'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY, publicClient, tokenBalance } from '../e2e-chain'
import {
  assertThreeAssetPayment,
  companySherAddress,
  payrollUsdc as usdc,
  wageClaimState
} from './payroll-chain'
import {
  completedWeekStart,
  fundCashRemuneration,
  assertPayrollAccountHoldings,
  openMemberPayrollHistory,
  openWeeklyClaimActions,
  selectHistoryWeek,
  setMemberUsdcWage,
  submitDailyClaim
} from './payroll-page'

test.describe(
  '[US-PAYROLL-008/009/010/011/012/013] Integrated payment lifecycle',
  {
    tag: [
      '@US-PAYROLL-008',
      '@US-PAYROLL-009',
      '@US-PAYROLL-010',
      '@US-PAYROLL-011',
      '@US-PAYROLL-012',
      '@US-PAYROLL-013',
      '@integrated'
    ]
  },
  () => {
    test.setTimeout(360_000)

    /**
     * Covers:
     * - [AC-US-PAYROLL-008-01]
     * - [AC-US-PAYROLL-009-01]
     * - [AC-US-PAYROLL-009-02]
     * - [AC-US-PAYROLL-009-03]
     * - [AC-US-PAYROLL-009-04]
     * - [AC-US-PAYROLL-010-01]
     * - [AC-US-PAYROLL-010-02]
     * - [AC-US-PAYROLL-010-03]
     * - [AC-US-PAYROLL-010-04]
     * - [AC-US-PAYROLL-011-01]
     * - [AC-US-PAYROLL-012-01]
     * - [AC-US-PAYROLL-013-01]
     * - [AC-US-PAYROLL-013-02]
     * - [AC-US-PAYROLL-013-03]
     * - [AC-US-PAYROLL-013-04]
     * - [AC-US-PAYROLL-013-05]
     * - [AC-US-PAYROLL-013-06]
     */
    test('approves, controls, pays and reloads one completed-week claim', async ({
      authenticatedPage: page,
      walletPage,
      operationalTeam,
      teamFeatureOverride
    }) => {
      const company = await operationalTeam({ memberPrivateKeys: [E2E_MEMBER_PRIVATE_KEY] })
      await teamFeatureOverride(company.teamId, 'SUBMIT_RESTRICTION', 'disabled')
      const memberPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)

      await page.goto(`/teams/${company.teamId}`)
      await expect(page).toHaveURL(new RegExp(`/teams/${company.teamId}$`))
      await setMemberUsdcWage(page, company.teamId, E2E_MEMBER, {
        weeklyCap: '8',
        dailyCap: '8',
        hourlyRate: '1',
        nativeRate: '0.001',
        sherRate: '2'
      })
      const cashRemuneration = await fundCashRemuneration(page, company.teamId, '3')
      await expect
        .poll(() => tokenBalance(usdc, cashRemuneration), { timeout: 30_000 })
        .toBe(parseUnits('3', 6))
      await fundCashRemuneration(page, company.teamId, '0.003', 'native')
      await expect
        .poll(() => publicClient.getBalance({ address: cashRemuneration }), { timeout: 30_000 })
        .toBe(parseEther('0.003'))
      const sher = await companySherAddress(company.officer.address)
      await assertPayrollAccountHoldings(page, company.teamId, { native: '0.003', usdc: '3' })

      const paidWeek = completedWeekStart()
      await openMemberPayrollHistory(memberPage, company.teamId, E2E_MEMBER)
      await selectHistoryWeek(memberPage, paidWeek)
      await submitDailyClaim(memberPage, { hours: '2', memo: 'Completed Payroll claim' })
      await expect(memberPage.locator('[data-test="daily-breakdown"]')).toContainText('2h')

      await page.goto(`/teams/${company.teamId}/accounts/team-payroll`)
      const weeklyClaims = page.locator('[data-test="weekly-claims-table"]')
      await expect(weeklyClaims).toContainText('Pending', { timeout: 30_000 })

      await memberPage.goto(`/teams/${company.teamId}/accounts/team-payroll`)
      const memberWeeklyClaims = memberPage.locator('[data-test="weekly-claims-table"]')
      await expect(memberWeeklyClaims).toContainText('Pending', { timeout: 30_000 })
      await memberWeeklyClaims.locator('[data-test="weekly-claim-actions-button"]').click()
      await expect(memberPage.locator('[data-test="pending-sign"]')).toHaveClass(
        /pointer-events-none/
      )

      await openWeeklyClaimActions(page, weeklyClaims, 'pending-sign')
      const signedResponse = page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          new URL(response.url()).pathname.startsWith('/api/weeklyClaim/') &&
          new URL(response.url()).searchParams.get('action') === 'sign'
      )
      await page.locator('[data-test="sign-action"]').click()
      const signed = await signedResponse
      expect(signed.ok()).toBe(true)
      const signedClaim = (await signed.json()) as { signature: Hex }
      await expect(page.getByText('Claim approved', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect(weeklyClaims).toContainText('Signed', { timeout: 30_000 })
      await expect
        .poll(() => wageClaimState(cashRemuneration, signedClaim.signature), { timeout: 30_000 })
        .toEqual({
          disabled: false,
          paid: false
        })

      const payrollAccountPath = `/teams/${company.teamId}/accounts/payroll-account`
      const companyPayrollPath = `/teams/${company.teamId}/accounts/team-payroll`
      const summaryAmount = (subtitle: string) =>
        page
          .locator('div[data-variant]')
          .filter({ has: page.getByText(subtitle, { exact: true }) })
          .locator('[data-test="amount"]')
      await page.goto(payrollAccountPath)
      await expect(summaryAmount('Pending Claim')).toHaveText('$2.00', { timeout: 30_000 })
      await expect(summaryAmount('Month Claimed')).toHaveText('$0.00', { timeout: 30_000 })
      await page.reload()
      await expect(summaryAmount('Pending Claim')).toHaveText('$2.00', { timeout: 30_000 })
      await page.goto(companyPayrollPath)
      await expect(weeklyClaims).toContainText('Signed', { timeout: 30_000 })

      await openWeeklyClaimActions(page, weeklyClaims, 'signed-withdraw')
      await expect(page.locator('[data-test="signed-withdraw"]')).toHaveClass(/pointer-events-none/)

      const expectMemberClaimReadOnly = async () => {
        await openMemberPayrollHistory(memberPage, company.teamId, E2E_MEMBER)
        await selectHistoryWeek(memberPage, paidWeek)
        await expect(memberPage.locator('[data-test="modal-submit-hours-button"]')).toBeDisabled()
        await expect(memberPage.locator('[data-test="submit-weekly-goals-button"]')).toBeDisabled()
        const dailyBreakdown = memberPage.locator('[data-test="daily-breakdown"]')
        await expect(dailyBreakdown.locator('[data-test="edit-claim-button"]')).toHaveCount(0)
        await expect(dailyBreakdown.locator('[data-test="delete-claim-button"]')).toHaveCount(0)
      }
      await expectMemberClaimReadOnly()

      await page.locator('[data-test="signed-disable"] a').click()
      await expect(page.getByText('Claim disabled', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect
        .poll(() => wageClaimState(cashRemuneration, signedClaim.signature), { timeout: 30_000 })
        .toEqual({
          disabled: true,
          paid: false
        })
      await expect(weeklyClaims).toContainText('Disabled', { timeout: 30_000 })
      await expectMemberClaimReadOnly()

      await openWeeklyClaimActions(page, weeklyClaims, 'disabled-enable')
      await page.locator('[data-test="enable-action"]').click()
      await expect(page.getByText('Claim enabled', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect
        .poll(() => wageClaimState(cashRemuneration, signedClaim.signature), { timeout: 30_000 })
        .toEqual({
          disabled: false,
          paid: false
        })
      await expect(weeklyClaims).toContainText('Signed', { timeout: 30_000 })

      await openMemberPayrollHistory(memberPage, company.teamId, E2E_MEMBER)
      await selectHistoryWeek(memberPage, paidWeek)
      const memberUsdcBefore = await tokenBalance(usdc, E2E_MEMBER)
      const memberSherBefore = await tokenBalance(sher, E2E_MEMBER)
      const memberNativeBefore = await publicClient.getBalance({ address: E2E_MEMBER })
      const withdrawalBlock = await publicClient.getBlockNumber()
      await memberPage.locator('[data-test="withdraw-button"]').click()
      await expect(memberPage.getByText('Claim withdrawn', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect
        .poll(() => tokenBalance(usdc, E2E_MEMBER), { timeout: 30_000 })
        .toBe(memberUsdcBefore + parseUnits('2', 6))
      await assertThreeAssetPayment(cashRemuneration, usdc, sher, signedClaim.signature, {
        sher: memberSherBefore,
        native: memberNativeBefore,
        block: withdrawalBlock
      })
      await expect
        .poll(() => wageClaimState(cashRemuneration, signedClaim.signature), { timeout: 30_000 })
        .toEqual({
          disabled: false,
          paid: true
        })

      await memberPage.reload()
      await selectHistoryWeek(memberPage, paidWeek)
      await expect(memberPage.getByText('You have withdrawn your weekly claim.')).toBeVisible()
      await expect(memberPage.locator('[data-test="modal-submit-hours-button"]')).toBeDisabled()
      await expect(memberPage.locator('[data-test="submit-weekly-goals-button"]')).toBeDisabled()
      const withdrawnDailyBreakdown = memberPage.locator('[data-test="daily-breakdown"]')
      await expect(withdrawnDailyBreakdown.locator('[data-test="edit-claim-button"]')).toHaveCount(
        0
      )
      await expect(
        withdrawnDailyBreakdown.locator('[data-test="delete-claim-button"]')
      ).toHaveCount(0)
      await page.reload()
      await expect(weeklyClaims).toContainText('Withdrawn', { timeout: 30_000 })
      await assertPayrollAccountHoldings(memberPage, company.teamId, {
        native: '0.001',
        usdc: '1',
        memberReadOnly: true
      })

      const memberSummaryAmount = (subtitle: string) =>
        memberPage
          .locator('div[data-variant]')
          .filter({ has: memberPage.getByText(subtitle, { exact: true }) })
          .locator('[data-test="amount"]')
      await expect(memberSummaryAmount('Pending Claim')).toHaveText('$0.00', { timeout: 30_000 })
      await expect(memberSummaryAmount('Month Claimed')).toHaveText('$2.00', { timeout: 30_000 })
      await memberPage.reload()
      await expect(memberSummaryAmount('Pending Claim')).toHaveText('$0.00', { timeout: 30_000 })
      await expect(memberSummaryAmount('Month Claimed')).toHaveText('$2.00', { timeout: 30_000 })

      await memberPage.goto(companyPayrollPath)
      const activity = memberPage.locator('[data-test="cash-remuneration-transactions"]')
      const rowWithType = (label: string) =>
        activity.getByRole('row').filter({ has: memberPage.getByText(label, { exact: true }) })
      const nativeDeposit = rowWithType('Deposit')
      const tokenDeposit = rowWithType('Token deposit')
      const withdrawal = rowWithType('Withdrawal')
      const tokenWithdrawal = rowWithType('Token withdrawal')
      await expect(nativeDeposit).toContainText('0.003', { timeout: 30_000 })
      await expect(tokenDeposit).toContainText('3 USDC', { timeout: 30_000 })
      await expect(tokenDeposit).toContainText('$3.00')
      await expect(withdrawal).toContainText('0.002', { timeout: 30_000 })
      await expect(withdrawal).toContainText('-2.00 USDC')
      await expect(withdrawal).toContainText('$2.00')
      await memberPage.reload()
      await expect(tokenDeposit).toContainText('3 USDC', { timeout: 30_000 })
      await expect(withdrawal).toContainText('-2.00 USDC', { timeout: 30_000 })

      const typeFilter = activity.locator(
        '[data-test="cash-remuneration-transaction-history-type-filter"]'
      )
      await typeFilter.click()
      await memberPage.getByRole('option', { name: 'Token deposit', exact: true }).click()
      await expect(tokenDeposit).toHaveCount(1)
      await expect(withdrawal).toHaveCount(0)
      await expect(nativeDeposit).toHaveCount(0)

      const dateFilter = activity.locator(
        '[data-test="cash-remuneration-transaction-history-date-select"]'
      )
      await dateFilter.locator('[data-test="date-picker-trigger"]').click()
      await memberPage.locator('[data-test="date-picker-month-previous"]').click()
      await expect(activity.getByText('No data', { exact: true })).toBeVisible()
      await memberPage.reload()
      await expect(activity.getByText('No data', { exact: true })).toBeVisible({ timeout: 30_000 })
      await dateFilter.locator('[data-test="date-picker-trigger"]').click()
      await memberPage.locator('[data-test="date-picker-month-next"]').click()
      await expect(tokenDeposit).toContainText('3 USDC', { timeout: 30_000 })
      await typeFilter.click()
      await memberPage.getByRole('option', { name: 'Withdrawal', exact: true }).click()
      await expect(withdrawal).toContainText('-0.002 GO')
      await expect(withdrawal).toContainText('$0.00')
      await expect(tokenDeposit).toHaveCount(0)
      await typeFilter.click()
      await memberPage.getByRole('option', { name: 'Token withdrawal', exact: true }).click()
      await expect(tokenWithdrawal).toContainText('-2.00 USDC')
      await expect(withdrawal).toHaveCount(0)
    })
  }
)

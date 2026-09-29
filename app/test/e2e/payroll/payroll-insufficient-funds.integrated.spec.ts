import { type Hex } from 'viem'
import { expect, test } from '../fixtures'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY, tokenBalance } from '../e2e-chain'
import { payrollUsdc as usdc, wageClaimState } from './payroll-chain'
import {
  completedWeekStart,
  getCashRemunerationAddress,
  openMemberPayrollHistory,
  selectHistoryWeek,
  setMemberUsdcWage,
  submitDailyClaim
} from './payroll-page'

test.describe(
  '[US-PAYROLL-010] Integrated insufficient Payroll funding',
  { tag: ['@US-PAYROLL-010', '@integrated'] },
  () => {
    test.setTimeout(240_000)
    test('keeps a signed claim unpaid when the Payroll contract has insufficient USDC', async ({
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
      await setMemberUsdcWage(page, E2E_MEMBER, {
        weeklyCap: '8',
        dailyCap: '8',
        hourlyRate: '1'
      })
      const cashRemuneration = await getCashRemunerationAddress(page, company.teamId)
      expect(await tokenBalance(usdc, cashRemuneration)).toBe(0n)

      const paidWeek = completedWeekStart()
      await openMemberPayrollHistory(memberPage, company.teamId, E2E_MEMBER)
      await selectHistoryWeek(memberPage, paidWeek)
      await submitDailyClaim(memberPage, { hours: '2', memo: 'Unfunded Payroll claim' })

      await page.goto(`/teams/${company.teamId}/accounts/team-payroll`)
      const weeklyClaims = page.locator('[data-test="weekly-claims-table"]')
      await expect(weeklyClaims).toContainText('Pending', { timeout: 30_000 })
      await weeklyClaims.locator('[data-test="weekly-claim-actions-button"]').click()
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

      await openMemberPayrollHistory(memberPage, company.teamId, E2E_MEMBER)
      await selectHistoryWeek(memberPage, paidWeek)
      const memberUsdcBefore = await tokenBalance(usdc, E2E_MEMBER)
      await memberPage.locator('[data-test="withdraw-button"]').click()
      await expect(
        memberPage.getByText('Insufficient token balance — needs 2000000, only 0 available', {
          exact: true
        })
      ).toBeVisible({ timeout: 30_000 })
      await expect
        .poll(() => tokenBalance(usdc, E2E_MEMBER), { timeout: 30_000 })
        .toBe(memberUsdcBefore)
      await expect
        .poll(() => wageClaimState(cashRemuneration, signedClaim.signature), { timeout: 30_000 })
        .toEqual({
          disabled: false,
          paid: false
        })

      await page.reload()
      await expect(weeklyClaims).toContainText('Signed', { timeout: 30_000 })
    })
  }
)

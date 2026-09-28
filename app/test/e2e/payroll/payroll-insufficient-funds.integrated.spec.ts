import { type Hex } from 'viem'
import { expect, test } from '../fixtures'
import {
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_OWNER_PRIVATE_KEY,
  tokenBalance
} from '../e2e-chain'
import { useWallet } from '../e2e-page'
import {
  addRealCompanyMember,
  createOperationalCompany,
  deleteCompanyThroughUi,
  signInToRealStack
} from '../company/real-company-page'
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
      browser,
      page
    }) => {
      await useWallet(page, E2E_OWNER_PRIVATE_KEY)
      const memberBootstrap = await browser.newContext()
      const bootstrapPage = await memberBootstrap.newPage()
      await useWallet(bootstrapPage, E2E_MEMBER_PRIVATE_KEY)
      await signInToRealStack(bootstrapPage)
      await memberBootstrap.close()

      const company = await createOperationalCompany(page)
      let memberContext: Awaited<ReturnType<typeof browser.newContext>> | undefined

      try {
        await page.locator('[data-test="skip-safe-setup-button"]').click()
        await expect(page).toHaveURL(new RegExp(`/teams/${company.teamId}$`))
        await addRealCompanyMember(page, company.teamId, E2E_MEMBER)
        await setMemberUsdcWage(page, E2E_MEMBER, {
          weeklyCap: '8',
          dailyCap: '8',
          hourlyRate: '1'
        })
        const cashRemuneration = await getCashRemunerationAddress(page, company.teamId)
        expect(await tokenBalance(usdc, cashRemuneration)).toBe(0n)

        const paidWeek = completedWeekStart()
        memberContext = await browser.newContext()
        const memberPage = await memberContext.newPage()
        await useWallet(memberPage, E2E_MEMBER_PRIVATE_KEY)
        await signInToRealStack(memberPage)
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
      } finally {
        await memberContext?.close()
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseUnits, type Address, type Hex } from 'viem'
import { expect, test } from '../fixtures'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY, tokenBalance } from '../e2e-chain'
import { useWallet } from '../e2e-page'
import {
  addRealCompanyMember,
  createOperationalCompany,
  deleteCompanyThroughUi,
  signInToRealStack
} from '../company/real-company-page'
import { wageClaimState } from './payroll-chain'
import {
  fundCashRemuneration,
  openMemberPayrollHistory,
  saveWeeklyGoals,
  selectHistoryWeek,
  setMemberUsdcWage,
  submitDailyClaim
} from './payroll-page'

const deploymentManifest = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../../src/artifacts/deployed_addresses/chain-31337.json', import.meta.url)
    ),
    'utf8'
  )
) as Record<string, string>
const usdc = deploymentManifest['MockTokens#USDC'] as Address

const completedWeekStart = (): Date => {
  const now = new Date()
  const utcDay = now.getUTCDay() || 7
  const currentMonday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  currentMonday.setUTCDate(currentMonday.getUTCDate() - utcDay + 1)
  currentMonday.setUTCDate(currentMonday.getUTCDate() - 7)
  return currentMonday
}

test.describe(
  '[US-PAYROLL-001/002] Integrated member compensation',
  { tag: ['@US-PAYROLL-001', '@US-PAYROLL-002', '@integrated'] },
  () => {
    test.setTimeout(240_000)

    /**
     * Covers:
     * - [AC-US-PAYROLL-001-01]
     * - [AC-US-PAYROLL-001-02]
     * - [AC-US-PAYROLL-002-01]
     * - [AC-US-PAYROLL-002-02]
     */
    test('replaces, pauses and resumes one member wage through the Payroll UI', async ({
      browser,
      page
    }) => {
      const memberContext = await browser.newContext()
      const memberPage = await memberContext.newPage()
      await useWallet(memberPage, E2E_MEMBER_PRIVATE_KEY)
      await signInToRealStack(memberPage)
      await memberContext.close()

      const company = await createOperationalCompany(page)

      try {
        await page.locator('[data-test="skip-safe-setup-button"]').click()
        await addRealCompanyMember(page, company.teamId, E2E_MEMBER)
        await setMemberUsdcWage(page, E2E_MEMBER, {
          weeklyCap: '12',
          dailyCap: '4',
          hourlyRate: '1'
        })
        await setMemberUsdcWage(page, E2E_MEMBER, {
          weeklyCap: '16',
          dailyCap: '6',
          hourlyRate: '2'
        })

        const memberActions = page.locator(`[data-test="member-actions-${E2E_MEMBER}"]`)
        await memberActions.locator('[data-test="pause-wage-button"]').click()
        await expect(page.getByText('Wage disabled successfully', { exact: true })).toBeVisible()
        await expect(memberActions.locator('[data-test="resume-wage-button"]')).toBeVisible()

        await page.reload()
        await expect(page.locator('[data-test="daily-cap-badge"]')).toHaveText('6h/d')
        await page
          .locator(`[data-test="member-actions-${E2E_MEMBER}"] [data-test="resume-wage-button"]`)
          .click()
        await expect(page.getByText('Wage enabled successfully', { exact: true })).toBeVisible()
      } finally {
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

test.describe(
  '[US-PAYROLL-004/005/006/007] Integrated weekly claim preparation',
  {
    tag: ['@US-PAYROLL-004', '@US-PAYROLL-005', '@US-PAYROLL-006', '@US-PAYROLL-007', '@integrated']
  },
  () => {
    test.setTimeout(300_000)

    /**
     * Covers:
     * - [AC-US-PAYROLL-004-01]
     * - [AC-US-PAYROLL-005-01]
     * - [AC-US-PAYROLL-006-01]
     * - [AC-US-PAYROLL-007-01]
     */
    test('saves goals and leaves a persisted, edited daily claim', async ({ browser, page }) => {
      const memberContext = await browser.newContext()
      const memberPage = await memberContext.newPage()
      await useWallet(memberPage, E2E_MEMBER_PRIVATE_KEY)
      await signInToRealStack(memberPage)
      await memberContext.close()

      const company = await createOperationalCompany(page)

      try {
        await page.locator('[data-test="skip-safe-setup-button"]').click()
        await addRealCompanyMember(page, company.teamId, E2E_MEMBER)
        await setMemberUsdcWage(page, E2E_MEMBER, {
          weeklyCap: '16',
          dailyCap: '8',
          hourlyRate: '1'
        })

        const claimsContext = await browser.newContext()
        const claimsPage = await claimsContext.newPage()
        await useWallet(claimsPage, E2E_MEMBER_PRIVATE_KEY)
        await signInToRealStack(claimsPage)
        await openMemberPayrollHistory(claimsPage, company.teamId, E2E_MEMBER)
        await saveWeeklyGoals(claimsPage, 'Ship the Payroll E2E journey.')
        await submitDailyClaim(claimsPage, { hours: '2', memo: 'Initial Payroll claim' })

        const dailyBreakdown = claimsPage.locator('[data-test="daily-breakdown"]')
        await dailyBreakdown.locator('[data-test="edit-claim-button"]').click()
        const edit = claimsPage.getByRole('dialog', { name: 'Edit Claim' })
        await edit.locator('[data-test="hours-worked-input"]').fill('3')
        await edit.locator('[data-test="memo-input"]').fill('Edited Payroll claim')
        await edit.locator('[data-test="update-claim-button"]').click()
        await expect(
          claimsPage.getByText('Claim updated successfully', { exact: true })
        ).toBeVisible()
        await expect(
          dailyBreakdown.getByText('Edited Payroll claim', { exact: true })
        ).toBeVisible()

        await dailyBreakdown.locator('[data-test="delete-claim-button"]').click()
        const deletion = claimsPage.getByRole('dialog', { name: 'Delete Claim' })
        await deletion.locator('[data-test="confirm-delete-claim-button"]').click()
        await expect(
          claimsPage.getByText('Claim deleted successfully', { exact: true })
        ).toBeVisible()

        await submitDailyClaim(claimsPage, { hours: '3', memo: 'Final Payroll claim' })
        await expect(dailyBreakdown.getByText('Final Payroll claim', { exact: true })).toBeVisible()
        await expect(dailyBreakdown).toContainText('3h')
        await claimsContext.close()
      } finally {
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

test.describe(
  '[US-PAYROLL-008/009/010/011/012] Integrated payment lifecycle',
  {
    tag: [
      '@US-PAYROLL-008',
      '@US-PAYROLL-009',
      '@US-PAYROLL-010',
      '@US-PAYROLL-011',
      '@US-PAYROLL-012',
      '@integrated'
    ]
  },
  () => {
    test.setTimeout(360_000)

    /**
     * Covers:
     * - [AC-US-PAYROLL-008-01]
     * - [AC-US-PAYROLL-009-01]
     * - [AC-US-PAYROLL-010-01]
     * - [AC-US-PAYROLL-011-01]
     * - [AC-US-PAYROLL-012-01]
     */
    test('approves, controls, pays and reloads one completed-week claim', async ({
      browser,
      page
    }) => {
      const memberBootstrap = await browser.newContext()
      const bootstrapPage = await memberBootstrap.newPage()
      await useWallet(bootstrapPage, E2E_MEMBER_PRIVATE_KEY)
      await signInToRealStack(bootstrapPage)
      await memberBootstrap.close()

      const company = await createOperationalCompany(page)

      try {
        await page.locator('[data-test="skip-safe-setup-button"]').click()
        await addRealCompanyMember(page, company.teamId, E2E_MEMBER)
        await setMemberUsdcWage(page, E2E_MEMBER, {
          weeklyCap: '8',
          dailyCap: '8',
          hourlyRate: '1'
        })
        const cashRemuneration = await fundCashRemuneration(page, company.teamId, '3')
        await expect.poll(() => tokenBalance(usdc, cashRemuneration)).toBe(parseUnits('3', 6))

        const paidWeek = completedWeekStart()
        const memberContext = await browser.newContext()
        const memberPage = await memberContext.newPage()
        await useWallet(memberPage, E2E_MEMBER_PRIVATE_KEY)
        await signInToRealStack(memberPage)
        await openMemberPayrollHistory(memberPage, company.teamId, E2E_MEMBER)
        await selectHistoryWeek(memberPage, paidWeek)
        await submitDailyClaim(memberPage, { hours: '2', memo: 'Completed Payroll claim' })
        await expect(memberPage.locator('[data-test="daily-breakdown"]')).toContainText('2h')

        await page.goto(`/teams/${company.teamId}/accounts/team-payroll`)
        const weeklyClaims = page.locator('[data-test="weekly-claims-table"]')
        await expect(weeklyClaims).toContainText('Pending')
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
        await expect
          .poll(() => wageClaimState(cashRemuneration, signedClaim.signature))
          .toEqual({
            disabled: false,
            paid: false
          })

        await weeklyClaims.locator('[data-test="weekly-claim-actions-button"]').click()
        await page.locator('[data-test="signed-disable"] a').click()
        await expect(page.getByText('Claim disabled', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect
          .poll(() => wageClaimState(cashRemuneration, signedClaim.signature))
          .toEqual({
            disabled: true,
            paid: false
          })

        await weeklyClaims.locator('[data-test="weekly-claim-actions-button"]').click()
        await page.locator('[data-test="enable-action"]').click()
        await expect(page.getByText('Claim enabled', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect
          .poll(() => wageClaimState(cashRemuneration, signedClaim.signature))
          .toEqual({
            disabled: false,
            paid: false
          })

        await openMemberPayrollHistory(memberPage, company.teamId, E2E_MEMBER)
        await selectHistoryWeek(memberPage, paidWeek)
        const memberUsdcBefore = await tokenBalance(usdc, E2E_MEMBER)
        await memberPage.locator('[data-test="withdraw-button"]').click()
        await expect(memberPage.getByText('Claim withdrawn', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect
          .poll(() => tokenBalance(usdc, E2E_MEMBER))
          .toBe(memberUsdcBefore + parseUnits('2', 6))
        await expect
          .poll(() => wageClaimState(cashRemuneration, signedClaim.signature))
          .toEqual({
            disabled: false,
            paid: true
          })

        await memberPage.reload()
        await selectHistoryWeek(memberPage, paidWeek)
        await expect(memberPage.getByText('You have withdrawn your weekly claim.')).toBeVisible()
        await page.reload()
        await expect(weeklyClaims).toContainText('Withdrawn')
        await memberContext.close()
      } finally {
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

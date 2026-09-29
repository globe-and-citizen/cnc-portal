import { expect, test } from '../fixtures/integrated'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY } from '../e2e-chain'
import {
  openMemberPayrollHistory,
  saveWeeklyGoals,
  setMemberUsdcWage,
  submitDailyClaim
} from './payroll-page'

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
     * - [AC-US-PAYROLL-002-03]
     */
    test('replaces, pauses and resumes one member wage through the Payroll UI', async ({
      authenticatedPage: page,
      walletPage,
      operationalTeam
    }) => {
      const company = await operationalTeam({ memberPrivateKeys: [E2E_MEMBER_PRIVATE_KEY] })
      const memberPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)

      await page.goto(`/teams/${company.teamId}`)
      await expect(page).toHaveURL(new RegExp(`/teams/${company.teamId}$`))
      await openMemberPayrollHistory(memberPage, company.teamId, E2E_MEMBER)
      await expect(memberPage.locator('[data-test="submit-claim-disabled-button"]')).toBeDisabled()
      await expect(
        memberPage.locator('[data-test="submit-weekly-goals-disabled-button"]')
      ).toBeDisabled()

      await setMemberUsdcWage(page, company.teamId, E2E_MEMBER, {
        weeklyCap: '12',
        dailyCap: '4',
        hourlyRate: '1'
      })
      await setMemberUsdcWage(page, company.teamId, E2E_MEMBER, {
        weeklyCap: '16',
        dailyCap: '6',
        hourlyRate: '2'
      })

      const memberActions = page.locator(`[data-test="member-actions-${E2E_MEMBER}"]`)
      await memberActions.locator('[data-test="pause-wage-button"]').click()
      await expect(page.getByText('Wage disabled successfully', { exact: true })).toBeVisible()
      await expect(memberActions.locator('[data-test="resume-wage-button"]')).toBeVisible()

      await openMemberPayrollHistory(memberPage, company.teamId, E2E_MEMBER)
      await memberPage.locator('[data-test="modal-submit-hours-button"]').click()
      const pausedWageClaim = memberPage.getByRole('dialog', { name: 'Submit Claim' })
      await pausedWageClaim.locator('[data-test="hours-worked-input"]').fill('1')
      await pausedWageClaim.locator('[data-test="memo-input"]').fill('Paused wage claim')
      await pausedWageClaim.locator('[data-test="submit-claim-button"]').click()
      await expect(pausedWageClaim.locator('[data-test="claim-error-alert"]')).toContainText(
        'Cannot add claim: the wage is disabled'
      )

      await page.reload()
      await expect(page.locator('[data-test="daily-cap-badge"]')).toHaveText('6h/d')
      await page
        .locator(`[data-test="member-actions-${E2E_MEMBER}"] [data-test="resume-wage-button"]`)
        .click()
      await expect(page.getByText('Wage enabled successfully', { exact: true })).toBeVisible()
      await openMemberPayrollHistory(memberPage, company.teamId, E2E_MEMBER)
      await submitDailyClaim(memberPage, { hours: '1', memo: 'Resumed wage claim' })
      await expect(memberPage.locator('[data-test="daily-breakdown"]')).toContainText(
        'Resumed wage claim'
      )
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
    test('saves goals and leaves a persisted, edited daily claim', async ({
      authenticatedPage: page,
      walletPage,
      operationalTeam
    }) => {
      const company = await operationalTeam({ memberPrivateKeys: [E2E_MEMBER_PRIVATE_KEY] })
      const claimsPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)

      await page.goto(`/teams/${company.teamId}`)
      await expect(page).toHaveURL(new RegExp(`/teams/${company.teamId}$`))
      await setMemberUsdcWage(page, company.teamId, E2E_MEMBER, {
        weeklyCap: '16',
        dailyCap: '8',
        hourlyRate: '1'
      })

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
      await expect(dailyBreakdown.getByText('Edited Payroll claim', { exact: true })).toBeVisible()

      await dailyBreakdown.locator('[data-test="delete-claim-button"]').click()
      const deletion = claimsPage.getByRole('dialog', { name: 'Delete Claim' })
      await deletion.locator('[data-test="confirm-delete-claim-button"]').click()
      await expect(
        claimsPage.getByText('Claim deleted successfully', { exact: true })
      ).toBeVisible()

      await submitDailyClaim(claimsPage, { hours: '3', memo: 'Final Payroll claim' })
      await expect(dailyBreakdown.getByText('Final Payroll claim', { exact: true })).toBeVisible()
      await expect(dailyBreakdown).toContainText('3h')
    })

    test('keeps a valid claim while rejecting daily and weekly cap overages', async ({
      authenticatedPage: page,
      walletPage,
      operationalTeam
    }) => {
      const company = await operationalTeam({ memberPrivateKeys: [E2E_MEMBER_PRIVATE_KEY] })
      const claimsPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)

      await page.goto(`/teams/${company.teamId}`)
      await expect(page).toHaveURL(new RegExp(`/teams/${company.teamId}$`))
      await setMemberUsdcWage(page, company.teamId, E2E_MEMBER, {
        weeklyCap: '3',
        dailyCap: '8',
        hourlyRate: '1'
      })

      await openMemberPayrollHistory(claimsPage, company.teamId, E2E_MEMBER)
      await submitDailyClaim(claimsPage, { hours: '2', memo: 'Claim inside both caps' })
      await expect(claimsPage.locator('[data-test="daily-breakdown"]')).toContainText('2h')

      await claimsPage.locator('[data-test="modal-submit-hours-button"]').click()
      const overage = claimsPage.getByRole('dialog', { name: 'Submit Claim' })
      await overage.locator('[data-test="hours-worked-input"]').fill('7')
      await overage.locator('[data-test="memo-input"]').fill('Daily overage')
      await overage.locator('[data-test="submit-claim-button"]').click()
      await expect(overage).toContainText('Daily limit would be exceeded')

      await overage.locator('[data-test="hours-worked-input"]').fill('2')
      await overage.locator('[data-test="memo-input"]').fill('Weekly overage')
      await overage.locator('[data-test="submit-claim-button"]').click()
      await expect(overage.locator('[data-test="claim-error-alert"]')).toContainText(
        'weekly hours limit would be exceeded'
      )
      await expect(claimsPage.locator('[data-test="daily-breakdown"]')).toContainText('2h')
    })
  }
)

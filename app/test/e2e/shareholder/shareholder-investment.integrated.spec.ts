import { expect, test } from '../fixtures'
import { E2E_OWNER, publicClient } from '../e2e-chain'
import {
  createOperationalCompany,
  deleteCompanyThroughUi,
  deploySafeThroughUi
} from '../company/real-company-page'
import {
  depositedEvents,
  routerState,
  safeUsdcBalance,
  shareholderFixtureFromTeam,
  shareholderPosition
} from './shareholder-chain'
import {
  configureShareholderInvestment,
  investThroughSafe,
  openRealShareholderManagement
} from './shareholder-page'

test.describe(
  '[US-SHER-001/003/005] Integrated shareholder investment lifecycle',
  {
    tag: ['@US-SHER-001', '@US-SHER-003', '@US-SHER-005', '@integrated']
  },
  () => {
    test.setTimeout(300_000)

    /**
     * Covers:
     * - [AC-US-SHER-001-01]
     * - [AC-US-SHER-001-02]
     * - [AC-US-SHER-001-03]
     * - [AC-US-SHER-001-04]
     * - [AC-US-SHER-003-01]
     * - [AC-US-SHER-003-02]
     * - [AC-US-SHER-003-03]
     * - [AC-US-SHER-003-04]
     * - [AC-US-SHER-005-01]
     * - [AC-US-SHER-005-02]
     * - [AC-US-SHER-005-03]
     * - [AC-US-SHER-005-05]
     */
    test('configures the router, invests and reloads the real shareholder position', async ({
      page
    }) => {
      const company = await createOperationalCompany(page)

      try {
        const registeredSafe = await deploySafeThroughUi(page, company.teamId)
        const team = await openRealShareholderManagement(page, company.teamId)
        const fixture = await shareholderFixtureFromTeam(team)

        expect(fixture.safe.toLowerCase()).toBe(registeredSafe.address.toLowerCase())
        expect(await routerState(fixture)).toEqual({
          depositsEnabled: false,
          multiplier: 1_000_000n,
          owner: E2E_OWNER,
          safeAddress: E2E_OWNER
        })
        expect(await shareholderPosition(fixture)).toEqual({
          balance: 0n,
          shareholders: [],
          symbol: 'E2E',
          totalSupply: 0n
        })

        await expect(page.locator('[data-test="invest-in-safe-button"]')).toBeDisabled()
        await configureShareholderInvestment(page)
        await expect
          .poll(async () => {
            const state = await routerState(fixture)
            return { ...state, safeAddress: state.safeAddress.toLowerCase() }
          })
          .toEqual({
            depositsEnabled: true,
            multiplier: 2_000_000n,
            owner: E2E_OWNER,
            safeAddress: fixture.safe.toLowerCase()
          })

        const safeBalanceBefore = await safeUsdcBalance(fixture)
        const nonceBeforeInvestment = await publicClient.getTransactionCount({ address: E2E_OWNER })
        await investThroughSafe(page, '10')
        await expect
          .poll(() => publicClient.getTransactionCount({ address: E2E_OWNER }))
          .toBe(nonceBeforeInvestment + 2)
        await expect.poll(() => safeUsdcBalance(fixture)).toBe(safeBalanceBefore + 10_000_000n)
        await expect
          .poll(() => shareholderPosition(fixture))
          .toEqual({
            balance: 20_000_000n,
            shareholders: [{ shareholder: E2E_OWNER, amount: 20_000_000n }],
            symbol: 'E2E',
            totalSupply: 20_000_000n
          })

        const deposits = await depositedEvents(fixture)
        expect(deposits).toHaveLength(1)
        expect(deposits[0]?.args).toMatchObject({
          depositor: E2E_OWNER,
          token: fixture.usdc,
          tokenAmount: 10_000_000n,
          sherAmount: 20_000_000n
        })

        await page.reload()
        await expect(page.getByText('1 Investors', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect(page.getByText('20 E2E', { exact: true })).toHaveCount(3)
        await expect(page.getByText('100.00%', { exact: true })).toBeVisible()
        await expect(page.getByText('0xf39F...2266', { exact: true })).toBeVisible()

        const history = page.locator('[data-test="investor-transactions"]')
        await expect(history.getByText('Safe address updated', { exact: true })).toBeVisible()
        await expect(history.getByText('Multiplier updated', { exact: true })).toBeVisible()
        await expect(history.getByText('Safe deposits enabled', { exact: true })).toBeVisible()
        await expect(history.getByText('Safe deposit', { exact: true })).toBeVisible()
        await expect(history.getByText('Shares minted', { exact: true })).toBeVisible()
        await history.locator('[data-test="investor-transaction-detail-button"]').last().click()
        await expect(page.getByText('Transaction detail', { exact: true })).toBeVisible()
        await page
          .getByRole('dialog', { name: 'Transaction detail' })
          .getByRole('button', { name: 'Close', exact: true })
          .last()
          .click()

        await history.locator('[data-test="investor-transaction-history-type-filter"]').click()
        await page.getByRole('option', { name: 'Safe deposit', exact: true }).click()
        await expect(
          history.locator('tbody').getByText('Safe deposit', { exact: true })
        ).toHaveCount(1)
        await expect(
          history.locator('tbody').getByText('Shares minted', { exact: true })
        ).toHaveCount(0)

        await history
          .locator('[data-test="investor-transaction-history-date-select"] button')
          .click()
        await page.locator('[data-test="date-picker-month-previous"]').click()
        await expect(history.getByText('No data', { exact: true })).toBeVisible()
      } finally {
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

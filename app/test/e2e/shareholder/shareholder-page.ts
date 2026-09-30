import { expect, type Page } from '@playwright/test'
import type { Team } from '../../../src/types/team'
import type { CreateOfficerResponse } from '../../../src/queries/contract.queries'
import type { InvestorMigration } from '../../../src/queries/investorMigration.queries'
import type { Address } from 'viem'
import { dialogAmount, openAccountFromSidebar, selectToken } from '../e2e-page'

export interface OfficerMigrationRedeployment {
  migration: InvestorMigration
  officer: CreateOfficerResponse
}

export async function openRealShareholderManagement(page: Page, teamId: string): Promise<Team> {
  const teamResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/teams/${teamId}`
  )
  await page.goto(`/teams/${teamId}/sher-token`)
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/sher-token$`))
  const response = await teamResponse
  expect(response.ok()).toBe(true)

  const token = await page.evaluate(() => localStorage.getItem('authToken'))
  expect(token).toBeTruthy()
  const teamReadback = await page.request.get(response.url(), {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(teamReadback.ok()).toBe(true)
  return teamReadback.json() as Promise<Team>
}

export async function configureShareholderInvestment(page: Page): Promise<void> {
  const setSafe = page.locator('[data-test="set-safe-address-button"]')
  await expect(setSafe).toBeEnabled({ timeout: 30_000 })
  await setSafe.click()
  await expect(page.getByText('Safe address updated successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
  await expect(setSafe).toBeDisabled()

  await page.locator('[data-test="set-compensation-multiplier-button"]').click()
  const multiplierDialog = page.getByRole('dialog', {
    name: 'Set SHER Compensation Multiplier'
  })
  await multiplierDialog.locator('[data-test="multiplier-input"]').fill('2')
  await multiplierDialog.locator('[data-test="confirm-button"]').click()
  await expect(
    page.getByText('Multiplier updated successfully to 2x', { exact: true })
  ).toBeVisible({
    timeout: 30_000
  })

  const toggle = page.locator('[data-test="toggle-sher-compensation-button"]')
  await expect(toggle).toBeEnabled({ timeout: 30_000 })
  await toggle.click()
  await expect(
    page.getByText('SHER compensation enabled successfully', { exact: true })
  ).toBeVisible({ timeout: 30_000 })
  await expect(toggle).toContainText('Disable SHER Compensation')
}

export async function investThroughSafe(page: Page, amount: string): Promise<void> {
  const action = page.locator('[data-test="invest-in-safe-button"]')
  await expect(action).toBeEnabled({ timeout: 30_000 })
  await action.click()

  const dialog = page.getByRole('dialog', { name: 'Invest in Safe' })
  await expect(dialog).toBeVisible()
  await dialog.locator('[data-test="amountInput"]').fill(amount)
  await expect(dialog.locator('[data-test="compensation-input"]')).toHaveValue('20')
  await dialog.locator('[data-test="deposit-button"]').click()
  await expect(
    page.getByText(`Successfully deposited ${amount} USDC and minted 20 E2E tokens`, {
      exact: true
    })
  ).toBeVisible({ timeout: 60_000 })
  await expect(dialog).toBeHidden()
}

export async function issueShares(page: Page, recipient: Address, amount: string): Promise<void> {
  const action = page.locator('[data-test="mint-button"]')
  await expect(action).toBeEnabled({ timeout: 30_000 })
  await action.click()

  const dialog = page.getByRole('dialog', { name: 'Issue E2E tokens' })
  await dialog.locator('[data-test="member-contracts-address-input"]').fill(recipient)
  const recipientRow = dialog
    .locator('[data-test="user-row"]')
    .filter({ hasText: `${recipient.slice(0, 6)}...${recipient.slice(-4)}` })
  await expect(recipientRow).toBeVisible()
  await recipientRow.click()
  await dialog.locator('[data-test="add-mode-button"]').click()
  await dialog.locator('[data-test="amount-input"]').fill(amount)
  await expect(dialog.locator('[data-test="submit-button"]')).toBeEnabled()
  await dialog.locator('[data-test="submit-button"]').click()

  await expect(page.getByText('Tokens issued successfully', { exact: true }).last()).toBeVisible({
    timeout: 30_000
  })
  await expect(dialog).toBeHidden()
}

export async function redeployOfficerWithMigration(
  page: Page,
  teamId: string,
  name: string,
  symbol: string
): Promise<OfficerMigrationRedeployment> {
  await page.goto(`/teams/${teamId}/contract-management`)
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/contract-management$`))
  const action = page.locator('[data-test="createAddCampaign"]')
  await expect(action).toBeEnabled({ timeout: 30_000 })
  await action.click()

  const dialog = page.getByRole('dialog', { name: 'Redeploy Officer Contract' })
  await expect(dialog).toBeVisible()
  await dialog.locator('[data-test="redeploy-share-name-input"]').fill(name)
  await dialog.locator('[data-test="redeploy-share-symbol-input"]').fill(symbol)

  const officerRegistered = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/contract/officer'
  )
  const migrationPersisted = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/investor-migration'
  )
  await dialog.locator('[data-test="confirm-redeploy-contracts"]').click()

  const [officerResponse, migrationResponse] = await Promise.all([
    officerRegistered,
    migrationPersisted
  ])
  expect(officerResponse.ok()).toBe(true)
  expect(migrationResponse.ok()).toBe(true)
  await expect(
    page.getByText('Officer redeployed and contracts synced', { exact: true }).last()
  ).toBeVisible({ timeout: 120_000 })
  await expect(dialog).toBeHidden()

  return {
    officer: (await officerResponse.json()) as CreateOfficerResponse,
    migration: (await migrationResponse.json()) as InvestorMigration
  }
}

export async function readMigrationSnapshots(
  page: Page,
  teamId: string
): Promise<InvestorMigration[]> {
  const migrationLoaded = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/investor-migration' &&
      url.searchParams.get('teamId') === teamId
    )
  })
  await page.reload()
  const response = await migrationLoaded
  expect(response.ok()).toBe(true)
  return response.json() as Promise<InvestorMigration[]>
}

export async function claimMigratedShares(page: Page, expectedAmount: string): Promise<void> {
  const amount = page.locator('[data-test="claim-amount-input"]')
  await expect(amount).toHaveValue(expectedAmount, { timeout: 30_000 })
  const action = page.locator('[data-test="claim-button"]')
  await expect(action).toBeEnabled()
  await action.click()
  await expect(page.getByText('Shares claimed!', { exact: true }).last()).toBeVisible({
    timeout: 60_000
  })
}

export async function dispatchRemainingMigrationClaims(page: Page): Promise<void> {
  const action = page.locator('[data-test="dispatch-button"]')
  await expect(action).toBeEnabled({ timeout: 30_000 })
  await action.click()
  await expect(page.getByText('Claims dispatched!', { exact: true }).last()).toBeVisible({
    timeout: 60_000
  })
}

export async function completeShareholderMigration(page: Page): Promise<void> {
  const action = page.locator('[data-test="complete-migration-button"]')
  await expect(action).toBeEnabled({ timeout: 30_000 })
  await action.click()
  await expect(page.getByText('Migration completed!', { exact: true }).last()).toBeVisible({
    timeout: 60_000
  })
}

export async function fundBankWithUsdc(page: Page, teamId: string, amount: string): Promise<void> {
  await openAccountFromSidebar(page, `/teams/${teamId}/accounts/bank-account`)
  await page.getByRole('button', { name: 'Deposit', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
  await selectToken(page, dialog, 'USDC')
  await dialogAmount(dialog).fill(amount)
  await dialog.locator('[data-test="deposit-button"]').click()
  await expect(page.getByText('USDC deposited successfully', { exact: true })).toBeVisible({
    timeout: 60_000
  })
  await expect(dialog).toBeHidden()
}

export async function distributeUsdcDividends(page: Page, amount: string): Promise<void> {
  const action = page.locator('[data-test="pay-dividends-button"]')
  await expect(action).toBeEnabled({ timeout: 30_000 })
  await action.click()

  const dialog = page.getByRole('dialog', { name: 'Pay Dividends to the shareholders' })
  await selectToken(page, dialog, 'USDC')
  await dialogAmount(dialog).fill(amount)
  await dialog.locator('[data-test="pay-dividends-submit-button"]').click()
  await expect(dialog).toBeHidden({ timeout: 60_000 })
}

export async function approvePendingBankDividend(page: Page, teamId: string): Promise<void> {
  await page.goto(`/teams/${teamId}/contract-management`)
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/contract-management$`))

  const reviewButton = page.getByRole('button', { name: /\d+ Review/ }).first()
  await expect(reviewButton).toBeEnabled({ timeout: 30_000 })
  await reviewButton.click()

  const dialog = page.getByRole('dialog', { name: 'Review Pending Actions' })
  await expect(dialog).toBeVisible()
  const dividendAction = dialog.getByRole('row').filter({ hasText: /Pay dividends of/ })
  await expect(dividendAction).toHaveCount(1)
  await dividendAction.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(dialog.getByText('Board Approval Required', { exact: true })).toBeVisible()

  const actionUpdated = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return response.request().method() === 'PATCH' && /^\/api\/actions\/\d+$/.test(url.pathname)
  })
  await dialog.getByRole('button', { name: 'Approve Action', exact: true }).click()
  expect((await actionUpdated).ok()).toBe(true)
  await expect(dialog).toBeHidden({ timeout: 60_000 })
}

import { expect, type Page } from '@playwright/test'
import type { Team } from '../../../src/types/team'
import type { Address } from 'viem'
import { dialogAmount, openAccountFromSidebar, selectToken } from '../e2e-page'

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

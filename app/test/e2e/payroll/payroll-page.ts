// Payroll page operations shared by the full-stack journeys. Every mutation
// is made through the browser; helpers only sequence the visible product UI.
import { expect, type Locator, type Page } from '@playwright/test'
import type { Address } from 'viem'
import { dialogAmount, openAccountFromSidebar, selectToken } from '../e2e-page'

const addressFrom = async (selector: Locator): Promise<Address> => {
  const text = await selector.textContent()
  const [address] = text?.match(/0x[a-fA-F0-9]{40}/) ?? []
  if (!address)
    throw new Error('Expected the Cash Remuneration contract address in the Payroll view')
  return address as Address
}

const isEnabled = async (control: Locator): Promise<boolean> => {
  const [ariaChecked, dataState] = await Promise.all([
    control.getAttribute('aria-checked'),
    control.getAttribute('data-state')
  ])
  return ariaChecked === 'true' || dataState === 'checked'
}

export async function setMemberUsdcWage(
  page: Page,
  memberAddress: Address,
  options: { dailyCap: string; hourlyRate: string; weeklyCap: string }
): Promise<void> {
  const actions = page.locator(`[data-test="member-actions-${memberAddress}"]`)
  await actions.locator('[data-test="set-wage-button"]').click()

  const dialog = page.getByRole('dialog', { name: /Set Wage for/i })
  await expect(dialog).toBeVisible()
  await dialog.locator('[data-test="weekly-cap-input"]').fill(options.weeklyCap)
  await dialog.locator('[data-test="daily-cap-input"]').fill(options.dailyCap)

  const usdcEnabled = dialog.locator('[data-test="rate-usdc-enabled"]')
  if (!(await isEnabled(usdcEnabled))) await usdcEnabled.click()
  await dialog.locator('[data-test="rate-usdc-amount"]').fill(options.hourlyRate)
  await dialog.locator('[data-test="add-wage-button"]').click()
  await expect(page.getByText('Wage updated successfully', { exact: true })).toBeVisible()
}

export async function openMemberPayrollHistory(
  page: Page,
  teamId: string,
  memberAddress: Address
): Promise<void> {
  await page.goto(`/teams/${teamId}/accounts/members/${memberAddress}/payroll-history`)
  await expect(page.locator('[data-test="week-navigator"]')).toBeVisible()
}

/** Select a completed ISO week without mutating time or product data. */
export async function selectHistoryWeek(page: Page, weekStart: Date): Promise<void> {
  const now = new Date()
  const monthChanged =
    weekStart.getUTCFullYear() !== now.getUTCFullYear() ||
    weekStart.getUTCMonth() !== now.getUTCMonth()
  if (monthChanged) await page.locator('[data-test="prev-month"]').click()

  const weekIso = weekStart.toISOString()
  await page.locator(`[data-test="week-${weekIso}"]`).click()
  await expect(page.locator('[data-test="daily-breakdown"]')).toBeVisible()
}

export async function saveWeeklyGoals(page: Page, goals: string): Promise<void> {
  await page.locator('[data-test="submit-weekly-goals-button"]').click()
  const dialog = page.getByRole('dialog', { name: 'Weekly Goals' })
  await dialog.locator('[data-test="markdown-editor-tab-markdown"]').click()
  await dialog.locator('[data-test="markdown-editor-source"]').fill(goals)
  await dialog.locator('[data-test="submit-weekly-goals-confirm"]').click()
  await expect(page.getByText('Weekly goals saved successfully', { exact: true })).toBeVisible()
}

export async function submitDailyClaim(
  page: Page,
  options: { hours: string; memo: string }
): Promise<void> {
  await page.locator('[data-test="modal-submit-hours-button"]').click()
  const dialog = page.getByRole('dialog', { name: 'Submit Claim' })
  await dialog.locator('[data-test="hours-worked-input"]').fill(options.hours)
  await dialog.locator('[data-test="memo-input"]').fill(options.memo)
  await dialog.locator('[data-test="submit-claim-button"]').click()
  await expect(page.getByText('Wage claim added successfully', { exact: true })).toBeVisible()
}

export async function fundCashRemuneration(
  page: Page,
  teamId: string,
  amount: string
): Promise<Address> {
  await openAccountFromSidebar(page, `/teams/${teamId}/accounts/bank-account`)
  await page.getByRole('button', { name: 'Deposit', exact: true }).click()
  const deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
  await selectToken(page, deposit, 'USDC')
  await dialogAmount(deposit).fill(amount)
  await deposit.locator('[data-test="deposit-button"]').click()
  await expect(page.getByText('USDC deposited successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })

  await page.locator('[data-test="transfer-button"]').click()
  const transfer = page.getByRole('dialog', { name: 'Transfer from Bank Contract' })
  await transfer.getByPlaceholder('Name').fill('CashRemunerationEIP712')
  await transfer
    .locator('[data-test="contract-row"]')
    .filter({ hasText: 'CashRemunerationEIP712' })
    .click()
  await selectToken(page, transfer, 'USDC')
  await dialogAmount(transfer).fill(amount)
  await transfer.locator('[data-test="transferButton"]').click()
  await expect(page.getByText('Transferred successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })

  return getCashRemunerationAddress(page, teamId)
}

/** Read the Payroll contract address through the visible account page. */
export async function getCashRemunerationAddress(page: Page, teamId: string): Promise<Address> {
  await openAccountFromSidebar(page, `/teams/${teamId}/accounts/payroll-account`)
  return addressFrom(page.locator('[data-test="cash-remuneration-contract-address"]'))
}

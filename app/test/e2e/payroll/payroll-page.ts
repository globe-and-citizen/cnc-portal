// Payroll page operations shared by the full-stack journeys. Every mutation
// is made through the browser; helpers only sequence the visible product UI.
import { expect, type Locator, type Page } from '@playwright/test'
import type { Address } from 'viem'
import { formatUnits, parseUnits } from 'viem'
import { dialogAmount, openAccountFromSidebar, selectToken } from '../e2e-page'
import { grossForNet } from '../bank/bank-chain'

const BANK_FEE_BPS = 50n

/** A status refresh can keep the existing dropdown open after an action. */
export async function openWeeklyClaimActions(
  page: Page,
  table: Locator,
  action: string
): Promise<Locator> {
  const menuAction = page.locator(`[data-test="${action}"]`)
  if (!(await menuAction.isVisible())) {
    await table.locator('[data-test="weekly-claim-actions-button"]').click()
  }
  await expect(menuAction).toBeVisible()
  return menuAction
}

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

async function selectFundingAsset(page: Page, dialog: Locator, asset: 'USDC' | 'native') {
  if (asset === 'USDC') return selectToken(page, dialog, 'USDC')
  await dialog.locator('[data-test="tokenSelect"]').click()
  // Bank offers USDC, USDCe and the configured native token. Select its visible
  // option without assuming an ETH label or retaining a previous USDC choice.
  const nativeOption = page.getByRole('option').filter({ hasNotText: /USDC/ })
  await expect(nativeOption).toHaveCount(1)
  await nativeOption.click()
}

export async function setMemberUsdcWage(
  page: Page,
  memberAddress: Address,
  options: {
    dailyCap: string
    hourlyRate: string
    weeklyCap: string
    nativeRate?: string
    sherRate?: string
  }
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
  for (const [token, rate] of [
    ['native', options.nativeRate],
    ['sher', options.sherRate]
  ]) {
    if (!rate) continue
    const enabled = dialog.locator(`[data-test="rate-${token}-enabled"]`)
    if (!(await isEnabled(enabled))) await enabled.click()
    await dialog.locator(`[data-test="rate-${token}-amount"]`).fill(rate)
  }
  await dialog.locator('[data-test="add-wage-button"]').click()
  await expect(page.getByText('Wage updated successfully', { exact: true })).toBeVisible()
}

export async function openMemberPayrollHistory(
  page: Page,
  teamId: string,
  memberAddress: Address
): Promise<void> {
  await page.goto(`/teams/${teamId}/accounts/members/${memberAddress}/payroll-history`)
  await expect(page.locator('[data-test="week-navigator"]')).toBeVisible({ timeout: 30_000 })
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
  amount: string,
  asset: 'USDC' | 'native' = 'USDC'
): Promise<Address> {
  await openAccountFromSidebar(page, `/teams/${teamId}/accounts/bank-account`)
  await page.getByRole('button', { name: 'Deposit', exact: true }).click()
  const deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
  await selectFundingAsset(page, deposit, asset)
  const decimals = asset === 'USDC' ? 6 : 18
  const reserve = asset === 'native' ? parseUnits('0.000001', 18) : 1n
  const grossAmount = formatUnits(
    grossForNet(parseUnits(amount, decimals), BANK_FEE_BPS) + reserve,
    decimals
  )
  await dialogAmount(deposit).fill(grossAmount)
  const depositButton = deposit.locator('[data-test="deposit-button"]')
  await expect(depositButton).toBeEnabled()
  await depositButton.click()
  await expect(page.getByText(/deposited successfully$/)).toBeVisible({
    timeout: 30_000
  })

  await page.locator('[data-test="transfer-button"]').click()
  const transfer = page.getByRole('dialog', { name: 'Transfer from Bank Contract' })
  await transfer.getByPlaceholder('Name').fill('CashRemunerationEIP712')
  await transfer
    .locator('[data-test="contract-row"]')
    .filter({ hasText: 'CashRemunerationEIP' })
    .click()
  await selectFundingAsset(page, transfer, asset)
  await dialogAmount(transfer).fill(amount)
  await transfer.locator('[data-test="transferButton"]').click()
  const transferSuccess = page.getByText('Transferred successfully', { exact: true })
  const transferError = transfer.locator('[data-test="error-alert"], [data-slot="error"]')
  await expect
    .poll(
      async () =>
        (await transferSuccess.isVisible()) || (await transferError.isVisible().catch(() => false)),
      { timeout: 30_000 }
    )
    .toBe(true)
  if (!(await transferSuccess.isVisible())) {
    throw new Error(`Bank transfer failed: ${(await transferError.textContent())?.trim()}`)
  }

  return getCashRemunerationAddress(page, teamId)
}

/** Read the Payroll contract address through the visible account page. */
export async function getCashRemunerationAddress(page: Page, teamId: string): Promise<Address> {
  await openAccountFromSidebar(page, `/teams/${teamId}/accounts/payroll-account`)
  return addressFrom(page.locator('[data-test="cash-remuneration-contract-address"]'))
}

export async function assertPayrollAccountHoldings(
  page: Page,
  teamId: string,
  amounts: { native: string; usdc: string; memberReadOnly?: boolean }
): Promise<void> {
  await getCashRemunerationAddress(page, teamId)
  const holdings = page
    .getByRole('table')
    .filter({ has: page.getByRole('columnheader', { name: 'RANK', exact: true }) })
  await expect(
    holdings.getByRole('cell', { name: `${amounts.usdc} USDC`, exact: true })
  ).toBeVisible({ timeout: 30_000 })
  const nativeAmount = amounts.native.replace('.', '\\.')
  await expect(
    holdings.getByRole('cell', { name: new RegExp(`^${nativeAmount}\\s+`) })
  ).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-variant="success"] [data-test="amount"]')).toBeVisible()
  await expect(page.getByText('Total Balance', { exact: true })).toBeVisible()
  if (amounts.memberReadOnly) {
    await expect(page.locator('[data-test="owner-withdraw-button"]')).toHaveCount(0)
  }
}

export const completedWeekStart = (): Date => {
  const now = new Date()
  const utcDay = now.getUTCDay() || 7
  const currentMonday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  currentMonday.setUTCDate(currentMonday.getUTCDate() - utcDay + 1)
  currentMonday.setUTCDate(currentMonday.getUTCDate() - 7)
  return currentMonday
}

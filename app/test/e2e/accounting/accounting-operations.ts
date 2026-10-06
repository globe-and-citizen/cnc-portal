// The source operations the Accounting journey books. Each one is produced
// through the product exactly as a company would, never seeded, so the books are
// verified against behaviour the portal actually performed.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'
import { parseAbiItem, parseUnits, type Address, type Hex } from 'viem'
import { E2E_MEMBER, publicClient } from '../e2e-chain'
import { dialogAmount, openAccountFromSidebar, selectToken } from '../e2e-page'
import { chooseApprovalDate } from '../expense/expense-page'
import {
  requiredAddress,
  type DeploymentAddressManifest
} from '../factories/operational-team-deployment'
import { issueShares, openRealShareholderManagement } from '../shareholder/shareholder-page'
import {
  completedWeekStart,
  fundCashRemuneration,
  openMemberPayrollHistory,
  openWeeklyClaimActions,
  selectHistoryWeek,
  setMemberUsdcWage,
  submitDailyClaim
} from '../payroll/payroll-page'

/**
 * The USDC the integrated stack actually deployed. `E2E_USDC_ADDRESS` names the
 * browser-acceptance fixture, which the integrated deployment does not reproduce,
 * so an event filter built from it matches nothing on this chain.
 */
export const INTEGRATED_USDC: Address = requiredAddress(
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL('../../../src/artifacts/deployed_addresses/chain-31337.json', import.meta.url)
      ),
      'utf8'
    )
  ) as DeploymentAddressManifest,
  'MockTokens#USDC'
)

/**
 * Open Bank and wait for it to resolve the contract it is about to act on. The
 * deposit form's controls remount while the workspace is still settling on a
 * contract set, so a form driven before that races its own re-render.
 */
async function openSettledBank(page: Page, teamId: string): Promise<void> {
  await openAccountFromSidebar(page, `/teams/${teamId}/accounts/bank-account`)
  await expect(page.locator('[data-test="bank-contract-address"]')).toContainText(
    /0x[a-fA-F0-9]{40}/,
    { timeout: 60_000 }
  )
}

async function currentBankAddress(page: Page): Promise<Address> {
  const text = await page.locator('[data-test="bank-contract-address"]').textContent()
  const address = text?.match(/0x[a-fA-F0-9]{40}/)?.[0]
  if (!address) throw new Error('Expected the current Bank address')
  return address as Address
}

/** The same settling wait for the Expense Account's own contract-backed forms. */
async function openSettledExpenseAccount(page: Page, teamId: string): Promise<void> {
  await openAccountFromSidebar(page, `/teams/${teamId}/accounts/expense-account`)
  await expect(page.locator('[data-test="expense-account-address"]')).toContainText(
    /0x[a-fA-F0-9]{40}/,
    { timeout: 60_000 }
  )
}

/** Deposit USDC into Bank from the owner wallet — cash the company did not hold. */
export async function depositUsdcToBank(page: Page, teamId: string, amount: string): Promise<Hex> {
  await openSettledBank(page, teamId)
  const bankAddress = await currentBankAddress(page)
  const fromBlock = await publicClient.getBlockNumber()
  await page.getByRole('button', { name: 'Deposit', exact: true }).click()
  const deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
  await selectToken(page, deposit, 'USDC')
  await dialogAmount(deposit).fill(amount)
  await deposit.locator('[data-test="deposit-button"]').click()
  await expect(page.getByText('USDC deposited successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
  await expect(deposit).toBeHidden({ timeout: 30_000 })
  const logs = await publicClient.getLogs({
    address: bankAddress,
    event: parseAbiItem(
      'event TokenDeposited(address indexed depositor, address indexed token, uint256 amount)'
    ),
    args: { token: INTEGRATED_USDC },
    fromBlock: fromBlock + 1n,
    toBlock: 'latest'
  })
  const operationLogs = logs.filter((log) => log.args.amount === parseUnits(amount, 6))
  if (operationLogs.length !== 1 || !operationLogs[0]?.transactionHash) {
    throw new Error(`Expected one USDC deposit event for ${amount} on Bank ${bankAddress}`)
  }
  return operationLogs[0].transactionHash
}

/** Issue share tokens to the owner through the Share Token page. */
export async function issueSharesToOwner(
  page: Page,
  teamId: string,
  recipient: Address,
  amount: string
): Promise<void> {
  await openRealShareholderManagement(page, teamId)
  await issueShares(page, recipient, amount)
}

/** Move Bank cash into one of the company's own contracts. */
export async function fundContractFromBank(
  page: Page,
  teamId: string,
  contractName: string,
  amount: string
): Promise<{ address: Address; txHash: Hex }> {
  await openSettledBank(page, teamId)
  const bankAddress = await currentBankAddress(page)
  const fromBlock = await publicClient.getBlockNumber()
  await page.locator('[data-test="transfer-button"]').click()
  const transfer = page.getByRole('dialog', { name: 'Transfer from Bank Contract' })
  await transfer.getByPlaceholder('Name').fill(contractName)
  const row = transfer.locator('[data-test="contract-row"]').filter({ hasText: contractName })
  const testId = await row.locator('[data-test^="contract-dropdown-"]').getAttribute('data-test')
  const address = testId?.replace('contract-dropdown-', '')
  if (!address) throw new Error(`Expected an address for ${contractName}`)
  await row.click()
  await selectToken(page, transfer, 'USDC')
  await dialogAmount(transfer).fill(amount)
  await transfer.locator('[data-test="transferButton"]').click()
  await expect(page.getByText('Transferred successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
  const logs = await publicClient.getLogs({
    address: bankAddress,
    event: parseAbiItem(
      'event TokenTransfer(address indexed sender, address indexed to, address indexed token, uint256 amount)'
    ),
    args: { to: address as Address, token: INTEGRATED_USDC },
    fromBlock: fromBlock + 1n,
    toBlock: 'latest'
  })
  const operationLogs = logs.filter((log) => log.args.amount === parseUnits(amount, 6))
  if (operationLogs.length !== 1 || !operationLogs[0]?.transactionHash) {
    throw new Error(`Expected one USDC treasury funding event for ${amount} to ${address}`)
  }
  return { address: address as Address, txHash: operationLogs[0].transactionHash }
}

/**
 * Pay money out of Bank to an address the portal knows nothing about. Accounting
 * cannot attribute the movement, so it becomes the withdrawal the owner labels.
 */
export async function withdrawToExternalAddress(
  page: Page,
  teamId: string,
  recipient: Address,
  amount: string
): Promise<void> {
  await openSettledBank(page, teamId)
  await page.locator('[data-test="transfer-button"]').click()
  const transfer = page.getByRole('dialog', { name: 'Transfer from Bank Contract' })
  await transfer.getByPlaceholder('Address').fill(recipient)
  await selectToken(page, transfer, 'USDC')
  await dialogAmount(transfer).fill(amount)
  await transfer.locator('[data-test="transferButton"]').click()
  await expect(page.getByText('Transferred successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
}

/**
 * Archive the current Officer and deploy a fresh generation of contracts, so the
 * company keeps producing operations on a second set of deployments.
 */
export async function redeployContractsThroughUi(page: Page, teamId: string): Promise<void> {
  await page.goto(`/teams/${teamId}/contract-management`)
  await page.locator('[data-test="createAddCampaign"]').click()
  const modal = page.getByRole('dialog', { name: 'Redeploy Officer Contract' })
  await modal.locator('[data-test="redeploy-share-name-input"]').fill('E2E Shares 2')
  await modal.locator('[data-test="redeploy-share-symbol-input"]').fill('E2E2')
  await modal.locator('[data-test="confirm-redeploy-contracts"]').click()
  await expect(
    page.getByText('Officer redeployed and contracts synced', { exact: true })
  ).toBeVisible({ timeout: 180_000 })
  await expect(modal).toBeHidden({ timeout: 30_000 })
  // Every open view still holds the archived generation's contracts. Reopen the
  // workspace so the account pages mount against the new set rather than
  // re-rendering into it while a write is in flight.
  await page.goto(`/teams/${teamId}`)
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}$`))
}

/** Grant the member a signed spending approval on the funded Expense Account. */
export async function approveExpenseSpending(
  page: Page,
  teamId: string,
  amount: string
): Promise<void> {
  await openSettledExpenseAccount(page, teamId)
  await page.locator('[data-test="approve-users-button"]').click()
  const approval = page.getByRole('dialog', { name: 'Grant Spending Approval' })
  await approval.locator('[data-test="member-address-input"]').fill(E2E_MEMBER)
  await approval.locator('[data-test="user-row"]').click()
  await approval.locator('[data-test="token-selector"]').click()
  await page.getByRole('option', { name: 'USDC', exact: true }).click()
  await approval.locator('[data-test="amount-input"]').fill(amount)
  await approval.locator('[data-test="frequency-select"]').click()
  await page.getByRole('option', { name: 'Weekly', exact: true }).click()
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  await chooseApprovalDate(page, '[data-test="start-date-picker"]', today)
  await chooseApprovalDate(page, '[data-test="end-date-picker"]', tomorrow)
  await approval.locator('[data-test="approve-button"]').click()
  await page
    .getByRole('dialog', { name: 'Review & Sign' })
    .locator('[data-test="approve-button"]')
    .click()
  await expect(page.getByText('User approved successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
}

/** Spend the approved allowance as the member — the company's operating expense. */
export async function spendFromExpenseAccount(
  memberPage: Page,
  teamId: string,
  amount: string
): Promise<void> {
  await memberPage.goto(`/teams/${teamId}`)
  await openAccountFromSidebar(memberPage, `/teams/${teamId}/accounts/expense-account`)
  await memberPage.locator('[data-test="transfer-button"]').click()
  const spend = memberPage.getByRole('dialog', { name: 'Transfer from Expenses Contract' })
  await spend.getByPlaceholder('Address').fill(E2E_MEMBER)
  await spend.locator('[data-test="user-row"]').click()
  await dialogAmount(spend).fill(amount)
  await spend.locator('[data-test="transferButton"]').click()
  await expect(memberPage.getByText('Transfer Successful', { exact: true })).toBeVisible({
    timeout: 30_000
  })
}

/**
 * Take one completed work week from wage to payment: the owner sets the wage and
 * funds Payroll, the member claims it, the owner signs, the member withdraws.
 */
export async function payOneWeeklyClaim(
  page: Page,
  memberPage: Page,
  teamId: string
): Promise<void> {
  // The wage is set from the Payroll members list, which the preceding source
  // operations navigated away from.
  await openAccountFromSidebar(page, `/teams/${teamId}/accounts/payroll-account`)
  await expect(page.locator(`[data-test="member-actions-${E2E_MEMBER}"]`)).toBeVisible({
    timeout: 60_000
  })
  await setMemberUsdcWage(page, teamId, E2E_MEMBER, {
    weeklyCap: '8',
    dailyCap: '8',
    hourlyRate: '1'
  })
  await fundCashRemuneration(page, teamId, '3')

  const paidWeek = completedWeekStart()
  await openMemberPayrollHistory(memberPage, teamId, E2E_MEMBER)
  await selectHistoryWeek(memberPage, paidWeek)
  await submitDailyClaim(memberPage, { hours: '2', memo: 'Accounting journey work' })

  await page.goto(`/teams/${teamId}/accounts/team-payroll`)
  const weeklyClaims = page.locator('[data-test="weekly-claims-table"]')
  await expect(weeklyClaims).toContainText('Pending', { timeout: 30_000 })
  await openWeeklyClaimActions(page, weeklyClaims, 'pending-sign')
  await page.locator('[data-test="sign-action"]').click()
  await expect(page.getByText('Claim approved', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(weeklyClaims).toContainText('Signed', { timeout: 30_000 })

  await openMemberPayrollHistory(memberPage, teamId, E2E_MEMBER)
  await selectHistoryWeek(memberPage, paidWeek)
  await memberPage.locator('[data-test="withdraw-button"]').click()
  await expect(memberPage.getByText('Claim withdrawn', { exact: true })).toBeVisible({
    timeout: 30_000
  })
}

// Bank-specific Playwright page, backend and journey helpers.
import { expect, type Locator, type Page } from '@playwright/test'
import { parseEther, parseUnits } from 'viem'
import {
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_OWNER,
  nativeBalance,
  sendNative,
  sendToken,
  tokenBalance
} from '../e2e-chain'
import type { BankE2EFixture } from './bank-chain'
import {
  dialogAmount,
  openAccountFromSidebar,
  rejectNextWalletRequest,
  selectToken,
  signInAndOpenFirstTeam,
  stubBackend,
  useWallet,
  type E2EUser
} from '../e2e-page'

export interface TeamOptions {
  archived?: boolean
  user?: 'owner' | 'member'
}

const owner: E2EUser = { address: E2E_OWNER, name: 'E2E Owner', imageUrl: null }
const member: E2EUser = { address: E2E_MEMBER, name: 'E2E Recipient', imageUrl: null }

export const currentUser = (options: TeamOptions): E2EUser =>
  options.user === 'member' ? member : owner

/** Team payload shared by the Bank and Expense journeys: one Officer, four accounts. */
export const treasuryTeam = (fixture: BankE2EFixture, { archived = false }: TeamOptions = {}) => ({
  id: '1',
  name: 'E2E Treasury Team',
  slug: 'e2e-treasury-team',
  description: 'A deterministic team used by the Bank and Expense Account E2E suites.',
  isHidden: false,
  isArchived: archived,
  isMigrated: true,
  ownerAddress: E2E_OWNER,
  members: [
    { id: 'owner-1', name: owner.name, address: owner.address, teamId: 1 },
    { id: 'recipient-1', name: member.name, address: member.address, teamId: 1 }
  ],
  currentOfficer: { address: fixture.officer },
  teamContracts: [
    { address: fixture.bank, type: 'Bank', deployer: E2E_OWNER, admins: [] },
    { address: fixture.board, type: 'BoardOfDirectors', deployer: E2E_OWNER, admins: [] },
    {
      address: fixture.cashRemuneration,
      type: 'CashRemunerationEIP712',
      deployer: E2E_OWNER,
      admins: []
    },
    {
      address: fixture.expenseAccount,
      type: 'ExpenseAccountEIP712',
      deployer: E2E_OWNER,
      admins: []
    }
  ]
})

export async function signInAndOpenTeam(
  page: Page,
  fixture: BankE2EFixture,
  options: TeamOptions = {}
): Promise<void> {
  if (options.user === 'member') await useWallet(page, E2E_MEMBER_PRIVATE_KEY)
  await stubBackend(page, { user: currentUser(options), team: treasuryTeam(fixture, options) })
  await signInAndOpenFirstTeam(page)
}

export async function openBankAccount(
  page: Page,
  fixture: BankE2EFixture,
  options: TeamOptions = {}
): Promise<void> {
  await signInAndOpenTeam(page, fixture, options)
  await openAccountFromSidebar(page, '/teams/1/accounts/bank-account')
}

export async function selectRecipient(dialog: Locator): Promise<void> {
  await dialog.getByPlaceholder('Address').fill(E2E_MEMBER)
  await dialog.getByText('E2E Recipient', { exact: true }).click()
}

export async function transferBankToContract(
  page: Page,
  contractName: string,
  amount: string,
  tokenSymbol?: string
): Promise<void> {
  await page.locator('[data-test="transfer-button"]').click()
  const transfer = page.getByRole('dialog', { name: 'Transfer from Bank Contract' })
  await transfer.getByPlaceholder('Name').fill(contractName)
  await transfer.locator('[data-test="contract-row"]').filter({ hasText: contractName }).click()
  if (tokenSymbol) await selectToken(page, transfer, tokenSymbol)
  await dialogAmount(transfer).fill(amount)
  await transfer.locator('[data-test="transferButton"]').click()
  await expect(page.getByText('Transferred successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
}

export async function completeCashOut(page: Page): Promise<void> {
  const cashOutButton = page.locator('[data-test="cash-out-all-button"]')
  await expect(cashOutButton).toBeEnabled({ timeout: 30_000 })
  await cashOutButton.click()
  await page.locator('[data-test="cash-out-all-confirm"]').click()
  await expect(page.locator('[data-test="cash-out-complete"]')).toBeVisible({ timeout: 60_000 })
}

export async function exerciseCashOutRecovery(page: Page, fixture: BankE2EFixture): Promise<void> {
  await sendNative(fixture.cashRemuneration, '1')
  await sendToken(fixture.usdc, fixture.cashRemuneration, '2')
  await sendNative(fixture.expenseAccount, '1')
  await sendToken(fixture.usdc, fixture.expenseAccount, '3')
  await sendNative(fixture.bank, '1')
  await sendToken(fixture.usdc, fixture.bank, '4')
  await signInAndOpenTeam(page, fixture)

  const cashOutButton = page.locator('[data-test="cash-out-all-button"]')
  await expect(cashOutButton).toBeEnabled({ timeout: 30_000 })
  await cashOutButton.click()
  await expect(page.locator('[data-test="cash-out-review-cashRemuneration"]')).toBeVisible()
  await expect(page.locator('[data-test="cash-out-review-expense"]')).toBeVisible()
  await rejectNextWalletRequest(page)
  await page.locator('[data-test="cash-out-all-confirm"]').click()

  await expect(page.locator('[data-test="cash-out-error-cashRemuneration"]')).toContainText(
    'You rejected the request.',
    { timeout: 30_000 }
  )
  await expect
    .poll(() => tokenBalance(fixture.usdc, fixture.cashRemuneration))
    .toBe(parseUnits('2', 6))
  await expect
    .poll(() => tokenBalance(fixture.usdc, fixture.expenseAccount))
    .toBe(parseUnits('3', 6))

  await page.locator('[data-test="cash-out-all-retry"]').click()
  await expect(page.locator('[data-test="cash-out-complete"]')).toBeVisible({
    timeout: 60_000
  })
  for (const contract of [fixture.cashRemuneration, fixture.expenseAccount, fixture.bank]) {
    await expect.poll(() => nativeBalance(contract)).toBe(0n)
    await expect.poll(() => tokenBalance(fixture.usdc, contract)).toBe(0n)
  }
}

export async function exerciseMemberBankAccess(page: Page, fixture: BankE2EFixture): Promise<void> {
  await sendToken(fixture.usdc, fixture.bank, '2')
  await sendToken(fixture.usdc, E2E_MEMBER, '5')
  const memberTokenBefore = await tokenBalance(fixture.usdc, E2E_MEMBER)

  await signInAndOpenTeam(page, fixture, { user: 'member' })
  await expect(page.locator('[data-test="cash-out-all-button"]')).toHaveCount(0)
  await openAccountFromSidebar(page, '/teams/1/accounts/bank-account')

  await expect(page.locator('[data-test="bank-total-usd"]')).toHaveText('$2.00')
  await expect(page.locator('[data-test="bank-total-local"]')).toContainText('$2.00 USD')
  await expect(page.locator('[data-test="contract-owner-name"]')).toHaveText('E2E Owner')
  await expect(page.locator('[data-test="bank-contract-address"]')).toContainText(fixture.bank)
  await expect(page.getByText('Token Holding', { exact: true })).toBeVisible()
  await expect(page.locator('[data-test="transfer-button"]')).toBeDisabled()

  await page.getByRole('button', { name: 'Deposit', exact: true }).click()
  let deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
  await dialogAmount(deposit).fill('0.5')
  await deposit.locator('[data-test="deposit-button"]').click()
  await expect(page.getByText('GO deposited successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
  await expect.poll(() => nativeBalance(fixture.bank)).toBe(parseEther('0.5'))

  await page.getByRole('button', { name: 'Deposit', exact: true }).click()
  deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
  await selectToken(page, deposit, 'USDC')
  await dialogAmount(deposit).fill('1')
  await deposit.locator('[data-test="deposit-button"]').click()
  await expect(page.getByText('USDC deposited successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
  await expect.poll(() => tokenBalance(fixture.usdc, fixture.bank)).toBe(parseUnits('3', 6))
  await expect
    .poll(() => tokenBalance(fixture.usdc, E2E_MEMBER))
    .toBe(memberTokenBefore - parseUnits('1', 6))
  await expect(page.locator('[data-test="bank-total-usd"]')).toHaveText('$3.50', {
    timeout: 30_000
  })

  const history = page.locator('[data-test="bank-transactions"]')
  await expect(history.getByText('Deposit', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(history.getByText('Token deposit', { exact: true })).toBeVisible()
  await expect(history.getByText('E2E Recipient', { exact: true }).first()).toBeVisible()
  await history.locator('[data-test="bank-transaction-detail-button"]').first().click()
  await expect(page.getByText('Transaction detail', { exact: true })).toBeVisible()
  await page
    .getByRole('dialog', { name: 'Transaction detail' })
    .getByRole('button', { name: 'Close', exact: true })
    .last()
    .click()

  await history.locator('[data-test="bank-transaction-history-type-filter"]').click()
  await page.getByRole('option', { name: 'Token deposit', exact: true }).click()
  await expect(history.locator('tbody').getByText('Token deposit', { exact: true })).toHaveCount(1)
  await history.locator('[data-test="bank-transaction-history-date-select"] button').click()
  await page.locator('[data-test="date-picker-month-previous"]').click()
  await expect(history.getByText('No data', { exact: true })).toBeVisible()
}

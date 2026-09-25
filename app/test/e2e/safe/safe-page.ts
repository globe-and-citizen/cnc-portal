// Safe-specific Playwright page helpers: the team payload, the stubbed
// Transaction Service, and the navigation to the Safe Account.
import { expect, type Page } from '@playwright/test'
import { parseEther, type Address } from 'viem'
import type { SafeIncomingTransfer, SafeTransaction } from '../../../src/types/safe'
import {
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_NEW_SIGNER,
  E2E_OWNER,
  nativeBalance,
  sendNative,
  sendToken
} from '../e2e-chain'
import {
  dialogAmount,
  openAccountFromSidebar,
  rejectNextWalletRequest,
  signInAndOpenFirstTeam,
  stubBackend,
  useWallet,
  type E2EUser
} from '../e2e-page'
import {
  memberSafeSignature,
  safeOwners,
  safeThreshold,
  safeTransactionHash,
  type SafeE2EFixture
} from './safe-chain'
import { stubSafeTransactionService } from './safe-transaction-service'
import { transaction } from './safe-transaction'

export interface SafePageOptions {
  archived?: boolean
  failSafeInfoRequests?: number
  user?: 'owner' | 'member'
  /** Omit for the one-of-one fixture Safe; pass null for the setup journey. */
  safeAddress?: Address | null
  transactions?: SafeTransaction[]
  incomingTransfers?: SafeIncomingTransfer[]
}

const owner: E2EUser = { id: 'owner-1', name: 'E2E Owner', address: E2E_OWNER, imageUrl: null }
const member: E2EUser = { id: 'member-1', name: 'E2E Member', address: E2E_MEMBER, imageUrl: null }
const newSigner: E2EUser = {
  id: 'signer-1',
  name: 'E2E New Signer',
  address: E2E_NEW_SIGNER,
  imageUrl: null
}
const users = [owner, member, newSigner]

const currentUser = (options: SafePageOptions): E2EUser =>
  options.user === 'member' ? member : owner

/** The sidebar links to `/0x` while the team has no Safe yet (the setup journey). */
const activeSafeAddress = (fixture: SafeE2EFixture, options: SafePageOptions): Address | '0x' =>
  options.safeAddress === undefined ? fixture.safe : (options.safeAddress ?? '0x')

const safeTeam = (fixture: SafeE2EFixture, options: SafePageOptions) => {
  const safeAddress = activeSafeAddress(fixture, options)
  return {
    id: '1',
    name: 'E2E Safe Team',
    slug: 'e2e-safe-team',
    description: 'A deterministic team used by the Safe Account E2E suite.',
    isHidden: false,
    isArchived: options.archived ?? false,
    isMigrated: true,
    ownerAddress: E2E_OWNER,
    members: users.map(({ id, name, address }) => ({ id, name, address, teamId: 1 })),
    teamContracts:
      safeAddress === '0x'
        ? []
        : [{ address: safeAddress, type: 'Safe', deployer: E2E_OWNER, admins: [] }]
  }
}

export async function openSafeAccount(
  page: Page,
  fixture: SafeE2EFixture,
  options: SafePageOptions = {}
): Promise<void> {
  const user = currentUser(options)
  if (options.user === 'member') await useWallet(page, E2E_MEMBER_PRIVATE_KEY)
  await Promise.all([
    stubBackend(page, { user, users, team: safeTeam(fixture, options) }),
    stubSafeTransactionService(page, fixture, {
      failSafeInfoRequests: options.failSafeInfoRequests,
      incomingTransfers: options.incomingTransfers,
      transactions: options.transactions,
      user
    })
  ])
  await signInAndOpenFirstTeam(page)
  await openAccountFromSidebar(
    page,
    `/teams/1/accounts/safe-account/${activeSafeAddress(fixture, options)}`
  )
}

export async function exerciseArchivedSafeSetup(page: Page, fixture: SafeE2EFixture) {
  await openSafeAccount(page, fixture, { archived: true, safeAddress: null })
  await expect(page.locator('[data-test="deploy-safe-button"]')).toBeDisabled()
  await page.locator('[data-test="safe-import-address-input"]').fill(fixture.safe)
  await page.locator('[data-test="inspect-safe-button"]').click()
  await expect(page.locator('[data-test="safe-import-summary"]')).toBeVisible()
  await expect(page.locator('[data-test="confirm-safe-import-button"]')).toBeDisabled()
}

export async function exerciseSafeInfoRecovery(page: Page, fixture: SafeE2EFixture) {
  await sendToken(fixture.usdc, fixture.safe, '2')
  await openSafeAccount(page, fixture, { failSafeInfoRequests: 3, incomingTransfers: [] })
  await expect(page.locator('[data-test="safe-deposits-empty"]')).toBeVisible()
  await expect(page.locator('[data-test="safe-overview-error"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-test="safe-total-usd"]')).toHaveText('$2.00')
  await expect(page.locator('[data-test="safe-wallet-view"]')).toBeVisible()
  await page.locator('[data-test="retry-safe-overview-button"]').click()
  await expect(page.locator('[data-test="safe-overview-error"]')).toHaveCount(0)
  await expect(page.locator('[data-test="safe-threshold-summary"]')).toHaveText('1 of 1 signers')
}

export async function exercisePendingSafeTransfer(page: Page, fixture: SafeE2EFixture) {
  await openSafeAccount(page, fixture, { safeAddress: fixture.multisigSafe })
  await page.locator('[data-test="transfer-button"]').click()
  const transfer = page.getByRole('dialog', { name: 'Create a Safe transfer' })
  await transfer.getByPlaceholder('Name').fill('E2E Member')
  await transfer.locator('[data-test="user-row"]').filter({ hasText: 'E2E Member' }).click()
  await dialogAmount(transfer).fill('0.25')
  await transfer.locator('[data-test="transferButton"]').click()
  await expect(page.getByText('Transfer proposed', { exact: true })).toBeVisible()
  await expect.poll(() => nativeBalance(fixture.multisigSafe)).toBe(parseEther('0.5'))
  await expect(
    page.locator('[data-test="safe-transaction-state"]').filter({ hasText: 'Pending approvals' })
  ).toBeVisible()
}

export async function exerciseRejectedSafeControlChange(page: Page, fixture: SafeE2EFixture) {
  const ownersBefore = await safeOwners(fixture.safe)
  const thresholdBefore = await safeThreshold(fixture.safe)
  await openSafeAccount(page, fixture)
  await page.locator('[data-test="add-signer-button"]').click()
  const dialog = page.getByRole('dialog', { name: 'Add Safe Signers' })
  await dialog.getByPlaceholder('Search by name or address').fill('E2E Member')
  await dialog.locator('[data-test="user-row"]').filter({ hasText: 'E2E Member' }).click()
  await rejectNextWalletRequest(page)
  await dialog.locator('[data-test="add-signers-button"]').click()
  await expect(dialog.getByText(/Failed to add signers/)).toBeVisible()
  await expect.poll(() => safeOwners(fixture.safe)).toEqual(ownersBefore)
  await expect.poll(() => safeThreshold(fixture.safe)).toBe(thresholdBefore)
}

export async function exerciseSafeApprovalAndExecution(page: Page, fixture: SafeE2EFixture) {
  await sendNative(fixture.multisigSafe, '0.5')
  const safeTxHash = await safeTransactionHash(fixture.multisigSafe, {
    to: E2E_NEW_SIGNER,
    value: parseEther('0.25')
  })
  const pending = transaction(fixture.multisigSafe, {
    to: E2E_NEW_SIGNER,
    value: parseEther('0.25').toString(),
    safeTxHash,
    confirmationsRequired: 2,
    confirmations: [
      {
        owner: E2E_MEMBER,
        submissionDate: '2026-01-01T00:00:00Z',
        transactionHash: null,
        signature: await memberSafeSignature(safeTxHash),
        signatureType: 'ETH_SIGN'
      }
    ]
  })
  await openSafeAccount(page, fixture, {
    safeAddress: fixture.multisigSafe,
    transactions: [pending]
  })

  const transactionTable = page.locator('[data-test="safe-transactions-table"]')
  const approvalProgress = transactionTable.locator(
    '[data-test="safe-transaction-approval-progress"]'
  )
  await rejectNextWalletRequest(page)
  await transactionTable.locator('[data-test="approve-button"]').click()
  await expect(page.getByText('Transaction rejected', { exact: true })).toBeVisible()
  await expect(approvalProgress).toContainText('1 of 2')

  await transactionTable.locator('[data-test="approve-button"]').click()
  await expect(page.getByText('Transaction approved successfully', { exact: true })).toBeVisible({
    timeout: 60_000
  })
  await expect(transactionTable.locator('[data-test="execute-button"]')).toBeVisible({
    timeout: 30_000
  })
  await rejectNextWalletRequest(page)
  await transactionTable.locator('[data-test="execute-button"]').click()
  await expect(page.getByText('Transaction rejected', { exact: true }).last()).toBeVisible()
  await expect.poll(() => nativeBalance(fixture.multisigSafe)).toBe(parseEther('0.5'))

  await transactionTable.locator('[data-test="execute-button"]').click()
  await expect(page.getByText('Transaction executed successfully', { exact: true })).toBeVisible({
    timeout: 60_000
  })
  await expect.poll(() => nativeBalance(fixture.multisigSafe)).toBe(parseEther('0.25'))
  await page.locator('[data-test="safe-transaction-filter-all"]').click()
  await expect(
    transactionTable.locator('[data-test="safe-transaction-state"]').filter({ hasText: 'Executed' })
  ).toBeVisible({ timeout: 30_000 })
}

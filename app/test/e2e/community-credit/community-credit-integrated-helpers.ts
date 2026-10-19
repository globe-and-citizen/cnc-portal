import { parseAbiItem, type Address, type Hex } from 'viem'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'
import { ownerAccount, publicClient } from '../e2e-chain'
import { authenticateIntegratedAccount, requestIntegratedApi } from '../integrated-api'
import type { OperationalTeamFixture } from '../factories/operational-team'

const deploymentManifest = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../../src/artifacts/deployed_addresses/chain-31337.json', import.meta.url)
    ),
    'utf8'
  )
) as Record<string, string>
export const usdc = deploymentManifest['MockTokens#USDC'] as Address

export function contractAddress(team: OperationalTeamFixture, type: string): Address {
  const contract = team.team.teamContracts.find((item) => item.type === type)
  if (!contract) throw new Error(`The operational team has no ${type} contract`)
  return contract.address as Address
}

export async function openRealCredit(page: Page, teamId: string): Promise<void> {
  await page.goto(`/teams/${teamId}`)
  await page.locator(`a[href="/teams/${teamId}/community-credit"]`).click()
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/community-credit$`))
}

export async function openHistoryRound(page: Page, name: string): Promise<void> {
  const row = page.locator('[data-test="credit-history-table"] tbody tr').filter({ hasText: name })
  await expect(row).toHaveCount(1, { timeout: 30_000 })
  await row.locator('[data-test="credit-history-view-button"]').click()
  await expect(page).toHaveURL(/\/community-credit\/\d+(?:\/[^/?#]+)?(?:[?#].*)?$/, {
    timeout: 30_000
  })
}

export async function expectPersistedRound(
  teamId: string,
  name: string,
  purpose: string
): Promise<void> {
  const token = await authenticateIntegratedAccount(ownerAccount)
  const rows = await requestIntegratedApi<
    Array<{ teamId: number; offerId: number; title: string; purpose: string | null }>
  >(`/fixed-return-offering?teamId=${teamId}`, { token })
  expect(rows.filter((row) => row.offerId === 1)).toEqual([
    expect.objectContaining({ teamId: Number(teamId), offerId: 1, title: name, purpose })
  ])
}

export async function successfulReceipt(hash: Hex, from: Address, to: Address): Promise<void> {
  const receipt = await publicClient.getTransactionReceipt({ hash })
  expect(receipt.status).toBe('success')
  expect(receipt.from.toLowerCase()).toBe(from.toLowerCase())
  expect(receipt.to?.toLowerCase()).toBe(to.toLowerCase())
}

export async function expectCreditHistoryEntry(page: Page, hash: Hex): Promise<void> {
  const abbreviated = `${hash.slice(0, 6)}…${hash.slice(-4)}`
  const row = page.locator('[data-test="credit-transactions"] tbody tr').filter({
    hasText: abbreviated
  })
  await expect(row).toHaveCount(1, { timeout: 30_000 })
  await row.locator('[data-test="credit-transaction-detail-button"]').click()
  const detail = page.getByRole('dialog', { name: 'Transaction detail' })
  await expect(detail.getByRole('link', { name: 'Open in block explorer' })).toHaveAttribute(
    'href',
    new RegExp(`/tx/${hash}$`)
  )
  await detail.getByRole('button', { name: 'Close', exact: true }).last().click()
}

export const createdEvent = parseAbiItem(
  'event LendingOfferCreated(uint256 indexed offerId,address indexed token,uint256 fundingTarget,uint256 interestRateBps,uint256 subscriptionDeadline,uint8 fundingAccess)'
)
export const lentEvent = parseAbiItem(
  'event FundsLent(uint256 indexed offerId,address indexed lender,uint256 amount)'
)
export const fundedEvent = parseAbiItem('event LendingOfferFunded(uint256 indexed offerId)')
export const repaymentEvent = parseAbiItem(
  'event RepaymentDistributed(uint256 indexed offerId,uint256 totalAmount)'
)
export const lenderRepaidEvent = parseAbiItem(
  'event LenderRepaid(uint256 indexed offerId,address indexed lender,uint256 amount)'
)
export const refundedEvent = parseAbiItem(
  'event PrincipalRefunded(uint256 indexed offerId,address indexed lender,uint256 amount)'
)
export const refundsDistributedEvent = parseAbiItem(
  'event RefundsDistributed(uint256 indexed offerId,uint256 totalAmount)'
)

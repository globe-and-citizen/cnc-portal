// Community Credit source operation owned by the integrated Accounting journey.
// It uses only the portal and the scenario's own Officer/FixedReturn deployment.
import { expect, type Page } from '@playwright/test'
import {
  isAddress,
  isAddressEqual,
  parseAbiItem,
  parseEventLogs,
  parseUnits,
  zeroAddress
} from 'viem'
import type { Address, Hex } from 'viem'
import { fixedReturnAbi, officerAbi } from '../../../src/artifacts/abi/generated'
import { E2E_OWNER, publicClient } from '../e2e-chain'
import { chooseCalendarDate } from '../e2e-page'
import {
  entriesForTransaction,
  entryAccounts,
  entryTotals,
  type LedgerEntry
} from './accounting-books'
import { INTEGRATED_USDC } from './accounting-operations'

const CREDIT_AMOUNT = '2'
const CREDIT_NAME = 'Accounting credit round'

export interface FundedCreditRound {
  offerId: bigint
  txHash: Hex
}

/** Publish and fully fund one interest-free round, producing one loan-principal posting. */
export async function fundAccountingCreditRound(
  page: Page,
  teamId: string,
  officer: Address
): Promise<FundedCreditRound> {
  const fixedReturn = await publicClient.readContract({
    address: officer,
    abi: officerAbi,
    functionName: 'findDeployedContract',
    args: ['FixedReturn']
  })
  expect(isAddress(fixedReturn) && fixedReturn !== zeroAddress).toBe(true)

  await page.locator(`a[href="/teams/${teamId}/community-credit"]`).click()
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/community-credit$`))
  await page.locator('[data-test="new-credit-call"]').click()
  await page.locator('[data-test="cc-name"]').fill(CREDIT_NAME)
  await page.locator('[data-test="cc-target"]').fill(CREDIT_AMOUNT)
  await page.locator('[data-test="cc-next"]').click()
  await page.locator('[data-test="cc-rate"]').fill('0')
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 7)
  await chooseCalendarDate(page, '[data-test="cc-deadline"]', deadline)
  await page.locator('[data-test="cc-next"]').click()
  const createdAfterBlock = await publicClient.getBlockNumber()
  await page.locator('[data-test="cc-next"]').click()
  await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/community-credit$`), {
    timeout: 30_000
  })
  await expect(
    page.locator('[data-test="credit-round-card"]', { hasText: CREDIT_NAME })
  ).toBeVisible({ timeout: 30_000 })

  const creations = await publicClient.getLogs({
    address: fixedReturn,
    event: parseAbiItem(
      'event LendingOfferCreated(uint256 indexed offerId, address indexed token, uint256 fundingTarget, uint256 interestRateBps, uint256 subscriptionDeadline, uint8 fundingAccess)'
    ),
    fromBlock: createdAfterBlock + 1n,
    toBlock: 'latest'
  })
  expect(creations).toHaveLength(1)
  const creation = creations[0]!
  expect(isAddressEqual(creation.args.token!, INTEGRATED_USDC)).toBe(true)
  expect(creation.args.fundingTarget).toBe(parseUnits(CREDIT_AMOUNT, 6))
  expect(creation.args.interestRateBps).toBe(0n)
  const offerId = creation.args.offerId!

  await page
    .locator('[data-test="credit-round-card"]', { hasText: CREDIT_NAME })
    .getByText(CREDIT_NAME, { exact: true })
    .click()
  await expect(page).toHaveURL(new RegExp(`/community-credit/${offerId}(?:/[^/?#]+)?$`), {
    timeout: 30_000
  })

  const fundedAfterBlock = await publicClient.getBlockNumber()
  await page.locator('[data-test="round-cta-lend"]').click()
  const modal = page.locator('[data-test="credit-lend-modal"]')
  await expect(modal).toBeVisible()
  await modal.locator('[data-test="lend-amount-input"]').fill(CREDIT_AMOUNT)
  const confirm = modal.locator('[data-test="lend-confirm"]')
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(page.getByText('Credit signed', { exact: false }).first()).toBeVisible({
    timeout: 30_000
  })

  const funded = await publicClient.getLogs({
    address: fixedReturn,
    event: parseAbiItem('event LendingOfferFunded(uint256 indexed offerId)'),
    args: { offerId },
    fromBlock: fundedAfterBlock + 1n,
    toBlock: 'latest'
  })
  expect(funded).toHaveLength(1)
  const txHash = funded[0]!.transactionHash
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
  expect(receipt.status).toBe('success')
  const deposits = parseEventLogs({
    abi: fixedReturnAbi,
    eventName: 'FundsLent',
    logs: receipt.logs
  })
  expect(deposits).toHaveLength(1)
  expect(deposits[0]!.args.offerId).toBe(offerId)
  expect(isAddressEqual(deposits[0]!.args.lender, E2E_OWNER)).toBe(true)
  expect(deposits[0]!.args.amount).toBe(parseUnits(CREDIT_AMOUNT, 6))

  const offer = await publicClient.readContract({
    address: fixedReturn,
    abi: fixedReturnAbi,
    functionName: 'getLendingOffer',
    args: [offerId]
  })
  expect(offer.totalFunded).toBe(parseUnits(CREDIT_AMOUNT, 6))
  expect(offer.state).toBe(1)
  return { offerId, txHash }
}

/** Match the funded round's transaction to one balanced General Ledger entry. */
export function expectAccountingCreditEntry(
  entries: readonly LedgerEntry[],
  credit: FundedCreditRound
): void {
  const matches = entriesForTransaction(entries, credit.txHash)
  expect(
    matches,
    `Funded credit offer #${credit.offerId} must produce one journal entry`
  ).toHaveLength(1)
  const entry = matches[0]!
  expect(entry.label).toBe('Credit funds lent')
  expect(entryAccounts(entry)).toEqual(['Cash — Bank', 'Loan Payable'])
  const totals = entryTotals(entry)
  expect(totals.debit).toBeGreaterThan(0)
  expect(totals.debit).toBe(totals.credit)
}

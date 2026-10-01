import { parseUnits } from 'viem'
import { expect, test } from '../fixtures/integrated'
import {
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_OWNER,
  publicClient,
  tokenBalance
} from '../e2e-chain'
import { openAccountFromSidebar } from '../e2e-page'
import { depositUsdc } from '../bank/bank-integrated-helpers'
import { getLendingOffer, lenderDeposits, totalOfferings } from './community-credit-chain'
import { lendToRound, openRound, publishCreditCall } from './community-credit-page'
import {
  contractAddress,
  createdEvent,
  expectCreditHistoryEntry,
  expectPersistedRound,
  fundedEvent,
  lenderRepaidEvent,
  lentEvent,
  openHistoryRound,
  openRealCredit,
  refundedEvent,
  refundsDistributedEvent,
  repaymentEvent,
  successfulReceipt,
  usdc
} from './community-credit-integrated-helpers'

test.describe('G4 integrated Community Credit lifecycle', { tag: '@integrated' }, () => {
  test.setTimeout(300_000)

  /** Covers AC-US-CC-002-06/12, AC-US-CC-003-01/02, and AC-US-CC-005-01/06. */
  test('E2E-PATH-09: publish, fund, repay, and reload independent balances and history', async ({
    authenticatedPage: ownerPage,
    walletPage,
    operationalTeam
  }) => {
    const team = await operationalTeam({ memberPrivateKeys: [E2E_MEMBER_PRIVATE_KEY] })
    const bank = contractAddress(team, 'Bank')
    const fixedReturn = contractAddress(team, 'FixedReturn')
    const name = 'Integrated Credit Repayment'
    const purpose = 'Working capital for the integrated lifecycle'
    const target = parseUnits('100', 6)
    const repayment = parseUnits('106', 6)

    const memberStartingBalance = await tokenBalance(usdc, E2E_MEMBER)
    const bankStartingBalance = await tokenBalance(usdc, bank)
    expect(memberStartingBalance).toBeGreaterThanOrEqual(target)
    expect(await tokenBalance(usdc, E2E_OWNER)).toBeGreaterThanOrEqual(parseUnits('10', 6))
    expect(await totalOfferings(fixedReturn)).toBe(0n)

    await openRealCredit(ownerPage, team.teamId)
    await expect(ownerPage.locator('[data-test="credit-rounds-empty"]')).toBeVisible()
    const fromBlock = await publicClient.getBlockNumber()
    await publishCreditCall(ownerPage, { teamId: team.teamId, name, purpose, target: '100' })
    await expect(
      ownerPage.locator('[data-test="credit-round-card"]', { hasText: name })
    ).toBeVisible()
    expect(await totalOfferings(fixedReturn)).toBe(1n)
    const offerCreated = await publicClient.getLogs({
      address: fixedReturn,
      event: createdEvent,
      args: { offerId: 1n },
      fromBlock: fromBlock + 1n
    })
    expect(offerCreated).toHaveLength(1)
    expect(offerCreated[0]?.args).toMatchObject({ fundingTarget: target, token: usdc })
    const createHash = offerCreated[0]!.transactionHash
    await successfulReceipt(createHash, E2E_OWNER, fixedReturn)
    await expectPersistedRound(team.teamId, name, purpose)

    const memberPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)
    await openRealCredit(memberPage, team.teamId)
    await openRound(memberPage, name)
    const lendFromBlock = await publicClient.getBlockNumber()
    await lendToRound(memberPage, '100')
    await expect.poll(() => lenderDeposits(fixedReturn, 1n, E2E_MEMBER)).toBe(target)
    const lent = await publicClient.getLogs({
      address: fixedReturn,
      event: lentEvent,
      args: { offerId: 1n, lender: E2E_MEMBER },
      fromBlock: lendFromBlock + 1n
    })
    expect(lent).toHaveLength(1)
    expect(lent[0]?.args.amount).toBe(target)
    const lendHash = lent[0]!.transactionHash
    await successfulReceipt(lendHash, E2E_MEMBER, fixedReturn)
    expect(
      await publicClient.getLogs({
        address: fixedReturn,
        event: fundedEvent,
        args: { offerId: 1n },
        fromBlock: lendFromBlock + 1n
      })
    ).toHaveLength(1)
    await expect.poll(() => tokenBalance(usdc, bank)).toBe(bankStartingBalance + target)
    expect(await tokenBalance(usdc, E2E_MEMBER)).toBe(memberStartingBalance - target)
    expect((await getLendingOffer(fixedReturn, 1n)).state).toBe(1)
    await expect(memberPage.locator('[data-test="credit-lend-modal"]')).toHaveCount(0)
    await expect(memberPage.getByText('Funded', { exact: true }).first()).toBeVisible()
    await expect(memberPage.getByRole('row', { name: /E2E Member You/ })).toContainText('100 USDC')

    await openAccountFromSidebar(ownerPage, `/teams/${team.teamId}/accounts/bank-account`)
    await depositUsdc(ownerPage, '10')
    await expect
      .poll(() => tokenBalance(usdc, bank))
      .toBe(bankStartingBalance + parseUnits('110', 6))
    await openRealCredit(ownerPage, team.teamId)
    await openHistoryRound(ownerPage, name)
    await expect(ownerPage.locator('[data-test="round-cta-repay"]')).toBeVisible()
    await ownerPage.locator('[data-test="round-cta-repay"]').click()
    await ownerPage.locator('[data-test="repay-quick-Max"]').click()
    await expect(ownerPage.locator('[data-test="repay-amount-input"]')).toHaveValue('106')
    const repayFromBlock = await publicClient.getBlockNumber()
    await ownerPage.locator('[data-test="confirm-repay"]').click()
    await expect
      .poll(async () => (await getLendingOffer(fixedReturn, 1n)).totalRepaidByIssuer)
      .toBe(repayment)
    const distributed = await publicClient.getLogs({
      address: fixedReturn,
      event: repaymentEvent,
      args: { offerId: 1n },
      fromBlock: repayFromBlock + 1n
    })
    const paid = await publicClient.getLogs({
      address: fixedReturn,
      event: lenderRepaidEvent,
      args: { offerId: 1n, lender: E2E_MEMBER },
      fromBlock: repayFromBlock + 1n
    })
    expect(distributed).toHaveLength(1)
    expect(distributed[0]?.args.totalAmount).toBe(repayment)
    expect(paid).toHaveLength(1)
    expect(paid[0]?.args.amount).toBe(repayment)
    const repayHash = distributed[0]!.transactionHash
    await successfulReceipt(repayHash, E2E_OWNER, bank)
    expect(await tokenBalance(usdc, E2E_MEMBER)).toBe(memberStartingBalance - target + repayment)
    expect(await tokenBalance(usdc, bank)).toBe(bankStartingBalance + parseUnits('4', 6))
    expect((await getLendingOffer(fixedReturn, 1n)).state).toBe(3)

    await ownerPage.reload()
    await expect(ownerPage.getByRole('heading', { name })).toBeVisible()
    await expect(ownerPage.getByText('Repaid', { exact: true }).first()).toBeVisible()
    await expect(
      ownerPage
        .getByRole('row', { name: /E2E Member/ })
        .locator('td')
        .nth(4)
    ).toContainText('106 USDC')
    await expectCreditHistoryEntry(ownerPage, createHash)
    await expectCreditHistoryEntry(ownerPage, lendHash)
    await expectCreditHistoryEntry(ownerPage, repayHash)
    await expectPersistedRound(team.teamId, name, purpose)
    await ownerPage.locator('[data-test="round-back"]').click()
    await expect(
      ownerPage.locator('[data-test="credit-history-table"]', { hasText: name })
    ).toContainText('Repaid')
  })

  /** Covers AC-US-CC-004-01/05/06 for the refund decision. */
  test('E2E-PATH-10: expire an underfunded round, refund, and reload balances and history', async ({
    authenticatedPage: ownerPage,
    walletPage,
    operationalTeam
  }) => {
    const team = await operationalTeam({ memberPrivateKeys: [E2E_MEMBER_PRIVATE_KEY] })
    const bank = contractAddress(team, 'Bank')
    const fixedReturn = contractAddress(team, 'FixedReturn')
    const name = 'Integrated Stalled Credit'
    const purpose = 'Underfunded round recovery'
    const deposit = parseUnits('40', 6)

    const memberStartingBalance = await tokenBalance(usdc, E2E_MEMBER)
    const bankStartingBalance = await tokenBalance(usdc, bank)
    const creditStartingBalance = await tokenBalance(usdc, fixedReturn)
    expect(memberStartingBalance).toBeGreaterThanOrEqual(deposit)
    await openRealCredit(ownerPage, team.teamId)
    const fromBlock = await publicClient.getBlockNumber()
    await publishCreditCall(ownerPage, { teamId: team.teamId, name, purpose, target: '100' })
    const created = await publicClient.getLogs({
      address: fixedReturn,
      event: createdEvent,
      args: { offerId: 1n },
      fromBlock: fromBlock + 1n
    })
    expect(created).toHaveLength(1)
    const createHash = created[0]!.transactionHash
    await successfulReceipt(createHash, E2E_OWNER, fixedReturn)
    await expectPersistedRound(team.teamId, name, purpose)

    const memberPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)
    await openRealCredit(memberPage, team.teamId)
    await openRound(memberPage, name)
    const lendFromBlock = await publicClient.getBlockNumber()
    await lendToRound(memberPage, '40')
    await expect.poll(() => lenderDeposits(fixedReturn, 1n, E2E_MEMBER)).toBe(deposit)
    const lent = await publicClient.getLogs({
      address: fixedReturn,
      event: lentEvent,
      args: { offerId: 1n, lender: E2E_MEMBER },
      fromBlock: lendFromBlock + 1n
    })
    expect(lent).toHaveLength(1)
    const lendHash = lent[0]!.transactionHash
    await successfulReceipt(lendHash, E2E_MEMBER, fixedReturn)
    expect(await tokenBalance(usdc, E2E_MEMBER)).toBe(memberStartingBalance - deposit)
    expect(await tokenBalance(usdc, fixedReturn)).toBe(creditStartingBalance + deposit)
    expect(await tokenBalance(usdc, bank)).toBe(bankStartingBalance)
    const offer = await getLendingOffer(fixedReturn, 1n)
    expect(offer.state).toBe(0)
    expect(offer.totalFunded).toBe(deposit)
    expect(offer.fundingTarget).toBe(parseUnits('100', 6))

    await publicClient.request({
      method: 'evm_setNextBlockTimestamp',
      params: [Number(offer.subscriptionDeadline + 1n)]
    } as never)
    await publicClient.request({ method: 'evm_mine' } as never)
    expect((await getLendingOffer(fixedReturn, 1n)).state).toBe(0)
    await openRealCredit(ownerPage, team.teamId)
    await openHistoryRound(ownerPage, name)
    await expect(ownerPage.getByText('Action needed', { exact: true }).first()).toBeVisible()
    await expect(ownerPage.locator('[data-test="round-cta-refundable"]')).toBeVisible()
    await expect(ownerPage.locator('[data-test="round-cta-accept-partial"]')).toBeVisible()
    const refundFromBlock = await publicClient.getBlockNumber()
    await ownerPage.locator('[data-test="round-cta-refundable"]').click()
    await expect.poll(async () => (await getLendingOffer(fixedReturn, 1n)).state).toBe(2)
    const refunded = await publicClient.getLogs({
      address: fixedReturn,
      event: refundedEvent,
      args: { offerId: 1n, lender: E2E_MEMBER },
      fromBlock: refundFromBlock + 1n
    })
    const distributed = await publicClient.getLogs({
      address: fixedReturn,
      event: refundsDistributedEvent,
      args: { offerId: 1n },
      fromBlock: refundFromBlock + 1n
    })
    expect(refunded).toHaveLength(1)
    expect(refunded[0]?.args.amount).toBe(deposit)
    expect(distributed).toHaveLength(1)
    expect(distributed[0]?.args.totalAmount).toBe(deposit)
    const refundHash = distributed[0]!.transactionHash
    await successfulReceipt(refundHash, E2E_OWNER, fixedReturn)
    expect(await tokenBalance(usdc, E2E_MEMBER)).toBe(memberStartingBalance)
    expect(await tokenBalance(usdc, fixedReturn)).toBe(creditStartingBalance)
    expect(await tokenBalance(usdc, bank)).toBe(bankStartingBalance)
    await expect(ownerPage.getByText('Refunded', { exact: true }).first()).toBeVisible()
    await memberPage.reload()
    await expect(memberPage.getByText('Refunded', { exact: true }).first()).toBeVisible()
    await expect(
      memberPage
        .getByRole('row', { name: /E2E Member You/ })
        .locator('td')
        .nth(2)
    ).toContainText('0 USDC')
    await ownerPage.reload()
    await expect(ownerPage.getByRole('heading', { name })).toBeVisible()
    await expect(ownerPage.getByText('Refunded', { exact: true }).first()).toBeVisible()
    await expect(ownerPage.locator('[data-test="round-cta-refundable"]')).toHaveCount(0)
    await expect(ownerPage.locator('[data-test="round-cta-accept-partial"]')).toHaveCount(0)
    await expectCreditHistoryEntry(ownerPage, createHash)
    await expectCreditHistoryEntry(ownerPage, lendHash)
    await expectCreditHistoryEntry(ownerPage, refundHash)
    await expectPersistedRound(team.teamId, name, purpose)
    await ownerPage.locator('[data-test="round-back"]').click()
    await expect(
      ownerPage.locator('[data-test="credit-history-table"]', { hasText: name })
    ).toContainText('Refunded')
  })
})

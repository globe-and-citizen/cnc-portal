import { encodeFunctionData, parseUnits } from 'viem'
import { expect, test } from '../fixtures'
import {
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_NEW_SIGNER,
  E2E_NEW_SIGNER_PRIVATE_KEY,
  E2E_OWNER,
  publicClient,
  tokenBalance
} from '../e2e-chain'
import { useWallet } from '../e2e-page'
import { deleteCompanyThroughUi, signInToRealStack } from '../company/real-company-page'
import {
  boardAction,
  boardActionAddedEvents,
  boardActionCount,
  boardActionExecutedEvents,
  boardApprovalEvents,
  currentBoard,
  electionsFixtureFromTeam,
  establishBoardThroughElection
} from '../elections/elections-chain'
import { createOperationalTeamFixture } from '../team-factory'
import {
  bankDividendEvents,
  bankOwner,
  bankUsdcBalance,
  dividendDistributedEvents,
  dividendPaidEvents,
  ensureUsdcBalance,
  mintedEvents,
  shareholderIssuanceFixtureFromTeam,
  shareholderPosition,
  transferBankOwnership
} from './shareholder-chain'
import {
  approvePendingBankDividend,
  distributeUsdcDividends,
  fundBankWithUsdc,
  issueShares,
  openRealShareholderManagement
} from './shareholder-page'

const normalizedShareholders = (
  shareholders: readonly { shareholder: `0x${string}`; amount: bigint }[]
) =>
  shareholders
    .map(({ shareholder, amount }) => ({ shareholder: shareholder.toLowerCase(), amount }))
    .sort((left, right) => left.shareholder.localeCompare(right.shareholder))

test.describe(
  '[US-SHER-002/003/004] Integrated SHER issuance and dividend lifecycle',
  { tag: ['@US-SHER-002', '@US-SHER-003', '@US-SHER-004', '@integrated'] },
  () => {
    test.setTimeout(360_000)

    /**
     * Covers:
     * - [AC-US-SHER-002-01]
     * - [AC-US-SHER-002-02]
     * - [AC-US-SHER-002-03]
     * - [AC-US-SHER-002-04]
     * - [AC-US-SHER-002-13]
     * - [AC-US-SHER-003-01]
     * - [AC-US-SHER-003-02]
     * - [AC-US-SHER-003-03]
     * - [AC-US-SHER-003-04]
     * - [AC-US-SHER-004-01]
     * - [AC-US-SHER-004-02]
     */
    test('issues shares, distributes proportional dividends and reloads the durable result', async ({
      browser,
      page
    }) => {
      const company = await createOperationalTeamFixture({
        memberPrivateKeys: [E2E_MEMBER_PRIVATE_KEY, E2E_NEW_SIGNER_PRIVATE_KEY]
      })
      const memberContext = await browser.newContext()
      const memberPage = await memberContext.newPage()
      await useWallet(memberPage, E2E_MEMBER_PRIVATE_KEY)
      await signInToRealStack(memberPage)

      try {
        await signInToRealStack(page)

        const team = await openRealShareholderManagement(page, company.teamId)
        const fixture = await shareholderIssuanceFixtureFromTeam(team)
        const electionsFixture = await electionsFixtureFromTeam(team)
        expect(await shareholderPosition(fixture)).toEqual({
          balance: 0n,
          shareholders: [],
          symbol: 'E2E',
          totalSupply: 0n
        })

        await issueShares(page, E2E_OWNER, '30')
        await expect
          .poll(async () => (await shareholderPosition(fixture)).totalSupply)
          .toBe(parseUnits('30', 6))
        await issueShares(page, E2E_MEMBER, '10')

        await expect
          .poll(() => shareholderPosition(fixture, E2E_OWNER))
          .toEqual({
            balance: parseUnits('30', 6),
            shareholders: expect.any(Array),
            symbol: 'E2E',
            totalSupply: parseUnits('40', 6)
          })
        const position = await shareholderPosition(fixture, E2E_MEMBER)
        expect(position.balance).toBe(parseUnits('10', 6))
        expect(normalizedShareholders(position.shareholders)).toEqual(
          normalizedShareholders([
            { shareholder: E2E_OWNER, amount: parseUnits('30', 6) },
            { shareholder: E2E_MEMBER, amount: parseUnits('10', 6) }
          ])
        )

        const mints = await mintedEvents(fixture)
        expect(mints).toHaveLength(2)
        expect(mints.map((event) => event.args)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ shareholder: E2E_OWNER, amount: parseUnits('30', 6) }),
            expect.objectContaining({ shareholder: E2E_MEMBER, amount: parseUnits('10', 6) })
          ])
        )
        for (const event of mints) {
          expect(event.transactionHash).toBeTruthy()
          expect(
            (await publicClient.getTransactionReceipt({ hash: event.transactionHash! })).status
          ).toBe('success')
        }

        await ensureUsdcBalance(fixture, E2E_OWNER, parseUnits('4', 6))
        await fundBankWithUsdc(page, company.teamId, '4')
        await expect.poll(() => bankUsdcBalance(fixture)).toBe(parseUnits('4', 6))
        const ownerBefore = await tokenBalance(fixture.usdc, E2E_OWNER)
        const memberBefore = await tokenBalance(fixture.usdc, E2E_MEMBER)

        await openRealShareholderManagement(page, company.teamId)
        await distributeUsdcDividends(page, '4')

        await expect.poll(() => bankUsdcBalance(fixture)).toBe(0n)
        await expect
          .poll(() => tokenBalance(fixture.usdc, E2E_OWNER))
          .toBe(ownerBefore + parseUnits('3', 6))
        await expect
          .poll(() => tokenBalance(fixture.usdc, E2E_MEMBER))
          .toBe(memberBefore + parseUnits('1', 6))

        const [bankDistributions, distributions, payments] = await Promise.all([
          bankDividendEvents(fixture),
          dividendDistributedEvents(fixture),
          dividendPaidEvents(fixture)
        ])
        expect(bankDistributions).toHaveLength(1)
        expect(bankDistributions[0]?.args).toMatchObject({
          investor: fixture.investor,
          token: fixture.usdc,
          totalAmount: parseUnits('4', 6)
        })
        expect(distributions).toHaveLength(1)
        expect(distributions[0]?.args).toMatchObject({
          distributor: fixture.bank,
          token: fixture.usdc,
          totalAmount: parseUnits('4', 6),
          shareholderCount: 2n
        })
        expect(payments.map((event) => event.args)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              shareholder: E2E_OWNER,
              token: fixture.usdc,
              amount: parseUnits('3', 6)
            }),
            expect.objectContaining({
              shareholder: E2E_MEMBER,
              token: fixture.usdc,
              amount: parseUnits('1', 6)
            })
          ])
        )
        expect(payments).toHaveLength(2)

        const distributionHash = distributions[0]?.transactionHash
        expect(distributionHash).toBeTruthy()
        expect((await publicClient.getTransactionReceipt({ hash: distributionHash! })).status).toBe(
          'success'
        )

        await establishBoardThroughElection(electionsFixture, [
          E2E_OWNER,
          E2E_MEMBER,
          E2E_NEW_SIGNER
        ])
        expect(
          (await currentBoard(electionsFixture)).map((address) => address.toLowerCase()).sort()
        ).toEqual(
          [E2E_OWNER, E2E_MEMBER, E2E_NEW_SIGNER].map((address) => address.toLowerCase()).sort()
        )
        await transferBankOwnership(fixture, electionsFixture.board)
        await expect.poll(() => bankOwner(fixture)).toBe(electionsFixture.board)

        await ensureUsdcBalance(fixture, E2E_OWNER, parseUnits('4', 6))
        await fundBankWithUsdc(page, company.teamId, '4')
        await expect.poll(() => bankUsdcBalance(fixture)).toBe(parseUnits('4', 6))
        const ownerBeforeBoard = await tokenBalance(fixture.usdc, E2E_OWNER)
        const memberBeforeBoard = await tokenBalance(fixture.usdc, E2E_MEMBER)
        expect(await boardActionCount(electionsFixture)).toBe(0n)

        await openRealShareholderManagement(page, company.teamId)
        const actionPersisted = page.waitForResponse((response) => {
          const url = new URL(response.url())
          return response.request().method() === 'POST' && url.pathname === '/api/actions/'
        })
        await distributeUsdcDividends(page, '4')
        expect((await actionPersisted).status()).toBe(201)

        await expect.poll(() => boardActionCount(electionsFixture)).toBe(1n)
        const pendingAction = await boardAction(electionsFixture, 0n)
        expect(pendingAction).toEqual([
          0n,
          fixture.bank,
          expect.stringContaining('Pay Dividends Request'),
          1,
          false,
          encodeFunctionData({
            abi: fixture.bankArtifact.abi,
            functionName: 'distributeTokenDividends',
            args: [fixture.usdc, parseUnits('4', 6)]
          }),
          E2E_OWNER
        ])
        expect(await bankUsdcBalance(fixture)).toBe(parseUnits('4', 6))
        expect(await tokenBalance(fixture.usdc, E2E_OWNER)).toBe(ownerBeforeBoard)
        expect(await tokenBalance(fixture.usdc, E2E_MEMBER)).toBe(memberBeforeBoard)
        expect(await bankDividendEvents(fixture)).toHaveLength(1)
        const addedEvents = await boardActionAddedEvents(electionsFixture)
        expect(addedEvents).toHaveLength(1)
        expect(addedEvents[0]?.args).toMatchObject({ id: 0n, target: fixture.bank })

        await approvePendingBankDividend(memberPage, company.teamId)
        await expect.poll(async () => (await boardAction(electionsFixture, 0n))[4]).toBe(true)
        const executedAction = await boardAction(electionsFixture, 0n)
        expect(executedAction[3]).toBe(2)
        expect(executedAction[4]).toBe(true)
        await expect.poll(() => bankUsdcBalance(fixture)).toBe(0n)
        await expect
          .poll(() => tokenBalance(fixture.usdc, E2E_OWNER))
          .toBe(ownerBeforeBoard + parseUnits('3', 6))
        await expect
          .poll(() => tokenBalance(fixture.usdc, E2E_MEMBER))
          .toBe(memberBeforeBoard + parseUnits('1', 6))

        const [
          approvalEvents,
          executedEvents,
          allBankDistributions,
          allDistributions,
          allPayments
        ] = await Promise.all([
          boardApprovalEvents(electionsFixture),
          boardActionExecutedEvents(electionsFixture),
          bankDividendEvents(fixture),
          dividendDistributedEvents(fixture),
          dividendPaidEvents(fixture)
        ])
        expect(approvalEvents).toHaveLength(1)
        expect(approvalEvents[0]?.args).toMatchObject({ id: 0n, approver: E2E_MEMBER })
        expect(executedEvents).toHaveLength(1)
        expect(executedEvents[0]?.args).toMatchObject({ id: 0n, target: fixture.bank })
        expect(allBankDistributions).toHaveLength(2)
        expect(allDistributions).toHaveLength(2)
        expect(allPayments).toHaveLength(4)
        const executionHash = executedEvents[0]?.transactionHash
        expect(executionHash).toBeTruthy()
        expect((await publicClient.getTransactionReceipt({ hash: executionHash! })).status).toBe(
          'success'
        )

        await memberPage.reload()
        await expect(memberPage.getByRole('button', { name: '1 Review' })).toHaveCount(0)

        await page.reload()
        await expect(page.getByText('2 Investors', { exact: true })).toBeVisible({
          timeout: 30_000
        })
        await expect(page.getByText('30 E2E', { exact: true })).toHaveCount(2)
        await expect(page.getByText('40 E2E', { exact: true })).toBeVisible()
        const shareholderRows = page.getByRole('row').filter({ hasText: /25\.00%|75\.00%/ })
        await expect(shareholderRows).toHaveCount(2)
        await expect(shareholderRows.filter({ hasText: '75.00%' })).toContainText('30 E2E')
        await expect(shareholderRows.filter({ hasText: '25.00%' })).toContainText('10 E2E')

        const history = page.locator('[data-test="investor-transactions"]')
        const distributionRows = history
          .getByRole('row')
          .filter({ hasText: 'Dividend distributed' })
        await expect(distributionRows).toHaveCount(2, { timeout: 30_000 })
        await expect(distributionRows.first()).toContainText('3 events')
        await distributionRows
          .first()
          .locator('[data-test="investor-transaction-expand-button"]')
          .click()
        await expect(
          history.locator('tbody').getByText('Dividend paid', { exact: true })
        ).toHaveCount(2)
      } finally {
        await memberContext.close()
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, company.teamId, company.team.name)
        }
      }
    })
  }
)

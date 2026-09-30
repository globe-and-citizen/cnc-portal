import { expect, test } from '../fixtures/integrated'
import {
  E2E_MEMBER,
  E2E_MEMBER_PRIVATE_KEY,
  E2E_NEW_SIGNER,
  E2E_OWNER,
  E2E_OWNER_PRIVATE_KEY
} from '../e2e-chain'
import { useWallet } from '../e2e-page'
import {
  addRealCompanyMember,
  createOperationalCompany,
  deleteCompanyThroughUi,
  signInToRealStack
} from '../company/real-company-page'
import {
  duplicatedTransactions,
  entriesForTransaction,
  entryAccounts,
  entryTotals,
  normalizedLedger,
  sumUsd,
  unbalancedEntries,
  usdValue,
  type LedgerEntry
} from './accounting-books'
import {
  assignWithdrawalAccount,
  canEditAssignments,
  expectCompleteBooks,
  ledgerEntryBadge,
  openAccountDrilldown,
  openAccounting,
  readAmounts,
  readBalanceTotals,
  readAssignmentDecision,
  readLedger,
  readSummaryCards,
  readTrialBalance,
  revertWithdrawalAccount
} from './accounting-page'
import {
  exportCurrentReport,
  exportSelectedSections,
  ledgerDataRows,
  ledgerTotalRow,
  sheetRow
} from './accounting-export'
import {
  approveExpenseSpending,
  depositUsdcToBank,
  fundContractFromBank,
  issueSharesToOwner,
  payOneWeeklyClaim,
  spendFromExpenseAccount,
  withdrawToExternalAddress
} from './accounting-operations'

/** The whole book on one page, so an assertion never reads a truncated ledger. */
const WHOLE_BOOK = '?ledgerSize=100'
const ASSIGNED_ACCOUNT = 'Interest Expense'
const ASSIGNED_ACCOUNT_ID = 'interest-expense'
const ASSIGNMENT_MEMO = 'Loan interest settled off-platform'

const entryLabelled = (entries: readonly LedgerEntry[], label: string): LedgerEntry => {
  const matches = entries.filter((entry) => entry.label === label)
  expect(matches, `Expected exactly one "${label}" journal entry`).toHaveLength(1)
  return matches[0]!
}

const lineFor = (entry: LedgerEntry, account: string) => {
  const line = entry.lines.find((candidate) => candidate.account === account)
  expect(line, `Expected a "${account}" line on the ${entry.label} entry`).toBeTruthy()
  return line!
}

const netIncomeOf = (amounts: Record<string, string>) =>
  amounts['Net income (profit)'] ?? amounts['Net income (loss)'] ?? ''

test.describe(
  '[US-ACCT-001/002/003/004/006] Integrated Accounting journey',
  {
    tag: [
      '@US-ACCT-001',
      '@US-ACCT-002',
      '@US-ACCT-003',
      '@US-ACCT-004',
      '@US-ACCT-006',
      '@integrated'
    ]
  },
  () => {
    test.setTimeout(1_200_000)

    /**
     * Covers:
     * - [AC-US-ACCT-001-01]
     * - [AC-US-ACCT-001-02]
     * - [AC-US-ACCT-001-03]
     * - [AC-US-ACCT-001-04]
     * - [AC-US-ACCT-001-07]
     * - [AC-US-ACCT-002-01]
     * - [AC-US-ACCT-002-02]
     * - [AC-US-ACCT-002-03]
     * - [AC-US-ACCT-002-04]
     * - [AC-US-ACCT-002-06]
     * - [AC-US-ACCT-002-07]
     * - [AC-US-ACCT-002-09]
     * - [AC-US-ACCT-003-01]
     * - [AC-US-ACCT-003-02]
     * - [AC-US-ACCT-003-03]
     * - [AC-US-ACCT-003-05]
     * - [AC-US-ACCT-003-06]
     * - [AC-US-ACCT-003-07]
     * - [AC-US-ACCT-004-01]
     * - [AC-US-ACCT-004-02]
     * - [AC-US-ACCT-004-04]
     * - [AC-US-ACCT-004-05]
     * - [AC-US-ACCT-006-01]
     * - [AC-US-ACCT-006-02]
     * - [AC-US-ACCT-006-03]
     * - [AC-US-ACCT-006-04]
     * - [AC-US-ACCT-006-05]
     * - [AC-US-ACCT-006-07]
     * - [AC-US-ACCT-006-09]
     */
    test('reconciles source operations, labels an external withdrawal and exports the reviewed books', async ({
      browser,
      page,
      teamFeatureOverride
    }) => {
      await useWallet(page, E2E_OWNER_PRIVATE_KEY)
      const memberContext = await browser.newContext()
      const memberPage = await memberContext.newPage()
      await useWallet(memberPage, E2E_MEMBER_PRIVATE_KEY)
      await signInToRealStack(memberPage)

      const company = await createOperationalCompany(page)
      const teamId = company.teamId
      const body = page.locator('body')

      try {
        await page.locator('[data-test="skip-safe-setup-button"]').click()
        await addRealCompanyMember(page, teamId, E2E_MEMBER)
        // The wage the books settle belongs to a completed week, which the
        // default submit restriction refuses.
        await teamFeatureOverride(teamId, 'SUBMIT_RESTRICTION', 'disabled')

        // 1. A representative set of operations, each produced through the product.
        const depositHash = await depositUsdcToBank(page, teamId, '10')
        await issueSharesToOwner(page, teamId, E2E_OWNER, '30')
        await payOneWeeklyClaim(page, memberPage, teamId)
        const funding = await fundContractFromBank(page, teamId, 'ExpenseAccountEIP712', '2')
        await approveExpenseSpending(page, teamId, '2')
        await spendFromExpenseAccount(memberPage, teamId, '1')

        // 2. The overview loads complete books for those operations.
        await openAccounting(page, teamId, 'summary')
        await expectCompleteBooks(page)
        await expect(page.locator('[data-test="balance-banner"]')).toContainText(
          'Books are balanced'
        )
        const cards = await readSummaryCards(page)
        for (const metric of ['Net income', 'Total revenue', 'Total expenses', 'Total assets']) {
          expect(cards[metric], `Expected the overview to report ${metric}`).toMatch(/^-?\$/)
        }

        await openAccounting(page, teamId, 'ledger', WHOLE_BOOK)
        const opening = await readLedger(page)
        expect(await ledgerEntryBadge(page)).toBe(opening.entries.length)

        // 3. One balanced entry per source operation.
        expect(duplicatedTransactions(opening.entries)).toEqual([])
        expect(unbalancedEntries(opening.entries)).toEqual([])
        const deposits = opening.entries.filter((entry) => entry.label === 'Service revenue')
        expect(deposits).toHaveLength(1)
        const issuance = entryLabelled(opening.entries, 'Share issuance')
        const accrual = entryLabelled(opening.entries, 'Wage accrual')
        entryLabelled(opening.entries, 'Wage settlement')
        const spend = entryLabelled(opening.entries, 'Operating expense')
        expect(entryAccounts(issuance)).toEqual(['SHERS To Be Issued', 'Investor Equity'])
        expect(entryAccounts(spend)).toContain('Operating Expense')

        // Funding the company's own contracts moves cash between pockets only.
        const fundings = opening.entries.filter((entry) => entry.label === 'Treasury funding')
        expect(fundings).toHaveLength(1)
        for (const funding of fundings) {
          const counterAccounts = entryAccounts(funding).filter(
            (account) => account !== 'Transaction Fee Expense'
          )
          expect(counterAccounts.every((account) => account.startsWith('Cash — '))).toBe(true)
        }

        for (const [txHash, label] of [
          [depositHash, 'Service revenue'],
          [funding.txHash, 'Treasury funding']
        ] as const) {
          expect(entriesForTransaction(opening.entries, txHash)).toHaveLength(1)
          expect(entriesForTransaction(opening.entries, txHash)[0]?.label).toBe(label)
        }

        // 4. An entry traces back to its transaction and to the accounts it moved.
        const deposit = deposits[0]!
        expect(deposit.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/)
        expect(entriesForTransaction(opening.entries, deposit.txHash)).toHaveLength(1)
        expect(entryAccounts(deposit)).toEqual(['Cash — Bank', 'Service Revenue'])
        const depositLine = deposit.lines[0]!
        expect(depositLine.date).not.toBe('')
        expect(depositLine.activity).not.toBe('')
        expect(depositLine.currency).toBe('USDC')
        expect(usdValue(depositLine.rate)).toBeGreaterThan(0)
        expect(Number(depositLine.quantity)).toBeGreaterThan(0)
        expect(accrual.txHash).toBe('')

        // The account the deposit moved carries that same transaction, so the
        // entry is reachable from either direction.
        const drilldown = await openAccountDrilldown(page, 'Cash — Bank')
        const drilledHashes = await drilldown
          .locator('[data-test="ledger-tx-hash"]')
          .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('title') ?? ''))
        expect(drilledHashes).toContain(deposit.txHash)
        await drilldown.getByRole('button', { name: 'Close', exact: true }).last().click()

        // 5. The three statements describe one consistent snapshot.
        await openAccounting(page, teamId, 'income')
        const income = await readAmounts(body)
        expect(
          usdValue(income['Total revenue']!) - usdValue(income['Total expenses']!)
        ).toBeCloseTo(usdValue(netIncomeOf(income)), 2)

        await openAccounting(page, teamId, 'balance')
        const balance = await readBalanceTotals(page)
        expect(balance.assets).toBe((await readAmounts(body))['Liabilities + Equity'])
        expect(balance.earnings).toBe(netIncomeOf(income))

        await openAccounting(page, teamId, 'trial')
        await expect(page.getByText('In balance', { exact: true })).toBeVisible()
        const trial = await readTrialBalance(page)
        expect(trial.at(-1)!.dr).toBe(trial.at(-1)!.cr)
        expect(sumUsd(trial.slice(0, -1).map((row) => row.dr))).toBeCloseTo(
          usdValue(trial.at(-1)!.dr),
          2
        )

        // 7. Reloading rebuilds the same books.
        await page.reload()
        await openAccounting(page, teamId, 'ledger', WHOLE_BOOK)
        const rebuilt = await readLedger(page)
        expect(rebuilt.total).toBe(opening.total)
        expect(normalizedLedger(rebuilt.entries)).toEqual(normalizedLedger(opening.entries))

        // 8. A treasury movement the portal cannot attribute.
        await withdrawToExternalAddress(page, teamId, E2E_NEW_SIGNER, '1')
        await openAccounting(page, teamId, 'ledger', WHOLE_BOOK)
        const withdrawal = entryLabelled((await readLedger(page)).entries, 'Cash payment')
        expect(entryAccounts(withdrawal)).toContain('Operating Expense')
        expect(entryTotals(withdrawal).debit).toBe(entryTotals(withdrawal).credit)
        const withdrawalTx = withdrawal.txHash
        expect(withdrawalTx).toMatch(/^0x[0-9a-fA-F]{64}$/)
        const cashLine = lineFor(withdrawal, 'Cash — Bank')
        const feeLine = lineFor(withdrawal, 'Transaction Fee Expense')

        await openAccounting(page, teamId, 'income')
        const beforeIncome = await readAmounts(body)
        await openAccounting(page, teamId, 'balance')
        const beforeBalance = await readBalanceTotals(page)

        await openAccounting(page, teamId, 'account-assignments')
        await expect(page.locator('[data-test="account-assignment-table"]')).toBeVisible()
        expect(await readAssignmentDecision(page)).toBe('Inferred account')

        // 9. The owner labels it, and the label survives a reload.
        await assignWithdrawalAccount(page, ASSIGNED_ACCOUNT, ASSIGNMENT_MEMO)
        await page.reload()
        await openAccounting(page, teamId, 'account-assignments')
        expect(await readAssignmentDecision(page)).toBe(ASSIGNED_ACCOUNT)

        // 10. The reports that depend on the movement follow it; the others do not.
        await openAccounting(page, teamId, 'ledger', WHOLE_BOOK)
        const labelled = entryLabelled((await readLedger(page)).entries, 'Cash payment')
        expect(entryAccounts(labelled)).toContain(ASSIGNED_ACCOUNT)
        expect(entryAccounts(labelled)).not.toContain('Operating Expense')
        expect(lineFor(labelled, 'Cash — Bank').cr).toBe(cashLine.cr)
        expect(lineFor(labelled, 'Transaction Fee Expense').dr).toBe(feeLine.dr)

        await openAccounting(page, teamId, 'income')
        const afterIncome = await readAmounts(body)
        expect(beforeIncome[ASSIGNED_ACCOUNT]).toBeUndefined()
        expect(usdValue(afterIncome[ASSIGNED_ACCOUNT]!)).toBeCloseTo(
          usdValue(cashLine.cr) - usdValue(feeLine.dr),
          2
        )
        expect(afterIncome['Total expenses']).toBe(beforeIncome['Total expenses'])
        expect(netIncomeOf(afterIncome)).toBe(netIncomeOf(beforeIncome))

        await openAccounting(page, teamId, 'balance')
        expect(await readBalanceTotals(page)).toEqual(beforeBalance)

        await openAccounting(page, teamId, 'trial')
        const afterTrial = await readTrialBalance(page)
        expect(afterTrial.find((row) => row.account === ASSIGNED_ACCOUNT)?.dr).toBe(
          afterIncome[ASSIGNED_ACCOUNT]
        )

        // 11. A member reads the label but is not offered the editor, and cannot write it.
        const listed = memberPage.waitForResponse((response) =>
          new URL(response.url()).pathname.endsWith('/accounting/account-assignment')
        )
        await openAccounting(memberPage, teamId, 'account-assignments')
        const apiOrigin = new URL((await listed).url()).origin
        expect(await canEditAssignments(memberPage)).toBe(false)
        expect(await readAssignmentDecision(memberPage)).toContain(ASSIGNED_ACCOUNT)
        const token = await memberPage.evaluate(() => localStorage.getItem('authToken'))
        const rejected = await memberPage.request.put(
          `${apiOrigin}/api/accounting/account-assignment`,
          {
            headers: { Authorization: `Bearer ${token}` },
            data: {
              teamId,
              journalEntryId: withdrawalTx.toLowerCase(),
              accountId: 'owner-capital'
            }
          }
        )
        expect(rejected.status()).toBe(403)

        // 12. The export carries exactly the reviewed state.
        await openAccounting(page, teamId, 'ledger', WHOLE_BOOK)
        await page.getByRole('button', { name: 'All accounts' }).click()
        await page.locator('[data-test="account-filter-all"]').click()
        await page.locator(`[data-test="account-filter-${ASSIGNED_ACCOUNT_ID}"]`).click()
        await page.keyboard.press('Escape')
        await expect(page.locator('[data-test="export-context"]')).toContainText('1 entry')
        const scoped = await readLedger(page)
        expect(scoped.entries).toHaveLength(1)
        expect(scoped.entries[0]!.lines).toHaveLength(labelled.lines.length)

        const workbook = await exportCurrentReport(page)
        expect(workbook.filename).toBe('General Ledger.xlsx')
        const sheet = workbook.sheets['General Ledger']!
        const exported = ledgerDataRows(sheet)
        expect(exported).toHaveLength(scoped.entries[0]!.lines.length)
        expect(exported.map((row) => String(row[3] ?? ''))).toContain(withdrawalTx)
        expect(exported.some((row) => String(row[5]) === ASSIGNED_ACCOUNT)).toBe(true)
        expect(Number(ledgerTotalRow(sheet)[9])).toBe(usdValue(scoped.total))

        await openAccounting(page, teamId, 'summary')
        const report = await exportSelectedSections(page, ['income', 'trial'])
        expect(Object.keys(report.sheets)).toEqual(['Income Statement', 'Trial Balance'])
        expect(Number(sheetRow(report.sheets['Income Statement']!, ASSIGNED_ACCOUNT)[1])).toBe(
          usdValue(afterIncome[ASSIGNED_ACCOUNT]!)
        )
        expect(Number(sheetRow(report.sheets['Trial Balance']!, 'Total')[2])).toBe(
          usdValue(afterTrial.at(-1)!.dr)
        )

        // 13. Removing the label restores the account inferred from the evidence.
        await openAccounting(page, teamId, 'account-assignments')
        await revertWithdrawalAccount(page)
        expect(await readAssignmentDecision(page)).toBe('Inferred account')
        await openAccounting(page, teamId, 'ledger', WHOLE_BOOK)
        const reverted = entryLabelled((await readLedger(page)).entries, 'Cash payment')
        expect(entryAccounts(reverted)).toContain('Operating Expense')
        expect(entryAccounts(reverted)).not.toContain(ASSIGNED_ACCOUNT)
        expect(lineFor(reverted, 'Cash — Bank').cr).toBe(cashLine.cr)
      } finally {
        await memberContext.close()
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, teamId, company.team.name)
        }
      }
    })
  }
)

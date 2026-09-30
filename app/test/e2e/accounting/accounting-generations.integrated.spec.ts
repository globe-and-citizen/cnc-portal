import { expect, test } from '../fixtures/integrated'
import { E2E_OWNER_PRIVATE_KEY } from '../e2e-chain'
import { useWallet } from '../e2e-page'
import { createOperationalCompany, deleteCompanyThroughUi } from '../company/real-company-page'
import {
  entriesForTransaction,
  entryAccounts,
  normalizedLedger,
  usdValue
} from './accounting-books'
import {
  expectCompleteBooks,
  openAccounting,
  readLedger,
  readTrialBalance
} from './accounting-page'
import { depositUsdcToBank, redeployContractsThroughUi } from './accounting-operations'

const WHOLE_BOOK = '?ledgerSize=100'
const FIRST_BANK = 'Cash — Bank'
const SECOND_BANK = 'Cash — Bank 2'

test.describe(
  '[US-ACCT-005] Integrated Accounting contract generations',
  { tag: ['@US-ACCT-005', '@integrated'] },
  () => {
    test.setTimeout(600_000)

    /**
     * Covers:
     * - [AC-US-ACCT-005-01]
     * - [AC-US-ACCT-005-02]
     * - [AC-US-ACCT-005-05]
     * - [AC-US-ACCT-005-09]
     */
    test('reports a redeployed treasury as its own account while both generations stay complete', async ({
      page
    }) => {
      await useWallet(page, E2E_OWNER_PRIVATE_KEY)
      const company = await createOperationalCompany(page)
      const teamId = company.teamId

      try {
        await page.locator('[data-test="skip-safe-setup-button"]').click()

        // The first generation books its own treasury deposit.
        const firstDepositHash = await depositUsdcToBank(page, teamId, '4')
        await openAccounting(page, teamId, 'ledger', WHOLE_BOOK)
        const firstGeneration = await readLedger(page)
        expect(firstGeneration.entries).toHaveLength(1)
        expect(entryAccounts(firstGeneration.entries[0]!)).toContain(FIRST_BANK)

        // A second generation of contracts, then an operation on the new Bank.
        await redeployContractsThroughUi(page, teamId)
        const secondDepositHash = await depositUsdcToBank(page, teamId, '6')

        await openAccounting(page, teamId, 'ledger', WHOLE_BOOK)
        await expectCompleteBooks(page)
        const consolidated = await readLedger(page)
        expect(consolidated.entries).toHaveLength(2)

        // Pre- and post-migration operations contribute to the same books, each
        // booked against the deployment that actually held the cash.
        const banks = consolidated.entries.flatMap(
          (entry) => entry.lines.find((line) => line.account.startsWith(FIRST_BANK)) ?? []
        )
        expect(banks.map((line) => line.account).sort()).toEqual([FIRST_BANK, SECOND_BANK])
        expect(usdValue(consolidated.total)).toBeGreaterThan(usdValue(firstGeneration.total))
        const hashes = consolidated.entries.map((entry) => entry.txHash)
        expect(new Set(hashes).size).toBe(2)
        expect(hashes).toContain(firstGeneration.entries[0]!.txHash)
        for (const hash of [firstDepositHash, secondDepositHash]) {
          expect(entriesForTransaction(consolidated.entries, hash)).toHaveLength(1)
          expect(entriesForTransaction(consolidated.entries, hash)[0]?.label).toBe(
            'Service revenue'
          )
        }

        // Each deployment keeps its own Trial Balance row and redeploy hint.
        await openAccounting(page, teamId, 'trial')
        const trial = await readTrialBalance(page)
        const bankRows = trial.filter((row) => row.account.startsWith('Cash — Bank'))
        expect(bankRows.map((row) => row.account).sort()).toEqual([FIRST_BANK, SECOND_BANK])
        await expect(page.locator(`[data-test="redeploy-hint-${SECOND_BANK}"]`)).toBeVisible()
        expect(trial.at(-1)!.dr).toBe(trial.at(-1)!.cr)

        // The consolidated books survive a reload unchanged.
        await page.reload()
        await openAccounting(page, teamId, 'ledger', WHOLE_BOOK)
        const rebuilt = await readLedger(page)
        expect(rebuilt.total).toBe(consolidated.total)
        expect(normalizedLedger(rebuilt.entries)).toEqual(normalizedLedger(consolidated.entries))
      } finally {
        if (!page.isClosed()) {
          await deleteCompanyThroughUi(page, teamId, company.team.name)
        }
      }
    })
  }
)

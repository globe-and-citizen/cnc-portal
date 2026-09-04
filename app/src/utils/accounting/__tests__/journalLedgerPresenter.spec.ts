import { describe, expect, it } from 'vitest'
import { buildJournal } from '@/utils/accounting/generalLedger'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import {
  filterJournalLedgerByAccount,
  filterJournalLedgerByCurrency,
  journalLedgerAccounts,
  journalLedgerRows,
  journalLedgerTotal
} from '@/utils/accounting/journalLedgerPresenter'

const BANK_A = '0x1111111111111111111111111111111111111111'
const BANK_B = '0x2222222222222222222222222222222222222222'

function posting(overrides: Partial<LedgerEntry> & Pick<LedgerEntry, 'id'>): LedgerEntry {
  return {
    timestamp: 100,
    useCase: 'UC-BANK-03',
    debit: 'Cash — Payroll',
    credit: 'Cash — Bank',
    debitInstance: '0x3333333333333333333333333333333333333333',
    creditInstance: BANK_A,
    amountUsd: 100,
    token: 'usdc',
    rawAmount: '100000000',
    rate: 1,
    internal: true,
    memo: 'Fund payroll',
    enrichment: 'not-applicable',
    ...overrides
  }
}

describe('journalLedgerPresenter', () => {
  it('renders every line of a transfer plus fee as one ordinary JournalEntry', () => {
    const journal = buildJournal([
      posting({ id: 'transfer', sourceOperationId: 'operation-42' }),
      posting({
        id: 'fee',
        sourceOperationId: 'operation-42',
        useCase: 'FEE',
        debit: 'Transaction Fee Expense',
        debitInstance: undefined,
        amountUsd: 1,
        rawAmount: '1000000',
        internal: false,
        memo: 'Transaction fee'
      })
    ])

    expect(journal).toHaveLength(1)
    const rows = journalLedgerRows(journal)
    expect(rows.map((row) => row.account)).toEqual([
      'Cash — Payroll',
      'Transaction Fee Expense',
      'Cash — Bank'
    ])
    expect(rows.map((row) => row.isFee)).toEqual([undefined, undefined, undefined])
    expect(rows.map((row) => row.isFirst)).toEqual([true, false, false])
    expect(journalLedgerTotal(journal)).toBe('$101.00')
  })

  it('filters by concrete account and currency without dropping the other entry lines', () => {
    const journal = buildJournal([
      posting({ id: 'a', sourceOperationId: 'operation-a', creditInstance: BANK_A }),
      posting({ id: 'b', sourceOperationId: 'operation-b', creditInstance: BANK_B, timestamp: 200 })
    ])
    const accounts = journalLedgerAccounts(journal)
    const bankB = accounts.find((account) => account.label === 'Cash — Bank 2')!

    const byAccount = filterJournalLedgerByAccount(journal, [bankB.value])
    const byCurrency = filterJournalLedgerByCurrency(byAccount, ['USDC'])

    expect(byCurrency.map((entry) => entry.id)).toEqual(['operation-b'])
    expect(journalLedgerRows(byCurrency)).toHaveLength(2)
  })
})

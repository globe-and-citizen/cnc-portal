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

  it('names both concrete Bank deployments in an internal-transfer activity', () => {
    const journal = buildJournal([
      posting({
        id: 'bank-a-seed',
        timestamp: 50,
        useCase: 'UC-BANK-02',
        debit: 'Cash — Bank',
        debitInstance: BANK_A,
        credit: 'Service Revenue',
        creditInstance: undefined,
        internal: false
      }),
      posting({
        id: 'bank-b-seed',
        timestamp: 90,
        useCase: 'UC-BANK-02',
        debit: 'Cash — Bank',
        debitInstance: BANK_B,
        credit: 'Service Revenue',
        creditInstance: undefined,
        internal: false
      }),
      posting({
        id: 'bank-migration',
        debit: 'Cash — Bank',
        debitInstance: BANK_B,
        credit: 'Cash — Bank',
        creditInstance: BANK_A,
        internal: true
      })
    ])

    const rows = journalLedgerRows(journal)
    const transferStart = rows.findIndex((row) => row.isFirst && row.label === 'Treasury funding')
    const transferRows = rows.slice(transferStart, transferStart + 2)

    expect(transferRows[0]?.activity).toEqual({
      kind: 'transfer',
      from: 'Cash — Bank',
      to: 'Cash — Bank 2'
    })
    expect(transferRows.map((row) => row.accountLabel ?? row.account)).toEqual([
      'Cash — Bank 2',
      'Cash — Bank'
    ])
  })

  it('keeps an unresolved Bank explicit in an internal-transfer activity', () => {
    const journal = buildJournal([
      posting({
        id: 'unresolved-bank-transfer',
        debit: 'Cash — Bank',
        debitInstance: BANK_A,
        credit: 'Cash — Bank',
        creditInstance: undefined,
        internal: true
      })
    ])

    expect(journalLedgerRows(journal)[0]?.activity).toEqual({
      kind: 'transfer',
      from: 'Cash — Bank (unresolved)',
      to: 'Cash — Bank'
    })
  })

  it('does not name individual lenders on one multi-lender credit repayment transaction', () => {
    const txHash = `0x${'b'.repeat(64)}`
    const journal = buildJournal([
      posting({
        id: `${txHash}-8`,
        useCase: 'UC-CREDIT-03',
        debit: 'Loan Payable',
        credit: 'Cash — Bank',
        amountUsd: 2,
        rawAmount: '2000000',
        counterparty: '0x4444444444444444444444444444444444444444',
        internal: false
      }),
      posting({
        id: `${txHash}-9`,
        useCase: 'UC-CREDIT-03',
        debit: 'Loan Payable',
        credit: 'Cash — Bank',
        amountUsd: 2,
        rawAmount: '2000000',
        counterparty: '0x5555555555555555555555555555555555555555',
        internal: false
      })
    ])

    const rows = journalLedgerRows(journal)
    const [first] = rows

    expect(journal).toHaveLength(1)
    expect(first?.activity).toEqual({ kind: 'plain', text: 'Credit repayment' })
    expect(rows.map((row) => row.txHash)).toEqual([txHash, undefined])
  })
})

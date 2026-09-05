import { describe, expect, it } from 'vitest'
import { buildJournal } from '../generalLedger'
import { makeEntry, type LedgerEntry } from '../ledgerEntry'
import { presentJournalClassification } from '../journalClassification'
import { journalLedgerRows } from '../journalLedgerPresenter'
import { accountFor } from '../accountRegistry'
import { ADDR } from './fixtures'

const TX = `0x${'a'.repeat(64)}`
const BANK2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

function withdrawal(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return makeEntry({
    id: `${TX}-7`,
    timestamp: 100,
    useCase: 'CASH-OUT',
    debit: 'Operating Expense',
    credit: 'Cash — Bank',
    creditInstance: ADDR.bank,
    amountUsd: 100,
    token: 'usdc',
    rawAmount: '100000000',
    rate: 1,
    memo: 'External withdrawal',
    ...overrides
  })
}

function fee(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return withdrawal({
    id: `${TX}-8`,
    useCase: 'FEE',
    debit: 'Transaction Fee Expense',
    amountUsd: 1,
    rawAmount: '1000000',
    ...overrides
  })
}

describe('journal Classification projection', () => {
  it('shows the same complete 100 + 1 fee journal as the General Ledger, with one edit target', () => {
    const journal = buildJournal([withdrawal(), fee()])
    const view = presentJournalClassification(journal)
    expect(view.entryCount).toBe(1)
    expect(view.rows).toHaveLength(3)
    expect(view.rows.filter((row) => row.isFirst)).toHaveLength(1)
    expect(view.rows.map((row) => [row.account, row.dr, row.cr])).toEqual([
      ['Operating Expense', '$100.00', ''],
      ['Transaction Fee Expense', '$1.00', ''],
      ['Cash — Bank', '', '$101.00']
    ])
    expect(view.rows).toEqual(
      journalLedgerRows(journal).map((row) => ({
        ...row,
        journalEntryId: TX,
        target: { sourceEntryId: `${TX}-7` },
        savedDecisions: [],
        reviewRequired: false
      }))
    )
  })

  it('retains the exact persisted source key, category and note after journal grouping', () => {
    const journal = buildJournal([
      withdrawal({
        id: 'safe-transfer-service-id',
        txHash: TX,
        credit: 'Cash — Safe',
        debit: 'Loan Payable',
        classified: 'SHAREHOLDER_LOAN',
        memo: 'Repay the founder'
      })
    ])
    const row = presentJournalClassification(journal).rows[0]!
    expect(row.journalEntryId).toBe(TX)
    expect(row.target).toEqual({
      sourceEntryId: 'safe-transfer-service-id',
      category: 'SHAREHOLDER_LOAN',
      memo: 'Repay the founder'
    })
    expect(row.account).toBe('Loan Payable')
  })

  it('reads amounts and concrete accounts from journal lines even if source metadata differs', () => {
    const journal = buildJournal([withdrawal()])
    journal[0]!.lines = [
      { id: 'debit', account: accountFor('Loan Payable'), debit: 9 },
      { id: 'credit', account: accountFor('Cash — Bank', BANK2), credit: 9 }
    ]
    const view = presentJournalClassification(journal)
    expect(view.rows.map((row) => [row.account, row.dr, row.cr])).toEqual([
      ['Loan Payable', '$9.00', ''],
      ['Cash — Bank', '', '$9.00']
    ])
    expect(view.rows[1]!.accountInstance?.toLowerCase()).toBe(BANK2)
  })

  it('numbers Bank generations from the entire journal and keeps unresolved accounts distinct', () => {
    const journal = buildJournal([
      withdrawal({
        id: 'deposit',
        timestamp: 1,
        useCase: 'UC-BANK-02',
        debit: 'Cash — Bank',
        debitInstance: ADDR.bank,
        credit: 'Service Revenue'
      }),
      withdrawal({ id: 'bank2-out', timestamp: 200, creditInstance: BANK2 }),
      withdrawal({ id: 'unknown-out', timestamp: 300, creditInstance: undefined })
    ])
    const view = presentJournalClassification(journal)
    expect(view.entryCount).toBe(2)
    expect(
      view.rows.filter((row) => row.account === 'Cash — Bank').map((row) => row.accountLabel)
    ).toEqual(['Cash — Bank (unresolved)', 'Cash — Bank 2'])
    expect(
      new Set(view.rows.filter((row) => row.account === 'Cash — Bank').map((row) => row.accountId))
        .size
    ).toBe(2)
  })

  it.each([
    { useCase: 'UC-BANK-02', debit: 'Cash — Bank', credit: 'Service Revenue' },
    {
      useCase: 'CASH-IN',
      debit: 'Cash — Safe',
      credit: 'Owner Capital',
      classified: 'OWNER_CAPITAL'
    },
    { useCase: 'INTERNAL', debit: 'Cash — Safe', internal: true },
    { useCase: 'UC-INV-01', debit: 'Dividend Expense', credit: 'Cash — Safe' },
    { useCase: 'UC-CREDIT-03', debit: 'Loan Payable' },
    { useCase: 'UC-EXP-01', credit: 'Cash — Expense' },
    { useCase: 'DEFAULT-D', debit: null, credit: null }
  ] satisfies Partial<LedgerEntry>[])('does not offer classification for $useCase', (fields) => {
    expect(presentJournalClassification(buildJournal([withdrawal(fields)]))).toEqual({
      rows: [],
      entryCount: 0
    })
  })

  it('never turns a fee or an internal transfer with a fee into a manual withdrawal', () => {
    expect(presentJournalClassification(buildJournal([fee()])).entryCount).toBe(0)
    const journal = buildJournal([
      withdrawal({ useCase: 'UC-BANK-03', debit: 'Cash — Safe', internal: true }),
      fee()
    ])
    expect(journal[0]!.internal).toBe(false)
    expect(presentJournalClassification(journal).entryCount).toBe(0)
  })

  it('keeps several classified withdrawals in one read-only journal and preserves their notes', () => {
    const journal = buildJournal([
      withdrawal({ classified: 'EXPENSE', memo: 'Supplies' }),
      withdrawal({
        id: `${TX}-9`,
        classified: 'PAYROLL_EXPENSE',
        debit: 'Payroll Expense',
        memo: 'Wages'
      }),
      fee()
    ])
    const view = presentJournalClassification(journal)
    expect(view.entryCount).toBe(1)
    expect(view.rows).toHaveLength(4)
    expect(view.rows.every((row) => !row.target && row.reviewRequired)).toBe(true)
    expect(view.rows[0]!.savedDecisions).toEqual(['Expense — Supplies', 'Payroll — Wages'])
    expect(view.rows.at(-1)!.cr).toBe('$201.00')
  })

  it('does not treat coalesced same-account withdrawals as one editable source', () => {
    const journal = buildJournal([withdrawal(), withdrawal({ id: `${TX}-9` })])
    const view = presentJournalClassification(journal)
    expect(view.rows).toHaveLength(2)
    expect(view.rows[0]!.dr).toBe('$200.00')
    expect(view.rows[0]!.target).toBeUndefined()
    expect(view.rows[0]!.reviewRequired).toBe(true)
  })

  it('keeps mixed-currency amounts on separate journal lines', () => {
    const view = presentJournalClassification(
      buildJournal([
        withdrawal(),
        withdrawal({
          id: `${TX}-9`,
          token: 'native',
          rawAmount: '2000000000000000000',
          rate: 2,
          amountUsd: 4
        })
      ])
    )
    expect(view.entryCount).toBe(1)
    expect(view.rows).toHaveLength(4)
    expect(new Set(view.rows.map((row) => row.currency)).size).toBe(2)
    expect(view.rows.map((row) => row.dr).filter(Boolean)).toEqual(['$100.00', '$4.00'])
    expect(view.rows[0]!.target).toBeUndefined()
  })

  it('keeps a withdrawal mixed with a system-owned payment read-only', () => {
    const view = presentJournalClassification(
      buildJournal([
        withdrawal(),
        withdrawal({ id: `${TX}-9`, useCase: 'UC-CREDIT-03', debit: 'Loan Payable' })
      ])
    )
    expect(view.entryCount).toBe(1)
    expect(view.rows[0]!.reviewRequired).toBe(true)
    expect(view.rows[0]!.target).toBeUndefined()
  })
})

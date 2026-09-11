import { describe, expect, it } from 'vitest'
import type { JournalAccountAssignmentRecord } from '@/types/journal-account-assignment'
import { accountFor } from '../accountRegistry'
import { finalizeJournal } from './assembleAccounting'
import { applyJournalAccountAssignments } from '../journalAccountAssignment'
import { presentJournalAccountAssignments } from '../journalAccountAssignmentPresenter'
import { journalLedgerRows } from '../journalLedgerPresenter'
import { makeJournalEntryDraft, type JournalEntryDraft } from '../journalEntryDraft'
import { ADDR } from './fixtures'

const TX = `0x${'a'.repeat(64)}`
const BANK2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

function withdrawal(overrides: Partial<JournalEntryDraft> = {}): JournalEntryDraft {
  return makeJournalEntryDraft({
    id: `${TX}-7`,
    timestamp: 100,
    useCase: 'CASH-OUT',
    debit: 'Operating Expense',
    credit: 'Cash — Bank',
    creditInstance: ADDR.bank,
    token: 'usdc',
    rawAmount: '100000000',
    rate: 1,
    memo: 'External withdrawal',
    ...overrides
  })
}

function fee(overrides: Partial<JournalEntryDraft> = {}): JournalEntryDraft {
  return withdrawal({
    id: `${TX}-8`,
    useCase: 'FEE',
    debit: 'Transaction Fee Expense',
    rawAmount: '1000000',
    ...overrides
  })
}

function assignment(accountId: string, memo: string | null = null): JournalAccountAssignmentRecord {
  return {
    id: 1,
    teamId: 1,
    journalEntryId: TX,
    accountId,
    memo,
    assignedByAddress: ADDR.founder,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

describe('JournalEntry account-assignment projection', () => {
  it('shows the same complete 100 + 1 fee journal as the General Ledger', () => {
    const journal = finalizeJournal([withdrawal(), fee()])
    const view = presentJournalAccountAssignments(journal)
    expect(view.entryCount).toBe(1)
    expect(view.rows).toHaveLength(3)
    expect(view.rows.map((row) => [row.account, row.dr, row.cr])).toEqual([
      ['Operating Expense', '$100.00', ''],
      ['Transaction Fee Expense', '$1.00', ''],
      ['Cash — Bank', '', '$101.00']
    ])
    expect(view.rows).toEqual(
      journalLedgerRows(journal).map((row) => ({
        ...row,
        journalEntryId: TX,
        target: { journalEntryId: TX },
        reviewRequired: false
      }))
    )
  })

  it('reads the selected account and note from the applied JournalEntry', () => {
    const journal = applyJournalAccountAssignments(finalizeJournal([withdrawal()]), [
      assignment('interest-expense', 'Pay the founder interest')
    ])
    const row = presentJournalAccountAssignments(journal).rows[0]!
    expect(row.journalEntryId).toBe(TX)
    expect(row.target).toEqual({
      journalEntryId: TX,
      accountId: 'interest-expense',
      memo: 'Pay the founder interest'
    })
    expect(row.account).toBe('Interest Expense')
    expect(row.savedDecision).toBe('Interest Expense — Pay the founder interest')
  })

  it('reads amounts and concrete accounts only from journal lines', () => {
    const journal = finalizeJournal([withdrawal()])
    journal[0]!.lines = [
      { id: 'debit', account: accountFor('Loan Payable'), debit: 9n },
      { id: 'credit', account: accountFor('Cash — Bank', BANK2), credit: 9n }
    ]
    const view = presentJournalAccountAssignments(journal)
    expect(view.rows.map((row) => [row.account, row.dr, row.cr])).toEqual([
      ['Loan Payable', '$0.00', ''],
      ['Cash — Bank', '', '$0.00']
    ])
    expect(view.rows[1]!.accountInstance?.toLowerCase()).toBe(BANK2)
  })

  it('numbers Bank generations from the whole journal and keeps unresolved accounts distinct', () => {
    const journal = finalizeJournal([
      withdrawal({
        id: 'deposit',
        timestamp: 1,
        useCase: 'UC-BANK-02',
        debit: 'Cash — Bank',
        debitInstance: ADDR.bank,
        credit: 'Service Revenue'
      }),
      withdrawal({ id: `${TX}-9`, timestamp: 200, creditInstance: BANK2 }),
      withdrawal({ id: `${TX}-10`, timestamp: 300, creditInstance: undefined })
    ])
    const view = presentJournalAccountAssignments(journal)
    expect(view.entryCount).toBe(1)
    expect(
      view.rows.filter((row) => row.account === 'Cash — Bank').map((row) => row.accountLabel)
    ).toEqual(['Cash — Bank 2', 'Cash — Bank (unresolved)'])
  })

  it.each([
    { useCase: 'UC-BANK-02', debit: 'Cash — Bank', credit: 'Service Revenue' },
    { useCase: 'INTERNAL', debit: 'Cash — Safe', internal: true },
    { useCase: 'UC-INV-01', debit: 'Dividend Expense', credit: 'Cash — Safe' },
    { useCase: 'UC-CREDIT-03', debit: 'Loan Payable' },
    { useCase: 'UC-EXP-01', credit: 'Cash — Expense' },
    { useCase: 'DEFAULT-D', debit: null, credit: null }
  ] satisfies Partial<JournalEntryDraft>[])('does not offer assignment for $useCase', (fields) => {
    expect(presentJournalAccountAssignments(finalizeJournal([withdrawal(fields)]))).toEqual({
      rows: [],
      entryCount: 0
    })
  })

  it('never turns a fee or an internal transfer with a fee into an assignable withdrawal', () => {
    expect(presentJournalAccountAssignments(finalizeJournal([fee()])).entryCount).toBe(0)
    const journal = finalizeJournal([
      withdrawal({ useCase: 'UC-BANK-03', debit: 'Cash — Safe', internal: true }),
      fee()
    ])
    expect(journal[0]!.internal).toBe(true)
    expect(presentJournalAccountAssignments(journal).entryCount).toBe(0)
  })

  it('keeps compound withdrawals visible but read-only', () => {
    const journal = finalizeJournal([withdrawal(), withdrawal({ id: `${TX}-9` }), fee()])
    const view = presentJournalAccountAssignments(journal)
    expect(view.entryCount).toBe(1)
    expect(view.rows.every((row) => !row.target && row.reviewRequired)).toBe(true)
  })

  it('keeps mixed-currency compound withdrawals read-only', () => {
    const view = presentJournalAccountAssignments(
      finalizeJournal([
        withdrawal(),
        withdrawal({
          id: `${TX}-9`,
          token: 'native',
          rawAmount: '2000000000000000000',
          rate: 2
        })
      ])
    )
    expect(view.entryCount).toBe(1)
    expect(view.rows).toHaveLength(4)
    expect(new Set(view.rows.map((row) => row.currency)).size).toBe(2)
    expect(view.rows[0]!.target).toBeUndefined()
  })
})

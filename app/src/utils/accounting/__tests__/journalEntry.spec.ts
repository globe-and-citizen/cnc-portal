import { describe, expect, it } from 'vitest'
import {
  buildJournal,
  createJournalEntry,
  isBalanced,
  type JournalEntry
} from '@/utils/accounting/generalLedger'
import { buildAccountRegistry } from '@/utils/accounting/accountRegistry'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const accounts = buildAccountRegistry([])

function account(name: AccountName) {
  return accounts.resolve(name)
}

function monetaryEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'operation-42:principal',
    sourceOperationId: 'operation-42',
    timestamp: 1_700_000_000,
    useCase: 'UC-BANK-03',
    memo: 'Fund payroll',
    internal: true,
    kind: 'monetary',
    lines: [
      {
        id: 'operation-42:principal:debit',
        account: account('Cash — Payroll'),
        debit: 10
      },
      {
        id: 'operation-42:principal:credit',
        account: account('Cash — Bank'),
        credit: 10
      }
    ],
    ...overrides
  }
}

describe('JournalEntry', () => {
  it('keeps entry and source-operation identities distinct for one multi-entry operation', () => {
    const principal = createJournalEntry(monetaryEntry())
    const fee = createJournalEntry(
      monetaryEntry({
        id: 'operation-42:fee',
        useCase: 'FEE',
        memo: 'Transaction fee',
        lines: [
          {
            id: 'operation-42:fee:debit',
            account: account('Transaction Fee Expense'),
            debit: 0.05
          },
          {
            id: 'operation-42:fee:credit',
            account: account('Cash — Bank'),
            credit: 0.05
          }
        ]
      })
    )

    expect(principal.sourceOperationId).toBe(fee.sourceOperationId)
    expect(principal.id).not.toBe(fee.id)
    expect(principal.lines.map((line) => line.id)).toEqual([
      'operation-42:principal:debit',
      'operation-42:principal:credit'
    ])
    expect(isBalanced(principal)).toBe(true)
    expect(isBalanced(fee)).toBe(true)
  })

  it('accepts a compound entry with one credit and several debit lines', () => {
    const compound = createJournalEntry(
      monetaryEntry({
        lines: [
          { id: 'operation-42:cash', account: account('Cash — Expense'), debit: 10 },
          {
            id: 'operation-42:fee',
            account: account('Transaction Fee Expense'),
            debit: 0.05
          },
          { id: 'operation-42:bank', account: account('Cash — Bank'), credit: 10.05 }
        ]
      })
    )

    expect(compound.lines).toHaveLength(3)
    expect(isBalanced(compound)).toBe(true)
  })

  it('represents a memo-only entry explicitly without monetary lines', () => {
    const memo = createJournalEntry(
      monetaryEntry({
        id: 'operation-99:memo',
        sourceOperationId: 'operation-99',
        useCase: 'DEFAULT-D',
        memo: 'Direct SHER mint',
        internal: false,
        kind: 'memo',
        lines: []
      })
    )

    expect(memo.kind).toBe('memo')
    expect(memo.lines).toEqual([])
    expect(isBalanced(memo)).toBe(true)
  })

  it('rejects a memo entry that contains a monetary line', () => {
    expect(() =>
      createJournalEntry(
        monetaryEntry({
          kind: 'memo',
          lines: [{ id: 'operation-42:memo', account: account('Cash — Bank'), debit: 10 }]
        })
      )
    ).toThrow('memo entries cannot contain monetary lines')
  })

  it('rejects an unbalanced entry before a projection can consume it', () => {
    expect(() =>
      createJournalEntry(
        monetaryEntry({
          lines: [
            { id: 'operation-42:debit', account: account('Cash — Payroll'), debit: 10 },
            { id: 'operation-42:credit', account: account('Cash — Bank'), credit: 9.99 }
          ]
        })
      )
    ).toThrow('debit and credit totals must balance')
  })

  it('rejects a monetary entry that has no credit line', () => {
    expect(() =>
      createJournalEntry(
        monetaryEntry({
          lines: [{ id: 'operation-42:debit', account: account('Cash — Payroll'), debit: 10 }]
        })
      )
    ).toThrow('monetary entries require at least one debit and one credit line')
  })

  it('rejects a monetary line without a canonical account identity', () => {
    expect(() =>
      createJournalEntry(
        monetaryEntry({
          lines: [
            {
              id: 'operation-42:debit',
              account: { ...account('Cash — Payroll'), id: '' },
              debit: 10
            },
            { id: 'operation-42:credit', account: account('Cash — Bank'), credit: 10 }
          ]
        })
      )
    ).toThrow('account id is required')
  })

  it('adapts a consolidated posting with deterministic source, line and account identities', () => {
    const posting: LedgerEntry = {
      id: 'bank-event-7',
      timestamp: 1_700_000_001,
      useCase: 'UC-BANK-02',
      debit: 'Cash — Bank',
      credit: 'Service Revenue',
      amountUsd: 100,
      token: 'usdc',
      rawAmount: '100000000',
      internal: false,
      memo: 'Client payment',
      enrichment: 'not-applicable'
    }

    expect(buildJournal([posting])).toMatchObject([
      {
        id: 'bank-event-7',
        sourceOperationId: 'bank-event-7',
        kind: 'monetary',
        lines: [
          {
            id: 'bank-event-7:debit',
            account: {
              id: 'cash-bank:unresolved',
              family: { id: 'cash-bank', name: 'Cash — Bank' },
              resolution: 'unresolved'
            },
            debit: 100
          },
          {
            id: 'bank-event-7:credit',
            account: {
              id: 'service-revenue',
              family: { id: 'service-revenue', name: 'Service Revenue' },
              resolution: 'resolved'
            },
            credit: 100
          }
        ]
      }
    ])
  })
})

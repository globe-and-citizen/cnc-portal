import { describe, expect, it } from 'vitest'
import { assembleFromRawEntries } from '@/utils/accounting/assemble'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

function posting(overrides: Partial<LedgerEntry> & Pick<LedgerEntry, 'id'>): LedgerEntry {
  return {
    timestamp: 100,
    useCase: 'UC-BANK-03',
    debit: 'Cash — Payroll',
    credit: 'Cash — Bank',
    amountUsd: 10,
    token: 'usdc',
    rawAmount: '10000000',
    internal: true,
    memo: 'Fund payroll',
    enrichment: 'not-applicable',
    ...overrides
  }
}

describe('accounting journal assembly', () => {
  it('builds one balanced multi-line JournalEntry for one source operation', () => {
    const sourceOperationId = 'bank-transfer-42'
    const transfer = posting({ id: `${sourceOperationId}:transfer`, sourceOperationId })
    const fee = posting({
      id: `${sourceOperationId}:fee`,
      sourceOperationId,
      timestamp: 101,
      useCase: 'FEE',
      debit: 'Transaction Fee Expense',
      amountUsd: 0.05,
      rawAmount: '50000',
      internal: false,
      memo: 'Transaction fee'
    })

    const accounting = assembleFromRawEntries([fee, transfer])

    expect(accounting.journal).toHaveLength(1)
    expect(accounting.journal[0]).toMatchObject({
      id: sourceOperationId,
      sourceOperationId,
      lines: [
        { account: { family: { name: 'Cash — Payroll' } }, debit: 10 },
        { account: { family: { name: 'Transaction Fee Expense' } }, debit: 0.05 },
        { account: { family: { name: 'Cash — Bank' } }, credit: 10.05 }
      ]
    })
    expect(accounting.generalLedger.entries).toEqual(accounting.journal)
  })

  it('withholds an orphan Bank fee at the JournalEntry boundary', () => {
    const sourceOperationId = 'bank-fee-without-outflow'
    const fee = posting({
      id: `${sourceOperationId}:fee`,
      sourceOperationId,
      useCase: 'FEE',
      debit: 'Transaction Fee Expense',
      credit: 'Cash — Bank',
      amountUsd: 0.05,
      rawAmount: '50000',
      internal: false,
      memo: 'Transaction fee'
    })

    const accounting = assembleFromRawEntries([fee])

    expect(accounting.entries).toEqual([])
    expect(accounting.journal).toEqual([])
    expect(accounting.unmatchedFeeOperationIds).toEqual([sourceOperationId])
  })

  it('rejects an invalid normalized posting at the assembly boundary', () => {
    const invalid = posting({ id: 'broken-posting', useCase: 'CASH-IN', credit: null })

    expect(() => assembleFromRawEntries([invalid])).toThrow(
      'monetary entries require at least one debit and one credit line'
    )
  })
})

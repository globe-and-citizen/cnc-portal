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
  it('builds one ordered journal for multiple postings from one source operation', () => {
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

    expect(accounting.journal.map((entry) => entry.id)).toEqual([transfer.id, fee.id])
    expect(accounting.journal.map((entry) => entry.sourceOperationId)).toEqual([
      sourceOperationId,
      sourceOperationId
    ])
    expect(accounting.generalLedger.entries).toEqual(accounting.journal)
  })

  it('rejects an invalid normalized posting at the assembly boundary', () => {
    const invalid = posting({ id: 'broken-posting', useCase: 'CASH-IN', credit: null })

    expect(() => assembleFromRawEntries([invalid])).toThrow(
      'monetary entries require at least one debit and one credit line'
    )
  })
})

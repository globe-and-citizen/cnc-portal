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

  it('groups every indexed event from one transaction into one JournalEntry', () => {
    const txHash = `0x${'a'.repeat(64)}`
    const counterparties = [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333',
      '0x4444444444444444444444444444444444444444'
    ]
    const repayments = counterparties.map((counterparty, logIndex) =>
      posting({
        id: `${txHash}-${logIndex}`,
        useCase: 'UC-CREDIT-03',
        debit: 'Loan Payable',
        credit: 'Cash — Bank',
        amountUsd: 2,
        rawAmount: '2000000',
        counterparty,
        internal: false,
        memo: 'Principal repaid on Community Credit offer #1'
      })
    )

    const accounting = assembleFromRawEntries(repayments)

    expect(accounting.journal).toMatchObject([
      {
        id: txHash,
        sourceOperationId: txHash,
        txHash,
        lines: [
          { account: { family: { name: 'Loan Payable' } }, debit: 8 },
          { account: { family: { name: 'Cash — Bank' } }, credit: 8 }
        ]
      }
    ])
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

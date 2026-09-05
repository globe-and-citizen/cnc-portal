import { describe, it, expect } from 'vitest'
import { classificationTargetOf } from '@/utils/accounting/classificationTarget'
import type { LedgerEntry, UseCase } from '@/utils/accounting/ledgerEntry'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'

/** Build the minimal entry `classificationTargetOf` reads. */
function entry(fields: {
  useCase: UseCase
  debit: AccountName | null
  credit: AccountName | null
  internal?: boolean
  classified?: LedgerEntry['classified']
}): LedgerEntry {
  return {
    id: 'e1',
    timestamp: 1,
    amountUsd: 10,
    token: 'usdc',
    rawAmount: '10000000',
    internal: false,
    enrichment: 'not-applicable',
    memo: '',
    ...fields
  }
}

describe('classificationTargetOf', () => {
  it('marks an external Bank deposit as an inflow', () => {
    expect(
      classificationTargetOf(
        entry({ useCase: 'UC-BANK-02', debit: 'Cash — Bank', credit: 'Service Revenue' })
      )
    ).toEqual({ direction: 'in', cashAccount: 'Cash — Bank' })
  })

  it('marks an external Bank withdrawal as an outflow', () => {
    expect(
      classificationTargetOf(
        entry({ useCase: 'CASH-OUT', debit: 'Operating Expense', credit: 'Cash — Bank' })
      )
    ).toEqual({ direction: 'out', cashAccount: 'Cash — Bank' })
  })

  it('marks an external Safe inflow against the Safe pocket', () => {
    expect(
      classificationTargetOf(
        entry({ useCase: 'UC-BANK-02', debit: 'Cash — Safe', credit: 'Service Revenue' })
      )
    ).toEqual({ direction: 'in', cashAccount: 'Cash — Safe' })
  })

  it('keeps an already-classified entry classifiable', () => {
    expect(
      classificationTargetOf(
        entry({
          useCase: 'CASH-IN',
          debit: 'Cash — Bank',
          credit: 'Owner Capital',
          classified: 'OWNER_CAPITAL'
        })
      )
    ).toEqual({ direction: 'in', cashAccount: 'Cash — Bank' })
  })

  it('excludes a guaranteed-internal move', () => {
    expect(
      classificationTargetOf(
        entry({ useCase: 'INTERNAL', debit: 'Cash — Bank', credit: 'Cash — Safe', internal: true })
      )
    ).toBeNull()
  })

  it('excludes a protocol fee leg', () => {
    expect(
      classificationTargetOf(
        entry({ useCase: 'FEE', debit: 'Transaction Fee Expense', credit: 'Cash — Bank' })
      )
    ).toBeNull()
  })

  it('excludes a dividend paid from the Safe', () => {
    expect(
      classificationTargetOf(
        entry({ useCase: 'UC-INV-01', debit: 'Dividend Expense', credit: 'Cash — Safe' })
      )
    ).toBeNull()
  })

  it('excludes moves that do not touch a Bank/Safe pocket', () => {
    expect(
      classificationTargetOf(
        entry({ useCase: 'UC-EXP-01', debit: 'Operating Expense', credit: 'Cash — Expense' })
      )
    ).toBeNull()
  })
})

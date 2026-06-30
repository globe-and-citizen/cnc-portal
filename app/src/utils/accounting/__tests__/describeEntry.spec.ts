import { describe, it, expect } from 'vitest'
import { activityOf, entryLabel } from '../describeEntry'
import type { LedgerEntry } from '../ledgerEntry'

const ALI = '0x1111111111111111111111111111111111111111'

/** A minimal balanced entry; override only what each case needs. */
function entry(partial: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: 'e1',
    timestamp: 1_700_000_000,
    useCase: 'CASH-IN',
    debit: 'Cash — Bank',
    credit: 'Service Revenue',
    amountUsd: 500,
    token: 'usdc',
    rawAmount: '500000000',
    internal: false,
    memo: 'raw memo',
    enrichment: 'not-applicable',
    ...partial
  }
}

describe('activityOf — actor rows', () => {
  it('narrates a wage accrual with the hours and the week-ending date', () => {
    const a = activityOf(
      entry({
        useCase: 'UC-CASH-02',
        counterparty: ALI,
        minutesWorked: 960,
        periodEnd: 1_700_000_000
      })
    )
    expect(a).toMatchObject({ kind: 'actor', actor: ALI })
    expect(a).toHaveProperty('text', expect.stringContaining('submitted 16h'))
    expect(a).toHaveProperty('text', expect.stringContaining('week ending'))
  })

  it('omits the week when there are no hours', () => {
    expect(activityOf(entry({ useCase: 'UC-CASH-02', counterparty: ALI }))).toEqual({
      kind: 'actor',
      actor: ALI,
      text: 'accrued wages'
    })
  })

  it('renders fractional hours and a wage settlement', () => {
    expect(
      activityOf(entry({ useCase: 'UC-CASH-02', counterparty: ALI, minutesWorked: 90 }))
    ).toEqual({ kind: 'actor', actor: ALI, text: 'submitted 1.5h' })
    expect(
      activityOf(entry({ useCase: 'UC-CASH-03', counterparty: ALI, minutesWorked: 960 }))
    ).toEqual({ kind: 'actor', actor: ALI, text: 'was paid for 16h' })
    expect(activityOf(entry({ useCase: 'UC-CASH-03', counterparty: ALI }))).toEqual({
      kind: 'actor',
      actor: ALI,
      text: 'was paid wages'
    })
  })

  it('narrates capital, revenue and an investment with the SHER tail', () => {
    expect(activityOf(entry({ useCase: 'UC-BANK-01', counterparty: ALI })).text).toBe(
      'contributed $500.00 in capital'
    )
    expect(activityOf(entry({ useCase: 'UC-BANK-02', counterparty: ALI })).text).toBe(
      'paid $500.00 for services'
    )
    expect(activityOf(entry({ useCase: 'UC-SDR-01', counterparty: ALI })).text).toBe(
      'invested $500.00'
    )
    expect(
      activityOf(entry({ useCase: 'UC-MEMBER-01', counterparty: ALI, shares: 120 })).text
    ).toBe('invested $500.00 in capital · 120 SHER')
  })

  it('narrates an expense reimbursement, a dividend and a share issuance', () => {
    expect(activityOf(entry({ useCase: 'UC-EXP-01', counterparty: ALI, amountUsd: 80 })).text).toBe(
      'expense reimbursed · $80.00'
    )
    expect(activityOf(entry({ useCase: 'UC-INV-01', counterparty: ALI })).text).toBe(
      'received a $500.00 dividend'
    )
    expect(activityOf(entry({ useCase: 'DEFAULT-D', counterparty: ALI, shares: 120 })).text).toBe(
      'was issued 120 SHER'
    )
  })
})

describe('activityOf — transfer rows', () => {
  it('reads an internal move as from (credit) → to (debit) pockets', () => {
    expect(
      activityOf(entry({ useCase: 'INTERNAL', debit: 'Cash — Safe', credit: 'Cash — Bank' }))
    ).toEqual({ kind: 'transfer', from: 'Cash — Bank', to: 'Cash — Safe' })
    expect(
      activityOf(entry({ useCase: 'FEE', debit: 'Cash — FeeCollector', credit: 'Cash — Bank' }))
    ).toEqual({ kind: 'transfer', from: 'Cash — Bank', to: 'Cash — FeeCollector' })
  })
})

describe('activityOf — plain rows', () => {
  it('falls back to the generic label with no actor and no transfer', () => {
    expect(activityOf(entry({ useCase: 'CASH-IN' }))).toEqual({
      kind: 'plain',
      text: 'Cash receipt'
    })
    // an actor use case without a counterparty has no one to name
    expect(activityOf(entry({ useCase: 'UC-BANK-01' }))).toEqual({
      kind: 'plain',
      text: 'Owner capital contribution'
    })
    // a memo-only mint with no shares
    expect(
      activityOf(entry({ useCase: 'DEFAULT-D', counterparty: ALI, debit: null, credit: null }))
    ).toEqual({ kind: 'actor', actor: ALI, text: 'Share issuance' })
  })
})

describe('entryLabel', () => {
  it('maps each use case to its generic label', () => {
    expect(entryLabel(entry({ useCase: 'CASH-OUT' }))).toBe('Cash payment')
    expect(entryLabel(entry({ useCase: 'UC-BANK-03' }))).toBe('Treasury funding')
    expect(entryLabel(entry({ useCase: 'UC-MEMBER-01' }))).toBe('Member capital contribution')
  })
})

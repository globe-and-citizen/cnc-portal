import { describe, it, expect } from 'vitest'
import { activityOf, activityText, entryLabel } from '../describeEntry'
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

  it('falls back to a wage-claim phrase when there are no hours', () => {
    expect(activityOf(entry({ useCase: 'UC-CASH-02', counterparty: ALI }))).toEqual({
      kind: 'actor',
      actor: ALI,
      text: 'submitted a wage claim'
    })
  })

  it('renders hours and minutes (never a decimal) and a wage settlement', () => {
    expect(
      activityOf(entry({ useCase: 'UC-CASH-02', counterparty: ALI, minutesWorked: 90 }))
    ).toEqual({ kind: 'actor', actor: ALI, text: 'submitted 1h 30min of work' })
    // 20h 50min = 1250 min — must read "20h 50min", not "20.8h".
    expect(
      activityOf(entry({ useCase: 'UC-CASH-02', counterparty: ALI, minutesWorked: 1250 })).text
    ).toBe('submitted 20h 50min of work')
    // Under an hour shows minutes only; a whole hour drops the minutes.
    expect(
      activityOf(entry({ useCase: 'UC-CASH-02', counterparty: ALI, minutesWorked: 50 })).text
    ).toBe('submitted 50min of work')
    expect(
      activityOf(entry({ useCase: 'UC-CASH-03', counterparty: ALI, minutesWorked: 960 }))
    ).toEqual({ kind: 'actor', actor: ALI, text: 'was paid for 16h of work' })
    expect(activityOf(entry({ useCase: 'UC-CASH-03', counterparty: ALI }))).toEqual({
      kind: 'actor',
      actor: ALI,
      text: 'was paid their wages'
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
      'invested $500.00 in capital'
    )
    expect(
      activityOf(entry({ useCase: 'UC-MEMBER-01', counterparty: ALI, shares: 120 })).text
    ).toBe('invested $500.00 in capital and got 120 SHER')
  })

  it('narrates an expense reimbursement, a dividend and a share issuance', () => {
    expect(activityOf(entry({ useCase: 'UC-EXP-01', counterparty: ALI, amountUsd: 80 })).text).toBe(
      'was reimbursed $80.00 for an expense'
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

  it('names the initiator (the signer) when it is resolved', () => {
    expect(
      activityOf(
        entry({ useCase: 'INTERNAL', debit: 'Cash — Safe', credit: 'Cash — Bank', initiator: ALI })
      )
    ).toEqual({ kind: 'transfer', from: 'Cash — Bank', to: 'Cash — Safe', actor: ALI })
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

describe('activityText — export rendering', () => {
  const resolve = (address: string) => (address === ALI ? 'Ali' : 'User')

  it('phrases a pocket-to-pocket transfer like the ledger, without a "Cash — " prefix', () => {
    const cell = activityOf(
      entry({ useCase: 'INTERNAL', debit: 'Cash — Safe', credit: 'Cash — Bank' })
    )
    expect(activityText(cell)).toBe('Bank transferred money to Safe')
  })

  it('names the initiator on a transfer when one is resolved', () => {
    const cell = activityOf(
      entry({ useCase: 'INTERNAL', debit: 'Cash — Safe', credit: 'Cash — Bank', initiator: ALI })
    )
    expect(activityText(cell, resolve)).toBe('Ali transferred money from Bank to Safe')
  })

  it('renders an actor row as name + predicate', () => {
    const cell = activityOf(entry({ useCase: 'UC-BANK-02', counterparty: ALI }))
    expect(activityText(cell, resolve)).toBe('Ali paid $500.00 for services')
  })
})

describe('entryLabel', () => {
  it('maps each use case to its generic label', () => {
    expect(entryLabel(entry({ useCase: 'CASH-OUT' }))).toBe('Cash payment')
    expect(entryLabel(entry({ useCase: 'UC-BANK-03' }))).toBe('Treasury funding')
    expect(entryLabel(entry({ useCase: 'UC-MEMBER-01' }))).toBe('Member capital contribution')
  })
})

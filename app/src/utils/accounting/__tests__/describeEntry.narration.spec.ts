import { describe, expect, it } from 'vitest'
import { activityOf, activityText, entryLabel, withSherTail } from '../describeEntry'
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

/** The predicate `activityOf` puts after the actor's avatar. */
const narrate = (partial: Partial<LedgerEntry>) =>
  (activityOf(entry({ counterparty: ALI, ...partial })) as { text: string }).text

describe('activityOf — community credit rows', () => {
  it('names the lender when funds go out to the credit', () => {
    expect(narrate({ useCase: 'UC-CREDIT-01', amountUsd: 1000 })).toBe(
      'lent $1,000.00 to the community credit'
    )
  })

  it('splits a repayment installment between principal and interest', () => {
    expect(narrate({ useCase: 'UC-CREDIT-03', debit: 'Loan Payable', amountUsd: 250 })).toBe(
      'was repaid $250.00 of loan principal'
    )
    expect(narrate({ useCase: 'UC-CREDIT-03', debit: 'Interest Payable', amountUsd: 25 })).toBe(
      'was paid $25.00 of interest on their loan'
    )
  })

  it('names a refunded principal and interest still owed', () => {
    expect(narrate({ useCase: 'UC-CREDIT-04', amountUsd: 400 })).toBe(
      'was refunded $400.00 of lent principal'
    )
    expect(narrate({ useCase: 'UC-CREDIT-05', amountUsd: 12.5 })).toBe(
      'is owed $12.50 of interest on their loan'
    )
  })
})

describe('activityOf — vesting rows', () => {
  it('names the share count on each phase of a grant', () => {
    expect(narrate({ useCase: 'UC-VEST-01', shares: 1200 })).toBe('was granted 1200 SHER vesting')
    expect(narrate({ useCase: 'UC-VEST-02', shares: 300 })).toBe('vested 300 SHER')
    expect(narrate({ useCase: 'UC-VEST-03', shares: 900 })).toBe(
      'had a vesting schedule stopped, cancelling 900 unvested SHER'
    )
  })

  it('falls back to the generic label when the share count is missing', () => {
    expect(narrate({ useCase: 'UC-VEST-01' })).toBe('Vesting grant')
    expect(narrate({ useCase: 'UC-VEST-02' })).toBe('Vested shares released')
    expect(narrate({ useCase: 'UC-VEST-03' })).toBe('had a vesting schedule stopped')
  })

  it('falls back to the memo for a use case with no catalogue label', () => {
    expect(entryLabel(entry({ useCase: 'UC-CASH-01' as LedgerEntry['useCase'] }))).toBe('raw memo')
  })
})

describe('withSherTail', () => {
  const cell = { kind: 'actor', actor: ALI, text: 'was paid for 5h of work' } as const

  it('names the equity part of a compound payroll posting', () => {
    expect(withSherTail(cell, 10)).toEqual({ ...cell, text: `${cell.text} + 10 SHER` })
  })

  it('leaves the narration alone when there is nothing to add', () => {
    const mentioned = { ...cell, text: 'vested 300 SHER' } as const
    const plain = { kind: 'plain', text: 'Internal transfer' } as const
    expect(withSherTail(cell, 0)).toBe(cell)
    expect(withSherTail(mentioned, 10)).toBe(mentioned)
    expect(withSherTail(plain, 10)).toBe(plain)
  })
})

describe('activityText', () => {
  it('shortens an address, and passes a non-address through, when no resolver is given', () => {
    expect(activityText({ kind: 'actor', actor: ALI, text: 'was paid their wages' })).toBe(
      '0x1111…1111 was paid their wages'
    )
    expect(activityText({ kind: 'actor', actor: 'Treasury', text: 'paid a fee' })).toBe(
      'Treasury paid a fee'
    )
  })

  it('reads a transfer from the pockets, with or without a signer', () => {
    expect(activityText({ kind: 'transfer', from: 'Cash — Bank', to: 'Cash — Safe' })).toBe(
      'Bank transferred money to Safe'
    )
    expect(
      activityText(
        { kind: 'transfer', from: 'Cash — Bank', to: 'Cash — Safe', actor: ALI },
        () => 'Ali'
      )
    ).toBe('Ali transferred money from Bank to Safe')
  })

  it('returns plain text unchanged', () => {
    expect(activityText({ kind: 'plain', text: 'Internal transfer' })).toBe('Internal transfer')
  })
})

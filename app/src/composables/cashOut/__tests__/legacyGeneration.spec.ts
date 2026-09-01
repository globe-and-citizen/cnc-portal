import { describe, it, expect } from 'vitest'
import {
  buildLegacyWithdrawPlan,
  legacyGenerationAddresses,
  supportsOwnerWithdrawAll
} from '../legacyGeneration'

describe('supportsOwnerWithdrawAll', () => {
  it('rejects the generations that predate ownerWithdrawAllToBank', () => {
    expect(supportsOwnerWithdrawAll('V0')).toBe(false)
    expect(supportsOwnerWithdrawAll('V0.1')).toBe(false)
  })

  it('accepts the generations that expose it', () => {
    expect(supportsOwnerWithdrawAll('V1')).toBe(true)
    expect(supportsOwnerWithdrawAll('V2')).toBe(true)
  })

  it('rejects an unresolved generation rather than assuming support', () => {
    expect(supportsOwnerWithdrawAll(undefined)).toBe(false)
  })
})

describe('buildLegacyWithdrawPlan', () => {
  const keys = (
    balances: Parameters<typeof buildLegacyWithdrawPlan>[0],
    canSweepSources: boolean
  ) => buildLegacyWithdrawPlan(balances, { canSweepSources }).map((step) => step.key)

  it('runs the full sequence for a generation that can sweep its sources', () => {
    expect(keys({ cashRemuneration: 5, expense: 5, bank: 5 }, true)).toEqual([
      'cashRemuneration',
      'expense',
      'bank'
    ])
  })

  it('drains only the Bank for a generation that cannot', () => {
    expect(keys({ cashRemuneration: 5, expense: 5, bank: 5 }, false)).toEqual(['bank'])
  })

  it('skips the Bank step entirely when a non-sweeping generation has an empty Bank', () => {
    // Nothing consolidates into it, so running it would be a guaranteed no-op.
    expect(keys({ cashRemuneration: 9, expense: 9, bank: 0 }, false)).toEqual([])
  })

  it('still consolidates into an empty Bank when the sources can be swept', () => {
    expect(keys({ cashRemuneration: 9, expense: 0, bank: 0 }, true)).toEqual([
      'cashRemuneration',
      'bank'
    ])
  })
})

describe('legacyGenerationAddresses', () => {
  const BANK = '0x1111111111111111111111111111111111111111'
  const EXPENSE = '0x2222222222222222222222222222222222222222'
  const CASH_REM = '0x3333333333333333333333333333333333333333'

  it('picks the three drainable accounts out of a generation', () => {
    expect(
      legacyGenerationAddresses([
        { address: '0x9999999999999999999999999999999999999999', type: 'BoardOfDirectors' },
        { address: BANK, type: 'Bank' },
        { address: EXPENSE, type: 'ExpenseAccountEIP712' },
        { address: CASH_REM, type: 'CashRemunerationEIP712' }
      ])
    ).toEqual({ bank: BANK, expense: EXPENSE, cashRemuneration: CASH_REM })
  })

  it('leaves accounts a generation never deployed undefined', () => {
    expect(legacyGenerationAddresses([{ address: BANK, type: 'Bank' }])).toEqual({
      bank: BANK,
      expense: undefined,
      cashRemuneration: undefined
    })
  })

  it('returns nothing for an empty generation', () => {
    expect(legacyGenerationAddresses([])).toEqual({
      bank: undefined,
      expense: undefined,
      cashRemuneration: undefined
    })
  })
})

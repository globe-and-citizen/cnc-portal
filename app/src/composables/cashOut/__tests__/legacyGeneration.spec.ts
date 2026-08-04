import { describe, it, expect } from 'vitest'
import { legacyGenerationAddresses, supportsOwnerWithdrawAll } from '../legacyGeneration'

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

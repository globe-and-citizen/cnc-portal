import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import { SUPPORTED_TOKENS, USDC_ADDRESS, USDC_E_ADDRESS } from '@/constant'
import {
  expenseApprovalTokens,
  isExpenseApprovalTokenAllowed,
  productExpenseToken
} from '../tokenPolicy'

describe('Expense approval token policy', () => {
  it('[AC-US-EXP-001-14] intersects contract support with the product token catalogue', () => {
    const unknown = '0x1111111111111111111111111111111111111111'
    const enabled = expenseApprovalTokens([USDC_E_ADDRESS.toUpperCase(), unknown])

    expect(enabled.map((token) => token.id)).toEqual(['usdc.e', 'native'])
    expect(isExpenseApprovalTokenAllowed(USDC_E_ADDRESS, [USDC_E_ADDRESS])).toBe(true)
    expect(isExpenseApprovalTokenAllowed(USDC_ADDRESS, [USDC_E_ADDRESS])).toBe(false)
    expect(isExpenseApprovalTokenAllowed(unknown, [unknown])).toBe(false)
  })

  it('[AC-US-EXP-001-15] offers only native currency while support is unavailable', () => {
    expect(expenseApprovalTokens(undefined).map((token) => token.id)).toEqual(['native'])
    expect(isExpenseApprovalTokenAllowed(zeroAddress, undefined)).toBe(true)
    expect(isExpenseApprovalTokenAllowed(USDC_ADDRESS, undefined)).toBe(false)
  })

  it('resolves metadata and decimals for recognized assets by address', () => {
    expect(productExpenseToken(USDC_E_ADDRESS)?.decimals).toBe(6)
    expect(productExpenseToken(zeroAddress)?.id).toBe('native')
    expect(SUPPORTED_TOKENS.map((token) => token.id)).toContain('usdc.e')
  })
})

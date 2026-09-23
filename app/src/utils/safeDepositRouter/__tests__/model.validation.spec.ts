import { describe, it, expect } from 'vitest'
import { isValidTokenDecimals, buildDepositAmountSchema } from '../model'

const schemaErrors = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? [])

describe('safeDepositRouterUtil — deposit amount validation', () => {
  describe('isValidTokenDecimals', () => {
    describe('Valid Amounts', () => {
      it('accepts a whole number', () => {
        expect(isValidTokenDecimals('100')).toBe(true)
      })

      it('accepts a value at the default decimal precision', () => {
        expect(isValidTokenDecimals('1.123456')).toBe(true)
      })

      it('respects a custom decimal precision', () => {
        expect(isValidTokenDecimals('1.12', 2)).toBe(true)
      })
    })

    describe('Invalid Amounts', () => {
      it('rejects more decimals than allowed', () => {
        expect(isValidTokenDecimals('1.1234567')).toBe(false)
      })

      it('rejects more decimals than a custom precision', () => {
        expect(isValidTokenDecimals('1.123', 2)).toBe(false)
      })

      it('rejects zero (not strictly positive)', () => {
        expect(isValidTokenDecimals('0')).toBe(false)
      })

      it('rejects unparseable input', () => {
        expect(isValidTokenDecimals('abc')).toBe(false)
      })

      it('rejects an empty string', () => {
        expect(isValidTokenDecimals('')).toBe(false)
      })
    })
  })

  describe('buildDepositAmountSchema', () => {
    describe('Valid Inputs', () => {
      it('accepts an amount within the balance', () => {
        const result = buildDepositAmountSchema(1000).safeParse({ amount: '100' })
        expect(result.success).toBe(true)
      })

      it('skips the balance check when maxBalance is undefined', () => {
        const result = buildDepositAmountSchema(undefined).safeParse({ amount: '999999' })
        expect(result.success).toBe(true)
      })

      it('accepts an amount within a custom decimal precision', () => {
        const result = buildDepositAmountSchema(1000, 2).safeParse({ amount: '1.12' })
        expect(result.success).toBe(true)
      })
    })

    describe('Invalid Inputs', () => {
      it('requires an amount', () => {
        const result = buildDepositAmountSchema(1000).safeParse({ amount: '' })
        expect(schemaErrors(result)).toContain('Amount is required.')
      })

      it('rejects a non-numeric amount', () => {
        const result = buildDepositAmountSchema(1000).safeParse({ amount: 'abc' })
        expect(schemaErrors(result)).toContain('Enter a valid amount greater than 0.')
      })

      it('rejects zero', () => {
        const result = buildDepositAmountSchema(1000).safeParse({ amount: '0' })
        expect(schemaErrors(result)).toContain('Enter a valid amount greater than 0.')
      })

      it('rejects an amount above the balance', () => {
        const result = buildDepositAmountSchema(100).safeParse({ amount: '150' })
        expect(schemaErrors(result)).toContain('Amount exceeds available balance.')
      })

      it('rejects more decimals than the token allows', () => {
        const result = buildDepositAmountSchema(1000).safeParse({ amount: '1.1234567' })
        expect(schemaErrors(result)).toContain(
          'Enter a valid token amount with up to 6 decimal places.'
        )
      })

      it('reflects a custom decimal precision in the message', () => {
        const result = buildDepositAmountSchema(1000, 2).safeParse({ amount: '1.123' })
        expect(schemaErrors(result)).toContain(
          'Enter a valid token amount with up to 2 decimal places.'
        )
      })
    })
  })
})

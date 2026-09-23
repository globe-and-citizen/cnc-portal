import { describe, it, expect } from 'vitest'
import {
  formatSafeDepositRouterMultiplier,
  parseSafeDepositRouterMultiplier,
  calculateSherCompensation,
  calculateDepositFromSher,
  validateSherCompensationInputs,
  formatSherAmount
} from '../model'

describe('safeDepositRouterUtil', () => {
  describe('formatSafeDepositRouterMultiplier', () => {
    describe('Valid Formatting', () => {
      it('formats bigint multiplier with default 6 decimals', () => {
        const result = formatSafeDepositRouterMultiplier(1000000n)
        expect(result).toBe('1')
      })

      it('formats bigint multiplier with 2x value', () => {
        const result = formatSafeDepositRouterMultiplier(2000000n)
        expect(result).toBe('2')
      })

      it('formats bigint multiplier with fractional value', () => {
        const result = formatSafeDepositRouterMultiplier(1500000n)
        expect(result).toBe('1.5')
      })

      it('handles very large multipliers', () => {
        const result = formatSafeDepositRouterMultiplier(10000000000n)
        expect(result).toBe('10000')
      })

      it('handles very small multipliers', () => {
        const result = formatSafeDepositRouterMultiplier(1n)
        expect(result).toBe('0.000001')
      })

      it('respects custom decimal places', () => {
        const result = formatSafeDepositRouterMultiplier(1000000000000000000n, 18)
        expect(result).toBe('1')
      })
    })

    describe('Edge Cases', () => {
      it('returns "0" for undefined multiplier', () => {
        const result = formatSafeDepositRouterMultiplier(undefined)
        expect(result).toBe('0')
      })

      it('handles zero multiplier', () => {
        const result = formatSafeDepositRouterMultiplier(0n)
        expect(result).toBe('0')
      })
    })
  })

  describe('parseSafeDepositRouterMultiplier', () => {
    describe('Valid Parsing', () => {
      it('parses "1" with default 6 decimals', () => {
        const result = parseSafeDepositRouterMultiplier('1')
        expect(result).toBe(1000000n)
      })

      it('parses "2" to correct bigint value', () => {
        const result = parseSafeDepositRouterMultiplier('2')
        expect(result).toBe(2000000n)
      })

      it('parses fractional values at the configured precision', () => {
        const result = parseSafeDepositRouterMultiplier('1.5')
        expect(result).toBe(1500000n)
      })

      it('parses very small values', () => {
        const result = parseSafeDepositRouterMultiplier('0.000001')
        expect(result).toBe(1n)
      })

      it('parses very large values', () => {
        const result = parseSafeDepositRouterMultiplier('10000')
        expect(result).toBe(10000000000n)
      })

      it('respects custom decimals', () => {
        const result = parseSafeDepositRouterMultiplier('1', 18)
        expect(result).toBe(1000000000000000000n)
      })
    })

    describe('Edge Cases', () => {
      it('returns 0n for empty string', () => {
        const result = parseSafeDepositRouterMultiplier('')
        expect(result).toBe(0n)
      })

      it('returns 0n for invalid input', () => {
        const result = parseSafeDepositRouterMultiplier('invalid')
        expect(result).toBe(0n)
      })

      it('returns 0n for NaN', () => {
        const result = parseSafeDepositRouterMultiplier('NaN')
        expect(result).toBe(0n)
      })

      it('handles zero string', () => {
        const result = parseSafeDepositRouterMultiplier('0')
        expect(result).toBe(0n)
      })
    })
  })

  describe('calculateSherCompensation', () => {
    describe('Valid Calculations', () => {
      it('calculates SHER compensation for 1:1 multiplier', () => {
        const result = calculateSherCompensation('100', 1)
        expect(result).toBe('100')
      })

      it('calculates SHER compensation for 2x multiplier', () => {
        const result = calculateSherCompensation('100', 2)
        expect(result).toBe('200')
      })

      it('calculates SHER compensation for 5x multiplier', () => {
        const result = calculateSherCompensation('50', 5)
        expect(result).toBe('250')
      })

      it('handles decimal deposit amounts', () => {
        const result = calculateSherCompensation('100.5', 2)
        expect(result).toBe('201')
      })

      it('handles fractional multipliers', () => {
        const result = calculateSherCompensation('100', 0.5)
        expect(result).toBe('50')
      })

      it('handles very small amounts', () => {
        const result = calculateSherCompensation('0.000001', 1)
        expect(result).toBe('0.000001')
      })

      it('formats large numbers with commas', () => {
        const result = calculateSherCompensation('1000', 1000)
        expect(result).toBe('1,000,000')
      })

      it('respects custom decimal precision', () => {
        const result = calculateSherCompensation('100.123456789', 1, 8)
        expect(result).toBe('100.12345679')
      })
    })

    describe('Edge Cases', () => {
      it('returns "0" for empty string', () => {
        const result = calculateSherCompensation('', 1)
        expect(result).toBe('0')
      })

      it('returns "0" for zero deposit amount', () => {
        const result = calculateSherCompensation('0', 1)
        expect(result).toBe('0')
      })

      it('returns "0" for zero multiplier', () => {
        const result = calculateSherCompensation('100', 0)
        expect(result).toBe('0')
      })

      it('returns "0" for invalid deposit amount', () => {
        const result = calculateSherCompensation('invalid', 1)
        expect(result).toBe('0')
      })

      it('handles whitespace in deposit amount', () => {
        const result = calculateSherCompensation('  100  ', 1)
        expect(result).toBe('100')
      })
    })

    describe('Decimal Precision', () => {
      it('defaults to 6 decimal places', () => {
        const result = calculateSherCompensation('100.123456789', 1)
        expect(result).toBe('100.123457')
      })

      it('handles 0 decimal places', () => {
        const result = calculateSherCompensation('100.9', 1, 0)
        expect(result).toBe('101')
      })

      it('handles high decimal precision', () => {
        const result = calculateSherCompensation('100.123456789012', 1, 10)
        expect(result).toBe('100.123456789')
      })
    })
  })

  describe('calculateDepositFromSher', () => {
    describe('Valid Calculations', () => {
      it('calculates deposit amount for 1:1 multiplier', () => {
        const result = calculateDepositFromSher('100', 1)
        expect(result).toBe('100')
      })

      it('calculates deposit amount for 2x multiplier', () => {
        const result = calculateDepositFromSher('200', 2)
        expect(result).toBe('100')
      })

      it('calculates deposit amount for 5x multiplier', () => {
        const result = calculateDepositFromSher('250', 5)
        expect(result).toBe('50')
      })

      it('handles decimal SHER amounts', () => {
        const result = calculateDepositFromSher('201', 2)
        expect(result).toBe('100.5')
      })

      it('handles fractional multipliers', () => {
        const result = calculateDepositFromSher('50', 0.5)
        expect(result).toBe('100')
      })

      it('removes trailing zeros', () => {
        const result = calculateDepositFromSher('100', 2)
        expect(result).toBe('50')
      })
    })

    describe('Edge Cases', () => {
      it('returns "0" for empty string', () => {
        const result = calculateDepositFromSher('', 1)
        expect(result).toBe('0')
      })

      it('returns "0" for zero SHER amount', () => {
        const result = calculateDepositFromSher('0', 1)
        expect(result).toBe('0')
      })

      it('returns "0" for zero multiplier', () => {
        const result = calculateDepositFromSher('100', 0)
        expect(result).toBe('0')
      })

      it('returns "0" for negative SHER amount', () => {
        const result = calculateDepositFromSher('-100', 1)
        expect(result).toBe('0')
      })
    })
  })

  describe('validateSherCompensationInputs', () => {
    describe('Valid Inputs', () => {
      it('validates correct positive numbers', () => {
        const result = validateSherCompensationInputs('100', 2)
        expect(result).toEqual({ valid: true })
      })

      it('validates decimal amounts', () => {
        const result = validateSherCompensationInputs('100.5', 1.5)
        expect(result).toEqual({ valid: true })
      })

      it('validates numeric inputs', () => {
        const result = validateSherCompensationInputs(100, 2)
        expect(result).toEqual({ valid: true })
      })
    })

    describe('Invalid Amount', () => {
      it('rejects zero deposit amount', () => {
        const result = validateSherCompensationInputs('0', 1)
        expect(result).toEqual({
          valid: false,
          error: 'Invalid deposit amount'
        })
      })

      it('rejects negative deposit amount', () => {
        const result = validateSherCompensationInputs('-100', 1)
        expect(result).toEqual({
          valid: false,
          error: 'Invalid deposit amount'
        })
      })

      it('rejects NaN deposit amount', () => {
        const result = validateSherCompensationInputs('invalid', 1)
        expect(result).toEqual({
          valid: false,
          error: 'Invalid deposit amount'
        })
      })
    })

    describe('Invalid Multiplier', () => {
      it('rejects zero multiplier', () => {
        const result = validateSherCompensationInputs('100', 0)
        expect(result).toEqual({
          valid: false,
          error: 'Invalid multiplier'
        })
      })

      it('rejects negative multiplier', () => {
        const result = validateSherCompensationInputs('100', -1)
        expect(result).toEqual({
          valid: false,
          error: 'Invalid multiplier'
        })
      })
    })
  })

  describe('formatSherAmount', () => {
    describe('Valid Formatting', () => {
      it('formats basic numbers', () => {
        const result = formatSherAmount('100')
        expect(result).toBe('100')
      })

      it('formats large numbers with commas', () => {
        const result = formatSherAmount('1000000')
        expect(result).toBe('1,000,000')
      })

      it('handles numeric input', () => {
        const result = formatSherAmount(100)
        expect(result).toBe('100')
      })

      it('handles zero', () => {
        const result = formatSherAmount('0')
        expect(result).toBe('0')
      })
    })
  })
})

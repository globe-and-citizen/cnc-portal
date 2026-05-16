import { describe, expect, it } from 'vitest'
import {
  computeAmountFromPercentageInput,
  computeIssuedAmountFromAmountInput,
  computePercentageFromAmountInput,
  formatStakePercentageFromSupply
} from '@/utils/investorMintAllocation'

describe('formatStakePercentageFromSupply', () => {
  it('truncates stake percentage to 2 decimals without rounding up', () => {
    expect(formatStakePercentageFromSupply(2_481_481n, 24_814_814n)).toBe('9.99')
  })

  it('supports fixed 2-decimal precision display', () => {
    expect(formatStakePercentageFromSupply(254n, 787n, 2, true)).toBe('32.27')
    expect(formatStakePercentageFromSupply(1n, 10n, 2, true)).toBe('10.00')
  })

  it('shows integer percentages without trailing decimals', () => {
    expect(formatStakePercentageFromSupply(1n, 10n)).toBe('10')
  })

  it('returns 0 when total supply is zero', () => {
    expect(formatStakePercentageFromSupply(1n, 0n)).toBe('0')
  })
})

describe('numeric edge guards', () => {
  it('rejects non-finite amount inputs', () => {
    expect(computeIssuedAmountFromAmountInput(Number.POSITIVE_INFINITY, 'add', 0)).toBe(0)
    expect(computeIssuedAmountFromAmountInput(Number.NaN, 'add', 0)).toBe(0)
  })

  it('rejects non-finite percentage inputs in amount sync', () => {
    expect(computeAmountFromPercentageInput(Number.POSITIVE_INFINITY, 'add', 10, 50, 5)).toBe(0)
    expect(computeAmountFromPercentageInput(Number.NaN, 'ending', 10, 50, 5)).toBe(0)
  })

  it('rejects non-finite amount inputs in percentage sync', () => {
    expect(computePercentageFromAmountInput(Number.POSITIVE_INFINITY, 'ending', 0, 50, 0)).toBe(0)
    expect(computePercentageFromAmountInput(Number.NaN, 'add', 10, 50, 5)).toBe(0)
  })

  it('clamps near-zero ending issued delta to 0', () => {
    expect(computeIssuedAmountFromAmountInput(28.000000000000007, 'ending', 28)).toBe(0)
  })
})

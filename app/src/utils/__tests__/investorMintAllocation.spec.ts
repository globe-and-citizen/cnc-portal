import { describe, expect, it } from 'vitest'
import { formatStakePercentageFromSupply } from '@/utils/investorMintAllocation'

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

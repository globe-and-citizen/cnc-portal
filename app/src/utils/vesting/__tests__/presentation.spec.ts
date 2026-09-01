import { describe, expect, it } from 'vitest'
import { formatVestingAmount } from '@/utils/vesting/presentation'

describe('vestingPresentation', () => {
  it('does not round a positive base-unit amount down to zero', () => {
    expect(formatVestingAmount(1n, 'SHR')).toBe('0.000001 SHR')
  })
})

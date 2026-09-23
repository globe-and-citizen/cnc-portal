import { describe, expect, it } from 'vitest'
import { formatVestingAmount } from '@/utils/vesting/presentation'

describe('vestingPresentation', () => {
  it('[AC-US-VESTING-005-08] does not round a positive base-unit amount down to zero', () => {
    expect(formatVestingAmount(1n, 'SHR')).toBe('0.000001 SHR')
  })
})

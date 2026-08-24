import { effectScope } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVestingSchedules } from '../useVestingSchedules'
import {
  mockBlockTimestamp,
  mockInvestorReads,
  mockVestingReads,
  resetContractMocks
} from '@/tests/mocks'

const MEMBER = '0x0000000000000000000000000000000000000001'

describe('useVestingSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
    mockBlockTimestamp.value = 1_700_005_000n
    mockInvestorReads.symbol.data.value = 'SHR'
    mockVestingReads.vestingsWithMembers.data.value = [
      [MEMBER],
      [0n],
      [
        {
          start: 1_700_000_000n,
          duration: 100_000n,
          cliff: 10_000n,
          totalAmount: 10_000_000n,
          released: 0n,
          active: true
        }
      ]
    ]
    mockVestingReads.archivedVestingsFlat.data.value = [[], [], []]
  })

  it('derives schedule state from the reactive chain timestamp', () => {
    const scope = effectScope()
    const result = scope.run(() => useVestingSchedules())!

    expect(result.schedules.value[0]?.state).toBe('cliff_locked')
    mockBlockTimestamp.value = 1_700_050_000n
    expect(result.schedules.value[0]).toMatchObject({
      state: 'claimable',
      vestedAmount: 5_000_000n,
      claimableAmount: 5_000_000n
    })

    scope.stop()
  })

  it('refetches both active and archived reads on an explicit retry', async () => {
    const scope = effectScope()
    const result = scope.run(() => useVestingSchedules())!

    await result.refetch()

    expect(mockVestingReads.vestingsWithMembers.refetch).toHaveBeenCalledOnce()
    expect(mockVestingReads.archivedVestingsFlat.refetch).toHaveBeenCalledOnce()
    scope.stop()
  })
})

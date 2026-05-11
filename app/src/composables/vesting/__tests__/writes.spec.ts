import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useVestingAddVestingWrite,
  useVestingStopVestingWrite,
  useVestingReleaseWrite
} from '../writes'
import { mockVestingWrites, resetContractMocks } from '@/tests/mocks'

describe('Vesting Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  it('useVestingAddVestingWrite returns the addVesting V3 mutation', () => {
    const result = useVestingAddVestingWrite()
    expect(result).toBe(mockVestingWrites.addVesting)
    expect(result.mutateAsync).toBeInstanceOf(Function)
  })

  it('useVestingStopVestingWrite returns the stopVesting V3 mutation', () => {
    const result = useVestingStopVestingWrite()
    expect(result).toBe(mockVestingWrites.stopVesting)
    expect(result.mutateAsync).toBeInstanceOf(Function)
  })

  it('useVestingReleaseWrite returns the release V3 mutation', () => {
    const result = useVestingReleaseWrite()
    expect(result).toBe(mockVestingWrites.release)
    expect(result.mutateAsync).toBeInstanceOf(Function)
  })

  it('forwards mutateAsync success and errors from the mock', async () => {
    const result = useVestingAddVestingWrite()
    mockVestingWrites.addVesting.mutateAsync.mockResolvedValueOnce({ hash: '0xvesting' })
    await expect(result.mutateAsync({ args: [] })).resolves.toEqual({ hash: '0xvesting' })

    mockVestingWrites.addVesting.mutateAsync.mockRejectedValueOnce(new Error('Add vesting failed'))
    await expect(result.mutateAsync({ args: [] })).rejects.toThrow('Add vesting failed')
  })
})

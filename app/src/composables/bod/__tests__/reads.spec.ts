import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBodOwner, useBodIsActionExecuted, useBodIsMember } from '../reads'
import { mockBODReads, resetContractMocks } from '@/tests/mocks'
import type { Address } from 'viem'

const MOCK_DATA = {
  bodAddress: '0x3234567890123456789012345678901234567890' as Address,
  memberAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  actionId: 1
} as const

describe('BOD Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  it('useBodOwner returns the owner mock', () => {
    const result = useBodOwner(MOCK_DATA.bodAddress)
    expect(result).toBe(mockBODReads.owner)
    expect(result.refetch).toBeInstanceOf(Function)
  })

  it('useBodIsActionExecuted returns the execution-status mock', () => {
    mockBODReads.isActionExecuted.data.value = true
    const result = useBodIsActionExecuted(MOCK_DATA.actionId)
    expect(result).toBe(mockBODReads.isActionExecuted)
    expect(result.data.value).toBe(true)
  })

  it('useBodIsMember returns the membership mock', () => {
    mockBODReads.isMember.data.value = true
    const result = useBodIsMember(MOCK_DATA.memberAddress)
    expect(result).toBe(mockBODReads.isMember)
    expect(result.data.value).toBe(true)
  })
})

// UNUSED composables — tests commented out alongside them. See ../reads.ts:
//   useBodIsApproved, useBodGetBoardOfDirectors, useBodApprovalCount.

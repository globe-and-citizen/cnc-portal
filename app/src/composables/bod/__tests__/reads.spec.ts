import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useBodOwner,
  useBodIsActionExecuted,
  useBodIsApproved,
  useBodGetBoardOfDirectors,
  useBodIsMember,
  useBodApprovalCount
} from '../reads'
import { mockBODReads, resetContractMocks } from '@/tests/mocks'
import type { Address } from 'viem'

// Test constants
const MOCK_DATA = {
  bodAddress: '0x3234567890123456789012345678901234567890' as Address,
  ownerAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  memberAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  actionId: 1,
  memberCount: 5n
} as const

describe('BOD Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  describe('useBodOwner', () => {
    it('should return mock owner', () => {
      const result = useBodOwner(MOCK_DATA.bodAddress)

      expect(result).toBe(mockBODReads.owner)
      expect(result.data.value).toBeDefined()
      expect(result.isSuccess.value).toBe(true)
    })

    it('should handle error state', () => {
      mockBODReads.owner.isError.value = true
      const result = useBodOwner(MOCK_DATA.bodAddress)

      expect(result.isError.value).toBe(true)
    })

    it('should support refetch functionality', () => {
      const result = useBodOwner(MOCK_DATA.bodAddress)

      expect(result.refetch).toBeInstanceOf(Function)
    })
  })

  describe('useBodIsActionExecuted', () => {
    it('should return action execution status mock', () => {
      const result = useBodIsActionExecuted(MOCK_DATA.actionId)

      expect(result).toBe(mockBODReads.isActionExecuted)
      expect(result.data.value).toBe(false)
    })

    it('should handle loading state', () => {
      mockBODReads.isActionExecuted.isLoading.value = true
      const result = useBodIsActionExecuted(MOCK_DATA.actionId)

      expect(result.isLoading.value).toBe(true)
    })

    it('should return consistent status when executed', () => {
      mockBODReads.isActionExecuted.data.value = true
      const result = useBodIsActionExecuted(MOCK_DATA.actionId)

      expect(result.data.value).toBe(true)
    })
  })

  describe('useBodIsApproved', () => {
    it('should return approval status mock', () => {
      const result = useBodIsApproved(MOCK_DATA.actionId, MOCK_DATA.memberAddress)

      expect(result).toBe(mockBODReads.isApproved)
      expect(result.data.value).toBe(false)
    })

    it('should reflect approval state changes', () => {
      mockBODReads.isApproved.data.value = true
      const result = useBodIsApproved(MOCK_DATA.actionId, MOCK_DATA.memberAddress)

      expect(result.data.value).toBe(true)
    })
  })

  describe('useBodGetBoardOfDirectors', () => {
    it('should return board members list mock', () => {
      const result = useBodGetBoardOfDirectors()

      expect(result).toBe(mockBODReads.boardMembers)
      expect(Array.isArray(result.data.value)).toBe(true)
    })

    it('should handle empty board', () => {
      mockBODReads.boardMembers.data.value = []
      const result = useBodGetBoardOfDirectors()

      expect(result.data.value.length).toBe(0)
    })

    it('should handle multiple board members', () => {
      const members = [MOCK_DATA.ownerAddress, MOCK_DATA.memberAddress]
      mockBODReads.boardMembers.data.value = members
      const result = useBodGetBoardOfDirectors()

      expect(result.data.value.length).toBe(2)
    })
  })

  describe('useBodIsMember', () => {
    it('should return membership status mock', () => {
      const result = useBodIsMember(MOCK_DATA.memberAddress)

      expect(result).toBe(mockBODReads.isMember)
      expect(result.data.value).toBe(false)
    })

    it('should reflect member status', () => {
      mockBODReads.isMember.data.value = true
      const result = useBodIsMember(MOCK_DATA.memberAddress)

      expect(result.data.value).toBe(true)
    })
  })

  describe('useBodApprovalCount', () => {
    it('should return approval count mock', () => {
      const result = useBodApprovalCount()

      expect(result).toBe(mockBODReads.approvalCount)
      expect(typeof result.data.value).toBe('bigint')
    })

    it('should handle zero approvals', () => {
      mockBODReads.approvalCount.data.value = 0n
      const result = useBodApprovalCount()

      expect(result.data.value).toBe(0n)
    })

    it('should handle multiple approvals', () => {
      mockBODReads.approvalCount.data.value = MOCK_DATA.memberCount
      const result = useBodApprovalCount()

      expect(result.data.value).toBe(MOCK_DATA.memberCount)
    })
  })

  describe('Mock Behavior', () => {
    it('should have consistent interface for all read functions', () => {
      const owner = useBodOwner(MOCK_DATA.bodAddress)
      const boardMembers = useBodGetBoardOfDirectors()

      expect(owner).toHaveProperty('data')
      expect(owner).toHaveProperty('isLoading')
      expect(owner).toHaveProperty('isSuccess')
      expect(boardMembers).toHaveProperty('data')
      expect(boardMembers).toHaveProperty('isLoading')
      expect(boardMembers).toHaveProperty('isSuccess')
    })

    it('should reset mocks properly', () => {
      mockBODReads.owner.data.value = 'custom-value'
      resetContractMocks()

      const result = useBodOwner(MOCK_DATA.bodAddress)
      expect(result.data.value).toBeDefined()
      expect(result.isSuccess.value).toBe(true)
    })
  })
})

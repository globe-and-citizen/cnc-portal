import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBodSetBoardOfDirectors, useBodAddAction, useBodApproveAction } from '../writes'
import { mockBODWrites, mockBodAddAction, resetContractMocks } from '@/tests/mocks'
import type { Address } from 'viem'

// Test constants
const MOCK_DATA = {
  memberAddresses: [
    '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
    '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address
  ],
  actionId: 1
} as const

describe('BOD Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  describe('useBodSetBoardOfDirectors', () => {
    it('should return set board mock', () => {
      const result = useBodSetBoardOfDirectors(MOCK_DATA.memberAddresses)

      expect(result).toBe(mockBODWrites.setBoard)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should handle single member board', () => {
      const singleMember = [MOCK_DATA.memberAddresses[0]]
      const result = useBodSetBoardOfDirectors(singleMember)

      expect(result).toBe(mockBODWrites.setBoard)
    })

    it('should handle multiple members', () => {
      const result = useBodSetBoardOfDirectors(MOCK_DATA.memberAddresses)

      expect(result).toBe(mockBODWrites.setBoard)
    })

    it('should support successful board update', async () => {
      mockBODWrites.setBoard.executeWrite.mockResolvedValue(undefined)
      const result = useBodSetBoardOfDirectors(MOCK_DATA.memberAddresses)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })
  })

  describe('useBodAddAction', () => {
    it('should return add action mock', () => {
      const result = useBodAddAction()

      expect(result).toBe(mockBodAddAction)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful action addition', async () => {
      mockBodAddAction.executeWrite.mockResolvedValue(undefined)
      const result = useBodAddAction()

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle action addition errors', async () => {
      const error = new Error('Failed to add action')
      mockBodAddAction.executeWrite.mockRejectedValue(error)

      const result = useBodAddAction()
      await expect(result.executeWrite()).rejects.toThrow('Failed to add action')
    })
  })

  describe('useBodApproveAction', () => {
    it('should return approve mock', () => {
      const result = useBodApproveAction()

      expect(result).toBe(mockBODWrites.approve)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful action approval', async () => {
      mockBODWrites.approve.executeWrite.mockResolvedValue(undefined)
      const result = useBodApproveAction()

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle approval reversal', () => {
      const result = useBodApproveAction()

      expect(result).toBe(mockBODWrites.approve)
    })
  })

  describe('Mock Behavior', () => {
    it('should return distinct mocks for different functions', () => {
      const setBoard = useBodSetBoardOfDirectors(MOCK_DATA.memberAddresses)
      const approve = useBodApproveAction()

      expect(setBoard).not.toBe(approve)
    })

    it('should maintain consistent interface structure', () => {
      const result = useBodSetBoardOfDirectors(MOCK_DATA.memberAddresses)

      expect(result).toHaveProperty('executeWrite')
      expect(result).toHaveProperty('writeResult')
      expect(result).toHaveProperty('receiptResult')
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support mock reset', () => {
      mockBODWrites.setBoard.executeWrite.mockResolvedValue(undefined)
      resetContractMocks()

      const result = useBodSetBoardOfDirectors(MOCK_DATA.memberAddresses)
      expect(result).toBe(mockBODWrites.setBoard)
    })

    it('should allow mock customization for different scenarios', async () => {
      mockBODWrites.approve.executeWrite.mockResolvedValueOnce('approval-tx-1')
      mockBODWrites.approve.executeWrite.mockResolvedValueOnce('approval-tx-2')

      const result1 = useBodApproveAction()
      const result2 = useBodApproveAction()

      const tx1 = await result1.executeWrite()
      const tx2 = await result2.executeWrite()

      expect(tx1).toBe('approval-tx-1')
      expect(tx2).toBe('approval-tx-2')
    })
  })
})

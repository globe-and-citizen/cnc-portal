import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useBodPause,
  useBodUnpause,
  useBodSetBoardOfDirectors,
  useBodAddAction,
  useBodApproveAction
} from '../writes'
import { mockBODWrites, resetContractMocks } from '@/tests/mocks'
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

  describe('useBodPause', () => {
    it('should return pause mock', () => {
      const result = useBodPause()

      expect(result).toBe(mockBODWrites.pause)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful pause execution', async () => {
      mockBODWrites.pause.executeWrite.mockResolvedValue(undefined)
      const result = useBodPause()

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle pause errors', async () => {
      const error = new Error('Pause failed')
      mockBODWrites.pause.executeWrite.mockRejectedValue(error)

      const result = useBodPause()
      await expect(result.executeWrite()).rejects.toThrow('Pause failed')
    })
  })

  describe('useBodUnpause', () => {
    it('should return unpause mock', () => {
      const result = useBodUnpause()

      expect(result).toBe(mockBODWrites.unpause)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful unpause execution', async () => {
      mockBODWrites.unpause.executeWrite.mockResolvedValue(undefined)
      const result = useBodUnpause()

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })
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

      expect(result).toBe(mockBODWrites.addAction)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful action addition', async () => {
      mockBODWrites.addAction.executeWrite.mockResolvedValue(undefined)
      const result = useBodAddAction()

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle action addition errors', async () => {
      const error = new Error('Failed to add action')
      mockBODWrites.addAction.executeWrite.mockRejectedValue(error)

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
      const pause = useBodPause()
      const unpause = useBodUnpause()
      const setBoard = useBodSetBoardOfDirectors(MOCK_DATA.memberAddresses)

      expect(pause).not.toBe(unpause)
      expect(unpause).not.toBe(setBoard)
    })

    it('should maintain consistent interface structure', () => {
      const result = useBodPause()

      expect(result).toHaveProperty('executeWrite')
      expect(result).toHaveProperty('writeResult')
      expect(result).toHaveProperty('receiptResult')
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support mock reset', () => {
      mockBODWrites.pause.executeWrite.mockResolvedValue(undefined)
      resetContractMocks()

      const result = useBodPause()
      expect(result).toBe(mockBODWrites.pause)
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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBodAddAction, useBodApproveAction } from '../writes'
import { mockBODWrites, mockBodAddAction, resetContractMocks } from '@/tests/mocks'

describe('BOD Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  describe('useBodAddAction', () => {
    it('returns the add-action composable', () => {
      const result = useBodAddAction()
      expect(result).toBe(mockBodAddAction)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('propagates executeWrite success and errors', async () => {
      mockBodAddAction.executeWrite.mockResolvedValueOnce('0xhash')
      await expect(useBodAddAction().executeWrite()).resolves.toBe('0xhash')

      mockBodAddAction.executeWrite.mockRejectedValueOnce(new Error('Failed to add action'))
      await expect(useBodAddAction().executeWrite()).rejects.toThrow('Failed to add action')
    })
  })

  describe('useBodApproveAction', () => {
    it('returns the approve mock', () => {
      const result = useBodApproveAction()
      expect(result).toBe(mockBODWrites.approve)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('forwards multiple mock scenarios', async () => {
      mockBODWrites.approve.executeWrite.mockResolvedValueOnce('approval-tx-1')
      mockBODWrites.approve.executeWrite.mockResolvedValueOnce('approval-tx-2')

      await expect(useBodApproveAction().executeWrite()).resolves.toBe('approval-tx-1')
      await expect(useBodApproveAction().executeWrite()).resolves.toBe('approval-tx-2')
    })
  })
})

// UNUSED composable — tests commented out alongside the composable:
//   useBodSetBoardOfDirectors. See ../writes.ts for the definition.

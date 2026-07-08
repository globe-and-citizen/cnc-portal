import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBodAddAction, useBodApproveAction } from '../writes'
import { mockBodAddAction, mockBodApproveAction } from '@/tests/mocks'

describe('BOD Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useBodAddAction', () => {
    it('returns the add-action composable mock', () => {
      const result = useBodAddAction()
      expect(result).toBe(mockBodAddAction)
      expect(result.executeAddAction).toBeInstanceOf(Function)
      expect(result.mutateAsync).toBeInstanceOf(Function)
    })

    it('forwards executeAddAction success and errors from the mock', async () => {
      mockBodAddAction.executeAddAction.mockResolvedValueOnce('0xhash')
      await expect(useBodAddAction().executeAddAction({})).resolves.toBe('0xhash')

      mockBodAddAction.executeAddAction.mockRejectedValueOnce(new Error('Failed to add action'))
      await expect(useBodAddAction().executeAddAction({})).rejects.toThrow('Failed to add action')
    })
  })

  describe('useBodApproveAction', () => {
    it('returns the approve-action composable mock', () => {
      const result = useBodApproveAction()
      expect(result).toBe(mockBodApproveAction)
      expect(result.executeApproveAction).toBeInstanceOf(Function)
      expect(result.mutateAsync).toBeInstanceOf(Function)
    })

    it('forwards executeApproveAction success and errors from the mock', async () => {
      mockBodApproveAction.executeApproveAction.mockResolvedValueOnce('approval-tx-1')
      await expect(useBodApproveAction().executeApproveAction(1)).resolves.toBe('approval-tx-1')

      mockBodApproveAction.executeApproveAction.mockRejectedValueOnce(new Error('Approve failed'))
      await expect(useBodApproveAction().executeApproveAction(1)).rejects.toThrow('Approve failed')
    })
  })
})

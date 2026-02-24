import { vi } from 'vitest'
import { mockBODReads, mockBODWrites, mockBodIsBodAction, mockBodAddAction } from '../mocks/contract.mock'

/**
 * Mock all BOD read composables
 */
vi.mock('@/composables/bod/reads', () => ({
  useBodOwner: vi.fn(() => mockBODReads.owner),
  useBodIsActionExecuted: vi.fn(() => mockBODReads.isActionExecuted),
  useBodIsApproved: vi.fn(() => mockBODReads.isApproved),
  useBodGetBoardOfDirectors: vi.fn(() => mockBODReads.boardMembers),
  useBodIsMember: vi.fn(() => mockBODReads.isMember),
  useBodApprovalCount: vi.fn(() => mockBODReads.approvalCount),
  useBodIsBodAction: vi.fn(() => mockBodIsBodAction)
}))

/**
 * Mock all BOD write composables
 */
vi.mock('@/composables/bod/writes', () => ({
  useBodPause: vi.fn(() => mockBODWrites.pause),
  useBodUnpause: vi.fn(() => mockBODWrites.unpause),
  useBodSetBoardOfDirectors: vi.fn(() => mockBODWrites.setBoard),
  useBodAddAction: vi.fn(() => mockBodAddAction),
  useBodApproveAction: vi.fn(() => mockBODWrites.approve)
}))

import { vi } from 'vitest'
import { computed } from 'vue'
import type { Address } from 'viem'
import { mockBODReads, mockBODWrites } from '../mocks/contract.mock'

const MOCK_BOD_ADDRESS = '0x3234567890123456789012345678901234567890' as Address

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
  useBodIsBodAction: vi.fn(() => mockBODReads.boardMembers)
}))

/**
 * Mock all BOD write composables
 */
vi.mock('@/composables/bod/writes', () => ({
  useBodPause: vi.fn(() => mockBODWrites.pause),
  useBodUnpause: vi.fn(() => mockBODWrites.unpause),
  useBodSetBoardOfDirectors: vi.fn(() => mockBODWrites.setBoard),
  useBodAddAction: vi.fn(() => mockBODWrites.addAction),
  useBodApproveAction: vi.fn(() => mockBODWrites.approve)
}))

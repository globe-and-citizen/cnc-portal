import { vi } from 'vitest'
import { mockBODReads, mockBODWrites, mockBodIsBodAction, mockBodAddAction } from '../mocks/contract.mock'

/**
 * Mock BOD read composables. Unused reads (useBodIsApproved, useBodGetBoardOfDirectors,
 * useBodApprovalCount) are commented out in src/composables/bod/reads.ts.
 * useBodOwner + useBodIsMember are kept because useBodIsBodAction depends on them internally.
 */
vi.mock('@/composables/bod/reads', () => ({
  useBodOwner: vi.fn(() => mockBODReads.owner),
  useBodIsActionExecuted: vi.fn(() => mockBODReads.isActionExecuted),
  useBodIsMember: vi.fn(() => mockBODReads.isMember),
  useBodIsBodAction: vi.fn(() => mockBodIsBodAction)
}))

/**
 * Mock BOD write composables that are actually consumed.
 * useBodSetBoardOfDirectors is commented out in src/composables/bod/writes.ts.
 */
vi.mock('@/composables/bod/writes', () => ({
  useBodAddAction: vi.fn(() => mockBodAddAction),
  useBodApproveAction: vi.fn(() => mockBODWrites.approve)
}))

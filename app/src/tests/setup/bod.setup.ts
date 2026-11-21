import {
  mockBODReads,
  mockBodAddAction,
  mockBodApproveAction,
  mockBodIsBodAction
} from '../mocks/contract.mock'
import { vi } from 'vitest'

/**
 * Mock BOD read composables. Unused reads (useBodIsApproved, useBodApprovalCount) are
 * commented out in src/composables/bod/reads.ts.
 * useBodOwner + useBodIsMember are kept because useBodIsBodAction depends on them internally.
 */
vi.mock('@/composables/bod/reads', async (importOriginal) => ({
  BOD_FUNCTION_NAMES: (await importOriginal<typeof import('@/composables/bod/reads')>())
    .BOD_FUNCTION_NAMES,
  useBodOwner: vi.fn(() => mockBODReads.owner),
  useBodIsActionExecuted: vi.fn(() => mockBODReads.isActionExecuted),
  useBodIsMember: vi.fn(() => mockBODReads.isMember),
  useBodGetBoardOfDirectors: vi.fn(() => mockBODReads.boardMembers),
  useBodIsBodAction: vi.fn(() => mockBodIsBodAction)
}))

/**
 * Mock BOD write composables that are actually consumed.
 * useBodSetBoardOfDirectors is commented out in src/composables/bod/writes.ts.
 */
vi.mock('@/composables/bod/writes', () => ({
  useBodAddAction: vi.fn(() => mockBodAddAction),
  useBodApproveAction: vi.fn(() => mockBodApproveAction)
}))

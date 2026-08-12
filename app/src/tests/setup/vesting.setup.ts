import { vi } from 'vitest'
import { ref } from 'vue'
import { mockVestingReads, mockVestingWrites } from '../mocks/contract.mock'

/**
 * Mock Vesting composables.
 */
vi.mock('@/composables/vesting/writes', () => ({
  useVestingAddVestingWrite: vi.fn(() => mockVestingWrites.addVesting),
  useVestingStopVestingWrite: vi.fn(() => mockVestingWrites.stopVesting),
  useVestingReleaseWrite: vi.fn(() => mockVestingWrites.release)
}))

vi.mock('@/composables/vesting/reads', () => ({
  useVestingAddress: vi.fn(() => ref('0x1000000000000000000000000000000000000001')),
  useVestingGetVestingsWithMembers: vi.fn(() => mockVestingReads.vestingsWithMembers),
  useVestingGetAllArchivedVestingsFlat: vi.fn(() => mockVestingReads.archivedVestingsFlat)
}))

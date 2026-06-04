import { vi } from 'vitest'
import { mockVestingWrites } from '../mocks/contract.mock'

/**
 * Mock Vesting write composables.
 * Vesting reads are mocked per-spec where needed (see CreateVesting tests).
 */
vi.mock('@/composables/vesting/writes', () => ({
  useVestingAddVestingWrite: vi.fn(() => mockVestingWrites.addVesting),
  useVestingStopVestingWrite: vi.fn(() => mockVestingWrites.stopVesting),
  useVestingReleaseWrite: vi.fn(() => mockVestingWrites.release)
}))

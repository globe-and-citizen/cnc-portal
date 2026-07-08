import { beforeEach, vi } from 'vitest'
import { mockERC20Reads, mockERC20Writes, resetERC20Mocks } from '../mocks/erc20.mock'

// Restore ERC20 read/write mocks to defaults before every test.
beforeEach(() => {
  resetERC20Mocks()
})

/**
 * Mock ERC20 read composables that are actually consumed. Unused reads
 * (useErc20Name, useErc20Symbol, useErc20Decimals, useErc20TotalSupply) are
 * commented out in src/composables/erc20/reads.ts.
 */
vi.mock('@/composables/erc20/reads', () => ({
  useErc20BalanceOf: vi.fn(() => mockERC20Reads.balanceOf),
  useErc20Allowance: vi.fn(() => mockERC20Reads.allowance)
}))

/**
 * Mock ERC20 write composables.
 */
vi.mock('@/composables/erc20/writes', () => ({
  useERC20Approve: vi.fn(() => mockERC20Writes.approve),
  useERC20Transfer: vi.fn(() => mockERC20Writes.transfer)
}))

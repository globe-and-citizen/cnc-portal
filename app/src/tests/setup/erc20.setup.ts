import { vi } from 'vitest'
import { mockERC20Reads, mockERC20Writes } from '../mocks/erc20.mock'

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
 * Mock ERC20 write composables that are actually consumed. Unused writes
 * (useERC20Transfer, useERC20TransferFrom) are commented out in
 * src/composables/erc20/writes.ts.
 */
vi.mock('@/composables/erc20/writes', () => ({
  useERC20ContractWrite: vi.fn(() => mockERC20Writes.approve),
  useERC20Approve: vi.fn(() => mockERC20Writes.approve)
}))

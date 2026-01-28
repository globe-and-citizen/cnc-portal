import { vi } from 'vitest'
import { mockERC20Reads, mockERC20Writes } from '../mocks/erc20.mock'

/**
 * Mock all ERC20 read composables using generic patterns
 */
vi.mock('@/composables/erc20/reads', () => ({
  useErc20Name: vi.fn(() => mockERC20Reads.name),
  useErc20Symbol: vi.fn(() => mockERC20Reads.symbol),
  useErc20Decimals: vi.fn(() => mockERC20Reads.decimals),
  useErc20TotalSupply: vi.fn(() => mockERC20Reads.totalSupply),
  useErc20BalanceOf: vi.fn(() => mockERC20Reads.balanceOf),
  useErc20Allowance: vi.fn(() => mockERC20Reads.allowance)
}))

/**
 * Mock all ERC20 write composables using generic patterns
 */
vi.mock('@/composables/erc20/writes', () => ({
  useERC20ContractWrite: vi.fn(() => mockERC20Writes.approve), // Generic fallback
  useERC20Transfer: vi.fn(() => mockERC20Writes.transfer),
  useERC20TransferFrom: vi.fn(() => mockERC20Writes.transferFrom),
  useERC20Approve: vi.fn(() => mockERC20Writes.approve)
}))
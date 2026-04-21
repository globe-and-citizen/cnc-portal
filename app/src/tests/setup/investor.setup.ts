import { vi } from 'vitest'
import { computed } from 'vue'
import type { Address } from 'viem'
import { mockInvestorReads } from '../mocks/contract.mock'

const MOCK_INVESTOR_ADDRESS = '0x4234567890123456789012345678901234567890' as Address

/**
 * Mock Investor read composables that are actually consumed.
 * `useInvestorPaused` is commented out in src/composables/investor/reads.ts.
 */
vi.mock('@/composables/investor/reads', () => ({
  useInvestorAddress: vi.fn(() => computed(() => MOCK_INVESTOR_ADDRESS)),
  useInvestorName: vi.fn(() => mockInvestorReads.name),
  useInvestorSymbol: vi.fn(() => mockInvestorReads.symbol),
  useInvestorTotalSupply: vi.fn(() => mockInvestorReads.totalSupply),
  useInvestorOwner: vi.fn(() => mockInvestorReads.owner),
  useInvestorBalanceOf: vi.fn(() => mockInvestorReads.balanceOf),
  useInvestorShareholders: vi.fn(() => mockInvestorReads.shareholders)
}))

// All investor write composables are unused; see src/composables/investor/writes.ts.
// vi.mock('@/composables/investor/writes', () => ({}))

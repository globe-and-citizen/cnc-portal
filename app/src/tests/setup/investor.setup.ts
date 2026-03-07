import { vi } from 'vitest'
import { computed } from 'vue'
import type { Address } from 'viem'
import { mockInvestorReads, mockInvestorWrites } from '../mocks/contract.mock'

const MOCK_INVESTOR_ADDRESS = '0x4234567890123456789012345678901234567890' as Address

/**
 * Mock all Investor read composables
 */
vi.mock('@/composables/investor/reads', () => ({
  useInvestorAddress: vi.fn(() => computed(() => MOCK_INVESTOR_ADDRESS)),
  useInvestorName: vi.fn(() => mockInvestorReads.name),
  useInvestorSymbol: vi.fn(() => mockInvestorReads.symbol),
  useInvestorTotalSupply: vi.fn(() => mockInvestorReads.totalSupply),
  useInvestorPaused: vi.fn(() => mockInvestorReads.paused),
  useInvestorOwner: vi.fn(() => mockInvestorReads.owner),
  useInvestorBalanceOf: vi.fn(() => mockInvestorReads.balanceOf),
  useInvestorShareholders: vi.fn(() => mockInvestorReads.shareholders)
}))

/**
 * Mock all Investor write composables
 */
vi.mock('@/composables/investor/writes', () => ({
  useInvestorContractWrite: vi.fn(() => mockInvestorWrites.mint),
  useIndividualMint: vi.fn(() => mockInvestorWrites.mint),
  useDistributeMint: vi.fn(() => mockInvestorWrites.mint),
  useTransfer: vi.fn(() => mockInvestorWrites.transfer),
  usePause: vi.fn(() => mockInvestorWrites.pause),
  useUnpause: vi.fn(() => mockInvestorWrites.unpause),
  useInitialize: vi.fn(() => mockInvestorWrites.initialize),
  useTransferOwnership: vi.fn(() => mockInvestorWrites.transferOwnership),
  useRenounceOwnership: vi.fn(() => mockInvestorWrites.renounceOwnership)
}))

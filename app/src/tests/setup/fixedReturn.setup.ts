import { vi } from 'vitest'
import { computed } from 'vue'
import type { Address } from 'viem'
import { mockFixedReturnReads, mockFixedReturnWrites } from '../mocks/contract.mock'

const MOCK_FIXED_RETURN_ADDRESS = '0x5234567890123456789012345678901234567890' as Address

vi.mock('@/composables/fixedReturn/reads', () => ({
  useFixedReturnAddress: vi.fn(() => computed(() => MOCK_FIXED_RETURN_ADDRESS)),
  useFixedReturnOwner: vi.fn(() => mockFixedReturnReads.owner),
  useFixedReturnVersion: vi.fn(() => mockFixedReturnReads.version),
  useFixedReturnTotalOfferings: vi.fn(() => mockFixedReturnReads.totalOfferings),
  useFixedReturnGetLendingOffer: vi.fn(() => mockFixedReturnReads.getLendingOffer),
  useFixedReturnGetOfferLenders: vi.fn(() => mockFixedReturnReads.getOfferLenders),
  useFixedReturnTotalEntitlementOf: vi.fn(() => mockFixedReturnReads.totalEntitlementOf),
  useFixedReturnLenderDeposits: vi.fn(() => mockFixedReturnReads.lenderDeposits),
  useFixedReturnLenderAllocation: vi.fn(() => mockFixedReturnReads.lenderAllocation),
  useFixedReturnHasDeposited: vi.fn(() => mockFixedReturnReads.hasDeposited),
  useFixedReturnIsTokenSupported: vi.fn(() => mockFixedReturnReads.isTokenSupported),
  useFixedReturnGetSupportedTokens: vi.fn(() => mockFixedReturnReads.getSupportedTokens),
  useFixedReturnAllOffers: vi.fn(() => mockFixedReturnReads.allOffers),
  useFixedReturnOfferLenders: vi.fn(() => mockFixedReturnReads.offerLenders)
}))

vi.mock('@/composables/fixedReturn/writes', () => ({
  useFixedReturnCreateLendingOffer: vi.fn(() => mockFixedReturnWrites.createLendingOffer),
  useFixedReturnLendFunds: vi.fn(() => mockFixedReturnWrites.lendFunds),
  useFixedReturnMarkAsRefundable: vi.fn(() => mockFixedReturnWrites.markAsRefundable),
  useFixedReturnClaimRefund: vi.fn(() => mockFixedReturnWrites.claimRefund),
  useFixedReturnRepayLenders: vi.fn(() => mockFixedReturnWrites.repayLenders),
  useFixedReturnAddTokenSupport: vi.fn(() => mockFixedReturnWrites.addTokenSupport),
  useFixedReturnRemoveTokenSupport: vi.fn(() => mockFixedReturnWrites.removeTokenSupport)
}))

import { vi } from 'vitest'
import { computed } from 'vue'
import type { Address } from 'viem'
import { mockBankReads, mockBankWrites } from '../mocks/contract.mock'

const MOCK_BANK_ADDRESS = '0x2234567890123456789012345678901234567890' as Address

/**
 * Mock Bank read composables. Only `useBankAddress` is consumed today;
 * `useBankPaused`/`useBankOwner`/`useBankSupportedTokens` are dead — see
 * src/composables/bank/reads.ts for the commented-out definitions.
 */
vi.mock('@/composables/bank/reads', () => ({
  useBankAddress: vi.fn(() => computed(() => MOCK_BANK_ADDRESS))
}))

/**
 * Mock Bank write composables that are actually consumed.
 * The remaining writes (useAddTokenSupport, useRemoveTokenSupport, usePause,
 * useUnpause, useTransferOwnership, useRenounceOwnership, useTransfer,
 * useTransferToken) are commented out in src/composables/bank/writes.ts.
 */
vi.mock('@/composables/bank/writes', () => ({
  useDepositToken: vi.fn(() => mockBankWrites.deposit),
  useDistributeNativeDividends: vi.fn(() => mockBankWrites.distributeNativeDividends),
  useDistributeTokenDividends: vi.fn(() => mockBankWrites.distributeTokenDividends)
}))

void mockBankReads

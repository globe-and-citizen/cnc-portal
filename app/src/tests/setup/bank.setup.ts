import { vi } from 'vitest'
import { computed } from 'vue'
import type { Address } from 'viem'
import { mockBankReads, mockBankWrites } from '../mocks/contract.mock'

const MOCK_BANK_ADDRESS = '0x2234567890123456789012345678901234567890' as Address

/**
 * Mock all Bank read composables
 */
vi.mock('@/composables/bank/reads', () => ({
  useBankAddress: vi.fn(() => computed(() => MOCK_BANK_ADDRESS)),
  useBankPaused: vi.fn(() => mockBankReads.paused),
  useBankOwner: vi.fn(() => mockBankReads.owner),
  useBankSupportedTokens: vi.fn(() => mockBankReads.supportedTokens)
}))

/**
 * Mock all Bank write composables
 */
vi.mock('@/composables/bank/writes', () => ({
  useBankContractWrite: vi.fn(() => mockBankWrites.deposit),
  useDepositToken: vi.fn(() => mockBankWrites.deposit),
  useAddTokenSupport: vi.fn(() => mockBankWrites.addTokenSupport),
  useRemoveTokenSupport: vi.fn(() => mockBankWrites.removeTokenSupport),
  usePause: vi.fn(() => mockBankWrites.pause),
  useUnpause: vi.fn(() => mockBankWrites.unpause),
  useTransferOwnership: vi.fn(() => mockBankWrites.transferOwnership),
  useRenounceOwnership: vi.fn(() => mockBankWrites.renounceOwnership),
  useTransfer: vi.fn(() => mockBankWrites.transfer),
  useTransferToken: vi.fn(() => mockBankWrites.transferToken)
}))

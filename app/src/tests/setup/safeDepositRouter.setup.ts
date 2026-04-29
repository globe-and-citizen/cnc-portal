import { vi } from 'vitest'
import {
  mockSafeDepositRouterAddress,
  mockSafeDepositRouterReads,
  mockSafeDepositRouterWrites
} from '../mocks/safeDepositRouter.mock'

/**
 * Mock SafeDepositRouter read composables that are actually consumed. Unused
 * reads (useSafeDepositRouterOfficerAddress, useSafeDepositRouterMinMultiplier,
 * useSafeDepositRouterIsTokenSupported, useSafeDepositRouterTokenDecimals,
 * useSafeDepositRouterCalculateCompensation) are commented out in reads.ts.
 */
vi.mock('@/composables/safeDepositRouter/reads', () => ({
  useSafeDepositRouterAddress: vi.fn(() => mockSafeDepositRouterAddress),
  useSafeDepositRouterPaused: vi.fn(() => mockSafeDepositRouterReads.paused),
  useSafeDepositRouterOwner: vi.fn(() => mockSafeDepositRouterReads.owner),
  useSafeDepositRouterDepositsEnabled: vi.fn(() => mockSafeDepositRouterReads.depositsEnabled),
  useSafeDepositRouterSafeAddress: vi.fn(() => mockSafeDepositRouterReads.safeAddress),
  useSafeDepositRouterMultiplier: vi.fn(() => mockSafeDepositRouterReads.multiplier)
}))

/**
 * Mock SafeDepositRouter write composables that are actually consumed. Unused
 * writes (usePauseContract, useUnpauseContract, useDepositWithSlippage,
 * useRecoverERC20) are commented out in writes.ts.
 */
vi.mock('@/composables/safeDepositRouter/writes', () => ({
  useEnableDeposits: vi.fn(() => mockSafeDepositRouterWrites.enableDeposits),
  useDisableDeposits: vi.fn(() => mockSafeDepositRouterWrites.disableDeposits),
  useRenounceOwnership: vi.fn(() => mockSafeDepositRouterWrites.renounceOwnership),
  useTransferOwnership: vi.fn(() => mockSafeDepositRouterWrites.transferOwnership),
  useSetSafeAddress: vi.fn(() => mockSafeDepositRouterWrites.setSafeAddress),
  useSetMultiplier: vi.fn(() => mockSafeDepositRouterWrites.setMultiplier),
  useAddTokenSupport: vi.fn(() => mockSafeDepositRouterWrites.addTokenSupport),
  useRemoveTokenSupport: vi.fn(() => mockSafeDepositRouterWrites.removeTokenSupport),
  useDeposit: vi.fn(() => mockSafeDepositRouterWrites.deposit)
}))

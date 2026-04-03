import { vi } from 'vitest'
import {
  mockSafeDepositRouterAddress,
  mockSafeDepositRouterReads,
  mockSafeDepositRouterWrites
} from '../mocks/safeDepositRouter.mock'

vi.mock('@/composables/safeDepositRouter/reads', () => ({
  useSafeDepositRouterAddress: vi.fn(() => mockSafeDepositRouterAddress),
  useSafeDepositRouterPaused: vi.fn(() => mockSafeDepositRouterReads.paused),
  useSafeDepositRouterOwner: vi.fn(() => mockSafeDepositRouterReads.owner),
  useSafeDepositRouterDepositsEnabled: vi.fn(() => mockSafeDepositRouterReads.depositsEnabled),
  useSafeDepositRouterSafeAddress: vi.fn(() => mockSafeDepositRouterReads.safeAddress),
  useSafeDepositRouterInvestorAddress: vi.fn(() => mockSafeDepositRouterReads.investorAddress),
  useSafeDepositRouterMultiplier: vi.fn(() => mockSafeDepositRouterReads.multiplier),
  useSafeDepositRouterMinMultiplier: vi.fn(() => mockSafeDepositRouterReads.minMultiplier),
  useSafeDepositRouterSupportedTokens: vi.fn(() => mockSafeDepositRouterReads.supportedTokens),
  useSafeDepositRouterTokenDecimals: vi.fn(() => mockSafeDepositRouterReads.tokenDecimals),
  useSafeDepositRouterCalculateCompensation: vi.fn(
    () => mockSafeDepositRouterReads.calculateCompensation
  )
}))

vi.mock('@/composables/safeDepositRouter/writes', () => ({
  useEnableDeposits: vi.fn(() => mockSafeDepositRouterWrites.enableDeposits),
  useDisableDeposits: vi.fn(() => mockSafeDepositRouterWrites.disableDeposits),
  usePauseContract: vi.fn(() => mockSafeDepositRouterWrites.pause),
  useUnpauseContract: vi.fn(() => mockSafeDepositRouterWrites.unpause),
  useRenounceOwnership: vi.fn(() => mockSafeDepositRouterWrites.renounceOwnership),
  useTransferOwnership: vi.fn(() => mockSafeDepositRouterWrites.transferOwnership),
  useSetSafeAddress: vi.fn(() => mockSafeDepositRouterWrites.setSafeAddress),
  useSetInvestorAddress: vi.fn(() => mockSafeDepositRouterWrites.setInvestorAddress),
  useSetMultiplier: vi.fn(() => mockSafeDepositRouterWrites.setMultiplier),
  useAddTokenSupport: vi.fn(() => mockSafeDepositRouterWrites.addTokenSupport),
  useRemoveTokenSupport: vi.fn(() => mockSafeDepositRouterWrites.removeTokenSupport),
  useDeposit: vi.fn(() => mockSafeDepositRouterWrites.deposit),
  useDepositWithSlippage: vi.fn(() => mockSafeDepositRouterWrites.depositWithSlippage),
  useRecoverERC20: vi.fn(() => mockSafeDepositRouterWrites.recoverERC20)
}))

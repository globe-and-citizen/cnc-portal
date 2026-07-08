import { vi } from 'vitest'
import { ref } from 'vue'
import { createContractReadMock, createContractWriteV3Mock } from './erc20.mock'
import type { LendingOfferStruct } from '@/types'

/**
 * Elections Contract Mocks
 */
export const mockElectionsReads = {
  address: createContractReadMock('0x1234567890123456789012345678901234567890'),
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886'),
  getElection: createContractReadMock<readonly (string | bigint | boolean)[] | null>(null),
  getVoteCount: createContractReadMock(0n),
  getCandidates: createContractReadMock<string[]>([]),
  getEligibleVoters: createContractReadMock<string[]>([]),
  getWinners: createContractReadMock<string[]>([]),
  hasVoted: createContractReadMock(false)
}

export const mockElectionsWrites = {
  createElection: createContractWriteV3Mock(),
  castVote: createContractWriteV3Mock(),
  publishResults: createContractWriteV3Mock()
}

/**
 * Bank Contract Mocks
 */
export const mockBankReads = {
  paused: createContractReadMock(false),
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886'),
  supportedTokens: createContractReadMock([])
}

export const mockBankWrites = {
  deposit: createContractWriteV3Mock(),
  addTokenSupport: createContractWriteV3Mock(),
  removeTokenSupport: createContractWriteV3Mock(),
  distributeNativeDividends: createContractWriteV3Mock(),
  distributeTokenDividends: createContractWriteV3Mock(),
  depositDividends: createContractWriteV3Mock(),
  depositTokenDividends: createContractWriteV3Mock(),
  transfer: createContractWriteV3Mock(),
  transferToken: createContractWriteV3Mock(),
  transferOwnership: createContractWriteV3Mock(),
  renounceOwnership: createContractWriteV3Mock(),
  pause: createContractWriteV3Mock(),
  unpause: createContractWriteV3Mock(),
  fundFixedReturnRepayment: createContractWriteV3Mock()
}

/**
 * BOD (Board of Directors) Contract Mocks
 */
export const mockBODReads = {
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886'),
  boardMembers: createContractReadMock([]),
  isMember: createContractReadMock(false),
  isActionExecuted: createContractReadMock(false),
  isApproved: createContractReadMock(false),
  approvalCount: createContractReadMock(0n),
  memberCount: createContractReadMock(0n)
}

/**
 * BOD Composable-level mocks (higher-level interfaces returned by BOD composables)
 */
export const mockBodIsBodAction = {
  isBodAction: ref(false)
}

export const mockBodAddAction = {
  ...createContractWriteV3Mock(),
  executeAddAction: vi.fn()
}

export const mockBodApproveAction = {
  ...createContractWriteV3Mock(),
  executeApproveAction: vi.fn()
}

/**
 * CashRemunerationEIP712 Contract Mocks
 */
export const mockCashRemunerationReads = {
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886')
}

export const mockCashRemunerationWrites = {
  ownerWithdrawAllToBank: createContractWriteV3Mock(),
  enableClaim: createContractWriteV3Mock(),
  disableClaim: createContractWriteV3Mock()
}

/**
 * ExpenseAccountEIP712 Contract Mocks
 */
export const mockExpenseAccountReads = {
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886')
}

export const mockExpenseAccountWrites = {
  ownerWithdrawAllToBank: createContractWriteV3Mock(),
  transfer: createContractWriteV3Mock(),
  activateApproval: createContractWriteV3Mock(),
  deactivateApproval: createContractWriteV3Mock()
}

/**
 * Vesting Contract Mocks
 */
export const mockVestingWrites = {
  addVesting: createContractWriteV3Mock(),
  stopVesting: createContractWriteV3Mock(),
  release: createContractWriteV3Mock()
}

/**
 * Investor Contract Mocks
 */
export const mockInvestorReads = {
  name: createContractReadMock('Investor'),
  symbol: createContractReadMock('INV'),
  totalSupply: createContractReadMock(0n),
  paused: createContractReadMock(false),
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886'),
  balanceOf: createContractReadMock(0n),
  shareholders: createContractReadMock([]),
  totalInvested: createContractReadMock(0n),
  userInvestment: createContractReadMock(0n),
  dividendBalance: createContractReadMock(0n),
  investorCount: createContractReadMock(0n)
}

export const mockInvestorWrites = {
  invest: createContractWriteV3Mock(),
  claimDividend: createContractWriteV3Mock(),
  withdraw: createContractWriteV3Mock(),
  mint: createContractWriteV3Mock(),
  individualMint: createContractWriteV3Mock(),
  distributeMint: createContractWriteV3Mock(),
  transfer: createContractWriteV3Mock(),
  pause: createContractWriteV3Mock(),
  unpause: createContractWriteV3Mock(),
  initialize: createContractWriteV3Mock(),
  transferOwnership: createContractWriteV3Mock(),
  renounceOwnership: createContractWriteV3Mock()
}

/**
 * FixedReturn Contract Mocks
 */
export const mockFixedReturnReads = {
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886'),
  version: createContractReadMock('1.0.0'),
  totalOfferings: createContractReadMock(0n),
  getLendingOffer: createContractReadMock<Partial<LendingOfferStruct> | null>(null),
  getOfferLenders: createContractReadMock<string[]>([]),
  totalEntitlementOf: createContractReadMock(0n),
  lenderDeposits: createContractReadMock(0n),
  lenderAllocation: createContractReadMock(0n),
  hasDeposited: createContractReadMock(false),
  isTokenSupported: createContractReadMock(false),
  getSupportedTokens: createContractReadMock<string[]>([]),
  // useQuery-shaped (not a direct ABI read) — see useFixedReturnAllOffers/
  // useFixedReturnOfferLenders/useFixedReturnMyLenderPositions in
  // composables/fixedReturn/reads.ts.
  allOffers: createContractReadMock<unknown[]>([]),
  offerLenders: createContractReadMock<unknown[]>([]),
  myLenderPositions: createContractReadMock<Map<number, unknown>>(new Map())
}

export const mockFixedReturnWrites = {
  createLendingOffer: createContractWriteV3Mock(),
  lendFunds: createContractWriteV3Mock(),
  markAsRefundable: createContractWriteV3Mock(),
  claimRefund: createContractWriteV3Mock(),
  addTokenSupport: createContractWriteV3Mock(),
  removeTokenSupport: createContractWriteV3Mock()
}

/**
 * Reset function for all contract mocks
 */
export const resetContractMocks = () => {
  const allReadMocks = [
    mockElectionsReads,
    mockBankReads,
    mockBODReads,
    mockInvestorReads,
    mockCashRemunerationReads,
    mockExpenseAccountReads,
    mockFixedReturnReads
  ]

  const allWriteV3Mocks = [
    mockBankWrites,
    mockCashRemunerationWrites,
    mockExpenseAccountWrites,
    mockElectionsWrites,
    mockInvestorWrites,
    mockVestingWrites,
    mockFixedReturnWrites
  ]

  const allComposableV3Mocks = [mockBodAddAction, mockBodApproveAction]

  // Reset all read mocks
  allReadMocks.forEach((mockGroup) => {
    Object.values(mockGroup).forEach((mock) => {
      mock.error.value = null
      mock.isLoading.value = false
      mock.isSuccess.value = true
      mock.isError.value = false
      mock.isFetched.value = true
      mock.isPending.value = false
      mock.status.value = 'success'

      if (vi.isMockFunction(mock.refetch)) {
        mock.refetch.mockClear()
      }
    })
  })

  // Reset V3 write mocks (TanStack mutation shape)
  allWriteV3Mocks.forEach((mockGroup) => {
    Object.values(mockGroup).forEach((mock) => {
      mock.isPending.value = false
      mock.isSuccess.value = false
      mock.isError.value = false
      mock.error.value = null
      mock.data.value = null
      mock.status.value = 'idle'

      if (vi.isMockFunction(mock.mutate)) mock.mutate.mockClear()
      if (vi.isMockFunction(mock.mutateAsync)) {
        mock.mutateAsync.mockClear()
        mock.mutateAsync.mockResolvedValue(undefined)
      }
      if (vi.isMockFunction(mock.reset)) mock.reset.mockClear()
    })
  })

  // Reset composable-level mocks (V3 mutation shape + wrapper fn)
  allComposableV3Mocks.forEach((mock) => {
    mock.isPending.value = false
    mock.isSuccess.value = false
    mock.isError.value = false
    mock.error.value = null
    mock.data.value = null
    mock.status.value = 'idle'

    if (vi.isMockFunction(mock.mutate)) mock.mutate.mockClear()
    if (vi.isMockFunction(mock.mutateAsync)) {
      mock.mutateAsync.mockClear()
      mock.mutateAsync.mockResolvedValue(undefined)
    }
    if (vi.isMockFunction(mock.reset)) mock.reset.mockClear()

    if ('executeAddAction' in mock && vi.isMockFunction(mock.executeAddAction)) {
      mock.executeAddAction.mockClear()
    }
    if ('executeApproveAction' in mock && vi.isMockFunction(mock.executeApproveAction)) {
      mock.executeApproveAction.mockClear()
    }
  })
}

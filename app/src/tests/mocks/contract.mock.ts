import { vi } from 'vitest'
import { ref } from 'vue'
import {
  createContractReadMock,
  createContractWriteMock,
  createContractWriteV3Mock
} from './erc20.mock'

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
  createElection: createContractWriteMock(),
  castVote: createContractWriteMock(),
  publishResults: createContractWriteMock()
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
  unpause: createContractWriteV3Mock()
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

export const mockBODWrites = {
  addMember: createContractWriteMock(),
  removeMember: createContractWriteMock(),
  updateMember: createContractWriteMock(),
  pause: createContractWriteMock(),
  unpause: createContractWriteMock(),
  setBoard: createContractWriteMock(),
  addAction: createContractWriteMock(),
  approve: createContractWriteMock()
}

/**
 * BOD Composable-level mocks (higher-level interfaces returned by BOD composables)
 */
export const mockBodIsBodAction = {
  isBodAction: ref(false)
}

export const mockBodAddAction = {
  executeAddAction: vi.fn(),
  isPending: ref(false),
  isConfirming: ref(false),
  isActionAdded: ref(false),
  executeWrite: vi.fn(),
  invalidateQueries: vi.fn(),
  writeResult: {
    data: ref(null),
    error: ref(null),
    isLoading: ref(false),
    isSuccess: ref(false),
    isError: ref(false),
    isPending: ref(false),
    status: ref('idle' as const)
  },
  receiptResult: {
    data: ref(null),
    error: ref(null),
    isLoading: ref(false),
    isSuccess: ref(false),
    isError: ref(false),
    isPending: ref(false),
    status: ref('idle' as const)
  }
}

/**
 * CashRemunerationEIP712 Contract Mocks
 */
export const mockCashRemunerationReads = {
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886')
}

export const mockCashRemunerationWrites = {
  ownerWithdrawAllToBank: createContractWriteMock()
}

/**
 * ExpenseAccountEIP712 Contract Mocks
 */
export const mockExpenseAccountReads = {
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886')
}

export const mockExpenseAccountWrites = {
  ownerWithdrawAllToBank: createContractWriteMock()
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
  invest: createContractWriteMock(),
  claimDividend: createContractWriteMock(),
  withdraw: createContractWriteMock(),
  mint: createContractWriteMock(),
  transfer: createContractWriteMock(),
  pause: createContractWriteMock(),
  unpause: createContractWriteMock(),
  initialize: createContractWriteMock(),
  transferOwnership: createContractWriteMock(),
  renounceOwnership: createContractWriteMock()
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
    mockExpenseAccountReads
  ]

  const allWriteV2Mocks = [
    mockElectionsWrites,
    mockBODWrites,
    mockInvestorWrites,
    mockCashRemunerationWrites,
    mockExpenseAccountWrites
  ]

  const allWriteV3Mocks = [mockBankWrites]

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

  // Reset V2 write mocks
  allWriteV2Mocks.forEach((mockGroup) => {
    Object.values(mockGroup).forEach((mock) => {
      mock.writeResult.data.value = null
      mock.writeResult.error.value = null
      mock.writeResult.isLoading.value = false
      mock.writeResult.isSuccess.value = false
      mock.writeResult.isError.value = false
      mock.writeResult.isPending.value = false
      mock.writeResult.status.value = 'idle'

      mock.receiptResult.data.value = null
      mock.receiptResult.error.value = null
      mock.receiptResult.isLoading.value = false
      mock.receiptResult.isSuccess.value = false
      mock.receiptResult.isError.value = false
      mock.receiptResult.isPending.value = false
      mock.receiptResult.status.value = 'idle'

      if (vi.isMockFunction(mock.executeWrite)) {
        mock.executeWrite.mockClear()
        mock.executeWrite.mockResolvedValue(undefined)
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
}

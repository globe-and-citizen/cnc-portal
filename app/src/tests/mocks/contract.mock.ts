import { vi } from 'vitest'
import { ref } from 'vue'
import { createContractReadMock, createContractWriteMock } from './erc20.mock'

/**
 * Elections Contract Mocks
 */
export const mockElectionsReads = {
  address: createContractReadMock('0x1234567890123456789012345678901234567890'),
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886'),
  getElection: createContractReadMock(null),
  getVoteCount: createContractReadMock(0n),
  getCandidates: createContractReadMock([]),
  getEligibleVoters: createContractReadMock([]),
  getWinners: createContractReadMock([]),
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
  supportedTokens: createContractReadMock([]),
  dividendBalance: createContractReadMock(0n),
  tokenDividendBalance: createContractReadMock(0n),
  totalDividend: createContractReadMock(0n),
  unlockedBalance: createContractReadMock(0n),
  getDividendBalances: createContractReadMock([])
}

export const mockBankWrites = {
  deposit: createContractWriteMock(),
  addTokenSupport: createContractWriteMock(),
  removeTokenSupport: createContractWriteMock(),
  claimDividend: createContractWriteMock(),
  claimTokenDividend: createContractWriteMock(),
  depositDividends: createContractWriteMock(),
  depositTokenDividends: createContractWriteMock(),
  setInvestorAddress: createContractWriteMock(),
  transfer: createContractWriteMock(),
  transferToken: createContractWriteMock(),
  transferOwnership: createContractWriteMock(),
  renounceOwnership: createContractWriteMock(),
  pause: createContractWriteMock(),
  unpause: createContractWriteMock()
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
    mockInvestorReads
  ]

  const allWriteMocks = [
    mockElectionsWrites,
    mockBankWrites,
    mockBODWrites,
    mockInvestorWrites
  ]

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

  // Reset all write mocks
  allWriteMocks.forEach((mockGroup) => {
    Object.values(mockGroup).forEach((mock) => {
      // Reset write results
      mock.writeResult.data.value = null
      mock.writeResult.error.value = null
      mock.writeResult.isLoading.value = false
      mock.writeResult.isSuccess.value = false
      mock.writeResult.isError.value = false
      mock.writeResult.isPending.value = false
      mock.writeResult.status.value = 'idle'

      // Reset receipt results
      mock.receiptResult.data.value = null
      mock.receiptResult.error.value = null
      mock.receiptResult.isLoading.value = false
      mock.receiptResult.isSuccess.value = false
      mock.receiptResult.isError.value = false
      mock.receiptResult.isPending.value = false
      mock.receiptResult.status.value = 'idle'

      // Reset execute function
      if (vi.isMockFunction(mock.executeWrite)) {
        mock.executeWrite.mockClear()
        mock.executeWrite.mockResolvedValue(undefined)
      }
    })
  })
}

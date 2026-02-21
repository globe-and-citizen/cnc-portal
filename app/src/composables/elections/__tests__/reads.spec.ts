import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  useElectionsAddress,
  useElectionsOwner,
  useElectionsGetElection,
  useElectionsGetVoteCount,
  useElectionsGetCandidates,
  useElectionsGetEligibleVoters,
  useElectionsGetWinners,
  useElectionsHasVoted
} from '../reads'
import type { Address } from 'viem'

// Hoisted mock variables
const { mockUseReadContract, mockIsAddress, mockTeamStore } = vi.hoisted(() => ({
  mockUseReadContract: vi.fn(),
  mockIsAddress: vi.fn(),
  mockTeamStore: {
    getContractAddressByType: vi.fn()
  }
}))

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useReadContract: mockUseReadContract
}))

vi.mock('viem', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    isAddress: mockIsAddress
  }
})

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

// Test constants
const MOCK_DATA = {
  electionsAddress: '0x1234567890123456789012345678901234567890' as Address,
  ownerAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  voterAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  candidateAddress: '0x9876543210987654321098765432109876543210' as Address,
  electionId: BigInt(1),
  invalidAddress: 'invalid-address'
} as const

const mockReadContractResult = {
  data: ref(null),
  isLoading: ref(false),
  isError: ref(false),
  error: ref(null),
  isSuccess: ref(true),
  refetch: vi.fn()
}

describe('Elections Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseReadContract.mockReturnValue(mockReadContractResult)
    mockIsAddress.mockImplementation((address: string) => {
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    })
    mockTeamStore.getContractAddressByType.mockReturnValue(MOCK_DATA.electionsAddress)
  })

  describe('useElectionsAddress', () => {
    it('should return computed elections address from team store', () => {
      const result = useElectionsAddress()

      expect(result.value).toBe(MOCK_DATA.electionsAddress)
      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('Elections')
    })
  })

  describe('useElectionsOwner', () => {
    it('should call useReadContract with correct parameters', () => {
      useElectionsOwner()

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'owner',
        query: { enabled: expect.any(Object) }
      })
    })

    it('should enable query when address is valid', () => {
      useElectionsOwner()

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(true)
    })

    it('should disable query when address is invalid', () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(MOCK_DATA.invalidAddress)
      mockIsAddress.mockReturnValue(false)

      useElectionsOwner()

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(false)
    })
  })

  describe('useElectionsGetElection', () => {
    it('should call useReadContract with correct parameters', () => {
      useElectionsGetElection(MOCK_DATA.electionId)

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'getElection',
        args: expect.any(Object),
        query: { enabled: expect.any(Object) }
      })
    })

    it('should enable query when address and election ID are valid', () => {
      useElectionsGetElection(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(true)
    })

    it('should disable query when election ID is not provided', () => {
      useElectionsGetElection(BigInt(0))

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(false)
    })

    it('should work with reactive election ID', () => {
      const electionId = ref(MOCK_DATA.electionId)
      useElectionsGetElection(electionId)

      expect(mockUseReadContract).toHaveBeenCalled()
    })
  })

  describe('useElectionsGetVoteCount', () => {
    it('should call useReadContract with correct functionName', () => {
      useElectionsGetVoteCount(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.functionName).toBe('getVoteCount')
    })

    it('should enable query when address and election ID are valid', () => {
      useElectionsGetVoteCount(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(true)
    })
  })

  describe('useElectionsGetCandidates', () => {
    it('should call useReadContract with correct functionName', () => {
      useElectionsGetCandidates(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.functionName).toBe('getElectionCandidates')
    })

    it('should enable query when address and election ID are valid', () => {
      useElectionsGetCandidates(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(true)
    })
  })

  describe('useElectionsGetEligibleVoters', () => {
    it('should call useReadContract with correct functionName', () => {
      useElectionsGetEligibleVoters(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.functionName).toBe('getElectionEligibleVoters')
    })

    it('should enable query when address and election ID are valid', () => {
      useElectionsGetEligibleVoters(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(true)
    })
  })

  describe('useElectionsGetWinners', () => {
    it('should call useReadContract with correct functionName', () => {
      useElectionsGetWinners(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.functionName).toBe('getElectionWinners')
    })

    it('should enable query when address and election ID are valid', () => {
      useElectionsGetWinners(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(true)
    })
  })

  describe('useElectionsHasVoted', () => {
    it('should call useReadContract with correct parameters', () => {
      useElectionsHasVoted(MOCK_DATA.electionId, MOCK_DATA.voterAddress)

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'hasVoted',
        args: expect.any(Object),
        query: { enabled: expect.any(Object) }
      })
    })

    it('should enable query when all parameters are valid', () => {
      useElectionsHasVoted(MOCK_DATA.electionId, MOCK_DATA.voterAddress)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(true)
    })

    it('should disable query when voter address is invalid', () => {
      mockIsAddress.mockReturnValue(false)
      useElectionsHasVoted(MOCK_DATA.electionId, MOCK_DATA.invalidAddress as Address)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(false)
    })

    it('should enable query when address and election ID are valid', () => {
      useElectionsGetEligibleVoters(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(true)
    })
  })

  describe('useElectionsGetWinners', () => {
    it('should call useReadContract with correct functionName', () => {
      useElectionsGetWinners(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.functionName).toBe('getElectionWinners')
    })

    it('should enable query when address and election ID are valid', () => {
      useElectionsGetWinners(MOCK_DATA.electionId)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(true)
    })
  })

  describe('useElectionsHasVoted', () => {
    it('should call useReadContract with correct parameters', () => {
      useElectionsHasVoted(MOCK_DATA.electionId, MOCK_DATA.voterAddress)

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'hasVoted',
        args: expect.any(Object),
        query: { enabled: expect.any(Object) }
      })
    })

    it('should enable query when all parameters are valid', () => {
      useElectionsHasVoted(MOCK_DATA.electionId, MOCK_DATA.voterAddress)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(true)
    })

    it('should disable query when voter address is invalid', () => {
      mockIsAddress.mockReturnValue(false)
      useElectionsHasVoted(MOCK_DATA.electionId, MOCK_DATA.invalidAddress as Address)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query.enabled.value).toBe(false)
    })

    it('should work with reactive voter address', () => {
      const voterAddress = ref(MOCK_DATA.voterAddress)
      useElectionsHasVoted(MOCK_DATA.electionId, voterAddress)

      expect(mockUseReadContract).toHaveBeenCalled()
    })
  })
})

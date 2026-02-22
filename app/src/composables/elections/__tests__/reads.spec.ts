import { describe, it, expect, vi, beforeEach } from 'vitest'
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
import { mockElectionsReads, resetContractMocks } from '@/tests/mocks'
import type { Address } from 'viem'

// Test constants
const MOCK_DATA = {
  electionsAddress: '0x1234567890123456789012345678901234567890' as Address,
  ownerAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  voterAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  candidateAddress: '0x9876543210987654321098765432109876543210' as Address,
  electionId: BigInt(1)
} as const

describe('Elections Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })


  describe('useElectionsAddress', () => {
    it('should return mock elections address', () => {
      const result = useElectionsAddress()

      expect(result).toBeDefined()
      expect(typeof result.value).toBe('string')
    })
  })

  describe('useElectionsOwner', () => {
    it('should return mock owner address', () => {
      const result = useElectionsOwner()

      expect(result).toBe(mockElectionsReads.owner)
      expect(result.data.value).toBeDefined()
      expect(result.isSuccess.value).toBe(true)
    })

    it('should handle error state', () => {
      mockElectionsReads.owner.isError.value = true
      mockElectionsReads.owner.error.value = new Error('Failed to fetch owner')

      const result = useElectionsOwner()

      expect(result.isError.value).toBe(true)
      expect(result.error.value).toBeInstanceOf(Error)
    })

    it('should support refetch functionality', () => {
      const result = useElectionsOwner()

      result.refetch()
      expect(result.refetch).toHaveBeenCalled()
    })
  })

  describe('useElectionsGetElection', () => {
    it('should return election data mock', () => {
      mockElectionsReads.getElection.data.value = {
        id: MOCK_DATA.electionId,
        title: 'Test Election',
        candidates: [MOCK_DATA.candidateAddress]
      }

      const result = useElectionsGetElection(MOCK_DATA.electionId)

      expect(result).toBe(mockElectionsReads.getElection)
      expect(result.data.value).toBeDefined()
    })

    it('should handle loading state', () => {
      mockElectionsReads.getElection.isLoading.value = true
      mockElectionsReads.getElection.isSuccess.value = false

      const result = useElectionsGetElection(MOCK_DATA.electionId)

      expect(result.isLoading.value).toBe(true)
      expect(result.isSuccess.value).toBe(false)
    })
  })

  describe('useElectionsGetVoteCount', () => {
    it('should return vote count mock', () => {
      mockElectionsReads.getVoteCount.data.value = 42n

      const result = useElectionsGetVoteCount(MOCK_DATA.electionId)

      expect(result).toBe(mockElectionsReads.getVoteCount)
      expect(result.data.value).toBe(42n)
    })

    it('should handle zero votes', () => {
      mockElectionsReads.getVoteCount.data.value = 0n

      const result = useElectionsGetVoteCount(MOCK_DATA.electionId)

      expect(result.data.value).toBe(0n)
    })

    it('should handle large vote counts', () => {
      mockElectionsReads.getVoteCount.data.value = 1000000n

      const result = useElectionsGetVoteCount(MOCK_DATA.electionId)

      expect(result.data.value).toBe(1000000n)
    })
  })

  describe('useElectionsGetCandidates', () => {
    it('should return candidates list mock', () => {
      const candidates = [MOCK_DATA.candidateAddress]
      mockElectionsReads.getCandidates.data.value = candidates

      const result = useElectionsGetCandidates(MOCK_DATA.electionId)

      expect(result).toBe(mockElectionsReads.getCandidates)
      expect(result.data.value).toEqual(candidates)
    })

    it('should handle empty candidates', () => {
      mockElectionsReads.getCandidates.data.value = []

      const result = useElectionsGetCandidates(MOCK_DATA.electionId)

      expect(result.data.value).toEqual([])
    })

    it('should handle multiple candidates', () => {
      const candidates = [
        MOCK_DATA.candidateAddress,
        '0x0000000000000000000000000000000000000001' as Address,
        '0x0000000000000000000000000000000000000002' as Address
      ]
      mockElectionsReads.getCandidates.data.value = candidates

      const result = useElectionsGetCandidates(MOCK_DATA.electionId)

      expect(result.data.value).toHaveLength(3)
    })
  })

  describe('useElectionsGetEligibleVoters', () => {
    it('should return eligible voters mock', () => {
      const voters = [MOCK_DATA.voterAddress]
      mockElectionsReads.getEligibleVoters.data.value = voters

      const result = useElectionsGetEligibleVoters(MOCK_DATA.electionId)

      expect(result).toBe(mockElectionsReads.getEligibleVoters)
      expect(result.data.value).toEqual(voters)
    })

    it('should handle no eligible voters', () => {
      mockElectionsReads.getEligibleVoters.data.value = []

      const result = useElectionsGetEligibleVoters(MOCK_DATA.electionId)

      expect(result.data.value).toEqual([])
    })
  })

  describe('useElectionsGetWinners', () => {
    it('should return winners list mock', () => {
      const winners = [MOCK_DATA.candidateAddress]
      mockElectionsReads.getWinners.data.value = winners

      const result = useElectionsGetWinners(MOCK_DATA.electionId)

      expect(result).toBe(mockElectionsReads.getWinners)
      expect(result.data.value).toEqual(winners)
    })

    it('should handle no winners', () => {
      mockElectionsReads.getWinners.data.value = []

      const result = useElectionsGetWinners(MOCK_DATA.electionId)

      expect(result.data.value).toEqual([])
    })

    it('should handle multiple winners', () => {
      const winners = [
        MOCK_DATA.candidateAddress,
        '0x0000000000000000000000000000000000000003' as Address
      ]
      mockElectionsReads.getWinners.data.value = winners

      const result = useElectionsGetWinners(MOCK_DATA.electionId)

      expect(result.data.value).toHaveLength(2)
    })
  })

  describe('useElectionsHasVoted', () => {
    it('should return hasVoted status mock - not voted', () => {
      mockElectionsReads.hasVoted.data.value = false

      const result = useElectionsHasVoted(MOCK_DATA.electionId, MOCK_DATA.voterAddress)

      expect(result).toBe(mockElectionsReads.hasVoted)
      expect(result.data.value).toBe(false)
    })

    it('should show voter has voted', () => {
      mockElectionsReads.hasVoted.data.value = true

      const result = useElectionsHasVoted(MOCK_DATA.electionId, MOCK_DATA.voterAddress)

      expect(result.data.value).toBe(true)
    })
  })

  describe('Mock Behavior', () => {
    it('should have consistent interface for all read functions', () => {
      const owner = useElectionsOwner()
      const election = useElectionsGetElection(MOCK_DATA.electionId)
      const voteCount = useElectionsGetVoteCount(MOCK_DATA.electionId)
      const hasVoted = useElectionsHasVoted(MOCK_DATA.electionId, MOCK_DATA.voterAddress)

      expect(owner).toHaveProperty('data')
      expect(owner).toHaveProperty('isLoading')
      expect(owner).toHaveProperty('isSuccess')
      expect(owner).toHaveProperty('isError')
      expect(owner).toHaveProperty('refetch')

      expect(election).toHaveProperty('data')
      expect(voteCount).toHaveProperty('data')
      expect(hasVoted).toHaveProperty('data')
    })

    it('should reset mocks properly', () => {
      mockElectionsReads.owner.isError.value = true
      mockElectionsReads.getVoteCount.data.value = 999n

      resetContractMocks()

      expect(mockElectionsReads.owner.isError.value).toBe(false)
      expect(mockElectionsReads.owner.isSuccess.value).toBe(true)
    })

    it('should support mock customization for different scenarios', () => {
      // Scenario 1: Successful read
      mockElectionsReads.owner.data.value = MOCK_DATA.ownerAddress
      const result1 = useElectionsOwner()
      expect(result1.data.value).toBe(MOCK_DATA.ownerAddress)

      // Scenario 2: Error state
      resetContractMocks()
      mockElectionsReads.owner.isError.value = true
      mockElectionsReads.owner.isSuccess.value = false
      const result2 = useElectionsOwner()
      expect(result2.isError.value).toBe(true)
      expect(result2.isSuccess.value).toBe(false)
    })
  })
})

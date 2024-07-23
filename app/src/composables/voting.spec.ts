import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  useAddProposal,
  useGetProposals,
  useConcludeProposal,
  useVoteDirective,
  useVoteElection
} from '@/composables/voting'
import { VotingService } from '@/services/votingService'
import type { Proposal } from '@/types'

// Mock data for testing
const mockTransaction = { hash: '0x123' } // Declare mockTransaction at the top to avoid hoisting issues

const mockProposal: Partial<Proposal> = {
  id: 1,
  title: 'Test Proposal',
  description: 'This is a test proposal.',
  draftedBy: 'User1',
  isElection: false,
  votes: {
    yes: 0,
    no: 0,
    abstain: 0
  },
  isActive: true,
  voters: [{ isVoted: false, isEligible: true }]
}

// Mock the VotingService class
vi.mock('@/services/votingService', () => ({
  VotingService: vi.fn().mockImplementation(() => ({
    addProposal: vi.fn().mockResolvedValue(mockTransaction),
    getProposals: vi.fn().mockResolvedValue([mockProposal]),
    concludeProposal: vi.fn().mockResolvedValue(mockTransaction),
    voteDirective: vi.fn().mockResolvedValue(mockTransaction),
    voteElection: vi.fn().mockResolvedValue(mockTransaction)
  }))
}))

describe('Voting Composables', () => {
  let votingService: VotingService

  beforeEach(() => {
    // Clear mocks and reinitialize votingService before each test
    vi.clearAllMocks()
    votingService = new VotingService()
  })

  describe('useAddProposal', () => {
    it('should add a proposal successfully', async () => {
      const { execute, isLoading, isSuccess, error, transaction } = useAddProposal()

      // Call the composable's execute function
      await execute(mockProposal)

      // Assertions
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
      expect(transaction.value).toEqual(mockTransaction)

      // Verify that the service method was called correctly
      expect(votingService.addProposal).toHaveBeenCalledOnce()
      expect(votingService.addProposal).toHaveBeenCalledWith(mockProposal)
    })

    it('should handle errors when adding a proposal', async () => {
      const errorMessage = 'Failed to add proposal'
      // Mock the rejection of addProposal for testing error handling
      vi.spyOn(votingService, 'addProposal').mockRejectedValueOnce(new Error(errorMessage))

      const { execute, isLoading, isSuccess, error, transaction } = useAddProposal()

      await execute(mockProposal)

      // Assertions
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value.message).toBe(errorMessage)
      expect(transaction.value).toBe(null)
    })
  })

  describe('useGetProposals', () => {
    it('should fetch proposals successfully', async () => {
      const { execute, isLoading, isSuccess, error, data } = useGetProposals()

      await execute(1)

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
      expect(data.value).toEqual([mockProposal])

      expect(votingService.getProposals).toHaveBeenCalledOnce()
      expect(votingService.getProposals).toHaveBeenCalledWith(1)
    })

    it('should handle errors when fetching proposals', async () => {
      const errorMessage = 'Failed to fetch proposals'
      vi.spyOn(votingService, 'getProposals').mockRejectedValueOnce(new Error(errorMessage))

      const { execute, isLoading, isSuccess, error, data } = useGetProposals()

      await execute(1)

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value.message).toBe(errorMessage)
      expect(data.value).toEqual([])
    })
  })

  describe('useConcludeProposal', () => {
    it('should conclude a proposal successfully', async () => {
      const { execute, isLoading, isSuccess, error, transaction } = useConcludeProposal()

      await execute(1, 0)

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
      expect(transaction.value).toEqual(mockTransaction)

      expect(votingService.concludeProposal).toHaveBeenCalledOnce()
      expect(votingService.concludeProposal).toHaveBeenCalledWith(1, 0)
    })

    it('should handle errors when concluding a proposal', async () => {
      const errorMessage = 'Failed to conclude proposal'
      vi.spyOn(votingService, 'concludeProposal').mockRejectedValueOnce(new Error(errorMessage))

      const { execute, isLoading, isSuccess, error, transaction } = useConcludeProposal()

      await execute(1, 0)

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value.message).toBe(errorMessage)
      expect(transaction.value).toBe(null)
    })
  })

  describe('useVoteDirective', () => {
    it('should vote on a directive successfully', async () => {
      const { execute, isLoading, isSuccess, error, transaction } = useVoteDirective()

      await execute(1, 0, 1)

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
      expect(transaction.value).toEqual(mockTransaction)

      expect(votingService.voteDirective).toHaveBeenCalledOnce()
      expect(votingService.voteDirective).toHaveBeenCalledWith(1, 0, 1)
    })

    it('should handle errors when voting on a directive', async () => {
      const errorMessage = 'Failed to vote on directive'
      vi.spyOn(votingService, 'voteDirective').mockRejectedValueOnce(new Error(errorMessage))

      const { execute, isLoading, isSuccess, error, transaction } = useVoteDirective()

      await execute(1, 0, 1)

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value.message).toBe(errorMessage)
      expect(transaction.value).toBe(null)
    })
  })

  describe('useVoteElection', () => {
    it('should vote in an election successfully', async () => {
      const { execute, isLoading, isSuccess, error, transaction } = useVoteElection()

      await execute(1, 0, '0xCandidateAddress')

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
      expect(transaction.value).toEqual(mockTransaction)

      expect(votingService.voteElection).toHaveBeenCalledOnce()
      expect(votingService.voteElection).toHaveBeenCalledWith(1, 0, '0xCandidateAddress')
    })

    it('should handle errors when voting in an election', async () => {
      const errorMessage = 'Failed to vote in election'
      vi.spyOn(votingService, 'voteElection').mockRejectedValueOnce(new Error(errorMessage))

      const { execute, isLoading, isSuccess, error, transaction } = useVoteElection()

      await execute(1, 0, '0xCandidateAddress')

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value.message).toBe(errorMessage)
      expect(transaction.value).toBe(null)
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
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
// const mockTransaction = { hash: '0x123' } // Declare mockTransaction at the top to avoid hoisting issues
const mockTransaction = { hash: '0x123' }
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
  voters: [{ isVoted: false, isEligible: true, memberAddress: '0x123', name: 'User1' }]
}
// Mock the VotingService class
vi.mock('@/services/votingService', () => {
  const mockTransaction = { hash: '0x123' }
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
    voters: [{ isVoted: false, isEligible: true, memberAddress: '0x123', name: 'User1' }]
  }
  return {
    VotingService: vi.fn().mockImplementation(() => ({
      addProposal: vi.fn().mockResolvedValue(mockTransaction),
      getProposals: vi.fn().mockResolvedValue([mockProposal]),
      concludeProposal: vi.fn().mockResolvedValue(mockTransaction),
      voteDirective: vi.fn().mockResolvedValue(mockTransaction),
      voteElection: vi.fn().mockResolvedValue(mockTransaction)
    }))
  }
})

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
    })
  })
})

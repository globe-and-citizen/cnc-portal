import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useAddProposal,
  useGetProposals,
  useConcludeProposal,
  useVoteDirective,
  useVoteElection
} from '@/composables/voting'
// import { VotingService } from '@/services/votingService'
import type { Proposal } from '@/types'

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
const mockElectionProposal: Partial<Proposal> = {
  id: 2,
  title: 'Election Proposal',
  description: 'This is an election proposal.',
  draftedBy: 'User2',
  isElection: true,
  votes: {
    yes: 0,
    no: 0,
    abstain: 0
  },
  isActive: true,
  voters: [{ isVoted: false, isEligible: true, memberAddress: '0x456', name: 'User2' }],
  candidates: [
    { name: 'Candidate A', votes: 0, candidateAddress: '0x123' },
    { name: 'Candidate B', votes: 0, candidateAddress: '0x456' }
  ]
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
  beforeEach(() => {
    // Clear mocks and reinitialize votingService before each test
    vi.clearAllMocks()
  })

  describe('useAddProposal', () => {
    it('should add a directive proposal successfully', async () => {
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
  it('should initialize candidate votes to zero if proposal is an election', async () => {
    const { execute, isLoading, isSuccess, error, transaction } = useAddProposal()

    // Call the composable's execute function with an election proposal
    await execute(mockElectionProposal)

    // Assertions
    expect(isLoading.value).toBe(false)
    expect(isSuccess.value).toBe(true)
    expect(error.value).toBe(null)
    expect(transaction.value).toEqual(mockTransaction)

    // Verify that candidate votes are initialized to zero
    console.log(mockElectionProposal)
    expect(mockElectionProposal.candidates?.every((candidate) => candidate.votes === 0)).toBe(true)
  })
  describe('useGetProposals', () => {
    it('should fetch proposals successfully', async () => {
      const { execute, isLoading, isSuccess, error, data } = useGetProposals()

      await execute()

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

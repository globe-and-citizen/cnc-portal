import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VotingService } from '@/services/votingService'
import { type IWeb3Library, EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { Contract } from 'ethers'
import type { Proposal } from '@/types'

// Mock proposal data
const mockProposal: Partial<Proposal> = {
  id: 0,
  title: 'Test Proposal',
  description: 'Test description',
  draftedBy: 'User1',
  isElection: false,
  votes: {
    yes: 10,
    no: 5,
    abstain: 3
  }
}

// Mock the EthersJsAdapter
vi.mock('@/adapters/web3LibraryAdapter', () => ({
  EthersJsAdapter: {
    getInstance: vi.fn()
  }
}))

// Mock SmartContract
vi.mock('@/services/contractService', () => ({
  SmartContract: vi.fn()
}))

// Define the test suite
describe('VotingService', () => {
  let votingService: VotingService
  let mockContract: {
    addProposal: ReturnType<typeof vi.fn>
    getProposals: ReturnType<typeof vi.fn>
    concludeProposal: ReturnType<typeof vi.fn>
    voteDirective: ReturnType<typeof vi.fn>
    voteElection: ReturnType<typeof vi.fn>
  }

  // Create a mock contract instance
  beforeEach(() => {
    mockContract = {
      addProposal: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(true) }),
      getProposals: vi.fn().mockResolvedValue([mockProposal]),
      concludeProposal: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(true) }),
      voteDirective: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(true) }),
      voteElection: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(true) })
    }

    // Mock the `getContract` method to return the mock contract instance
    const ethersJsAdapterMock = {
      getContract: vi.fn().mockResolvedValue(mockContract as unknown as Contract)
    }

    // Override the getInstance method to return the mocked adapter
    ;(EthersJsAdapter.getInstance as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      ethersJsAdapterMock
    )

    // Initialize the voting service with the mocked library
    votingService = new VotingService(ethersJsAdapterMock as unknown as IWeb3Library)
  })

  describe('addProposal', () => {
    it('should add a proposal and return transaction', async () => {
      const tx = await votingService.addProposal('0x1234', mockProposal)

      expect(tx).toBeDefined()
      expect(mockContract.addProposal).toHaveBeenCalledOnce()
      expect(mockContract.addProposal).toHaveBeenCalledWith(mockProposal)
      expect(mockContract.addProposal).toHaveReturnedWith(expect.any(Promise))
    })

    it('should handle errors when adding a proposal', async () => {
      mockContract.addProposal.mockRejectedValueOnce(new Error('Add Proposal Failed'))

      await expect(votingService.addProposal('0x1234', mockProposal)).rejects.toThrow(
        'Add Proposal Failed'
      )

      expect(mockContract.addProposal).toHaveBeenCalledOnce()
    })
  })

  describe('getProposals', () => {
    it('should fetch proposals and return them', async () => {
      const proposals = await votingService.getProposals('0x1234')

      expect(proposals).toBeDefined()
      expect(proposals.length).toBeGreaterThan(0)
      expect(proposals).toEqual([mockProposal])
      expect(mockContract.getProposals).toHaveBeenCalledOnce()
      expect(mockContract.getProposals).toHaveBeenCalledWith(1)
    })

    it('should handle empty proposals correctly', async () => {
      mockContract.getProposals.mockResolvedValueOnce('0x')

      const proposals = await votingService.getProposals('0x1234')

      expect(proposals).toEqual([])
      expect(mockContract.getProposals).toHaveBeenCalledOnce()
    })

    it('should handle errors when fetching proposals', async () => {
      mockContract.getProposals.mockRejectedValueOnce(new Error('Get Proposals Failed'))

      await expect(votingService.getProposals('0x1234')).rejects.toThrow('Get Proposals Failed')

      expect(mockContract.getProposals).toHaveBeenCalledOnce()
    })
  })

  describe('concludeProposal', () => {
    it('should conclude a proposal and return transaction', async () => {
      const tx = await votingService.concludeProposal('0x1232', 0)

      expect(tx).toBeDefined()
      expect(mockContract.concludeProposal).toHaveBeenCalledOnce()
      expect(mockContract.concludeProposal).toHaveBeenCalledWith(1, 0)
    })

    it('should handle errors when concluding a proposal', async () => {
      mockContract.concludeProposal.mockRejectedValueOnce(new Error('Conclude Proposal Failed'))

      await expect(votingService.concludeProposal('0x1221', 0)).rejects.toThrow(
        'Conclude Proposal Failed'
      )

      expect(mockContract.concludeProposal).toHaveBeenCalledOnce()
    })
  })

  describe('voteDirective', () => {
    it('should vote on a directive and return transaction', async () => {
      const tx = await votingService.voteDirective('0x123', 0, 1)

      expect(tx).toBeDefined()
      expect(mockContract.voteDirective).toHaveBeenCalledOnce()
      expect(mockContract.voteDirective).toHaveBeenCalledWith(1, 0, 1)
    })

    it('should handle errors when voting on a directive', async () => {
      mockContract.voteDirective.mockRejectedValueOnce(new Error('Vote Directive Failed'))

      await expect(votingService.voteDirective('0x1232', 0, 1)).rejects.toThrow(
        'Vote Directive Failed'
      )

      expect(mockContract.voteDirective).toHaveBeenCalledOnce()
    })
  })

  describe('voteElection', () => {
    it('should vote in an election and return transaction', async () => {
      const tx = await votingService.voteElection('0x123', 0, '0x1234')

      expect(tx).toBeDefined()
      expect(mockContract.voteElection).toHaveBeenCalledOnce()
      expect(mockContract.voteElection).toHaveBeenCalledWith(1, 0, '0x1234')
    })

    it('should handle errors when voting in an election', async () => {
      mockContract.voteElection.mockRejectedValueOnce(new Error('Vote Election Failed'))

      await expect(votingService.voteElection('0x1234', 0, '0x1234')).rejects.toThrow(
        'Vote Election Failed'
      )

      expect(mockContract.voteElection).toHaveBeenCalledOnce()
    })
  })
})

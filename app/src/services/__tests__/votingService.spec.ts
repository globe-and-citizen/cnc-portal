import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VotingService } from '@/services/votingService'
import { type IWeb3Library, EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { Contract } from 'ethers'
import type { Proposal } from '@/types'

// Mock proposal data
const tx = {
  txHash: '0x123',
  wait: vi.fn()
}
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
const mockContract: {
  addProposal: ReturnType<typeof vi.fn>
  getProposals: ReturnType<typeof vi.fn>
  concludeProposal: ReturnType<typeof vi.fn>
  voteDirective: ReturnType<typeof vi.fn>
  voteElection: ReturnType<typeof vi.fn>
  proposalCount: ReturnType<typeof vi.fn>
  proposalsById: ReturnType<typeof vi.fn>
  getProposalById: ReturnType<typeof vi.fn>
  setBoardOfDirectorsContractAddress: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  unpause: ReturnType<typeof vi.fn>
  transferOwnership: ReturnType<typeof vi.fn>
  owner: ReturnType<typeof vi.fn>
  paused: ReturnType<typeof vi.fn>
  isPaused: ReturnType<typeof vi.fn>
  getOwner: ReturnType<typeof vi.fn>
} = {
  addProposal: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(true) }),
  getProposals: vi.fn().mockResolvedValue([mockProposal]),
  concludeProposal: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(true) }),
  voteDirective: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(true) }),
  voteElection: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(true) }),
  proposalCount: vi.fn().mockResolvedValue(1),
  proposalsById: vi.fn().mockResolvedValue(mockProposal),
  getProposalById: vi.fn().mockResolvedValue(mockProposal),
  setBoardOfDirectorsContractAddress: vi
    .fn()
    .mockResolvedValue({ wait: vi.fn().mockResolvedValue(true) }),
  pause: vi.fn().mockResolvedValue(tx),
  unpause: vi.fn().mockResolvedValue(tx),
  transferOwnership: vi.fn().mockResolvedValue(tx),
  owner: vi.fn().mockResolvedValue(tx),
  paused: vi.fn().mockResolvedValue(false),
  isPaused: vi.fn().mockResolvedValue(true),
  getOwner: vi.fn().mockReturnValue('0xOwnerAddress')
}
// Mock SmartContract
const contractService = {
  getContract: vi.fn().mockReturnValue(mockContract)
}
vi.mock('@/services/contractService', () => {
  return {
    SmartContract: vi.fn().mockImplementation(() => contractService)
  }
})

// Define the test suite
describe('VotingService', () => {
  let votingService: VotingService

  // Create a mock contract instance
  beforeEach(() => {
    // Mock the `getContract` method to return the mock contract instance
    const ethersJsAdapterMock = {
      getContract: vi.fn().mockResolvedValue(mockContract as unknown as Contract),
      getFactoryContract: vi.fn().mockResolvedValue({
        deploy: vi.fn().mockResolvedValue({
          waitForDeployment: vi.fn().mockResolvedValue({
            getAddress: vi.fn().mockResolvedValue('0xDeployedAddress')
          })
        })
      })
    }

    // Override the getInstance method to return the mocked adapter
    ;(EthersJsAdapter.getInstance as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      ethersJsAdapterMock
    )

    // Initialize the voting service with the mocked library
    votingService = new VotingService(ethersJsAdapterMock as unknown as IWeb3Library)
  })
  describe('getContract', () => {
    it('should return the contract instance', async () => {
      const contract = await votingService.getContract('0xVotingAddress')
      expect(contract).toBeDefined()
    })
  })

  describe('deployVotingContract', () => {
    it('should handle errors when deploying the voting contract', async () => {
      const ethersJsAdapterMock = {
        getFactoryContract: vi.fn().mockRejectedValue(new Error('Deploy Failed'))
      }

      votingService = new VotingService(ethersJsAdapterMock as unknown as IWeb3Library)

      await expect(votingService.deployVotingContract()).rejects.toThrow('Deploy Failed')
    })
  })

  describe('setBoardOfDirectorsContractAddress', () => {
    it('should set the Board of Directors contract address', async () => {
      await votingService.setBoardOfDirectorsContractAddress('0xVotingAddress', '0xBoDAddress')

      expect(mockContract.setBoardOfDirectorsContractAddress).toHaveBeenCalledOnce()
      expect(mockContract.setBoardOfDirectorsContractAddress).toHaveBeenCalledWith('0xBoDAddress')
    })

    it('should handle errors when setting the BoD contract address', async () => {
      mockContract.setBoardOfDirectorsContractAddress.mockRejectedValueOnce(
        new Error('Set BoD Address Failed')
      )

      await expect(
        votingService.setBoardOfDirectorsContractAddress('0xVotingAddress', '0xBoDAddress')
      ).rejects.toThrow('Set BoD Address Failed')
    })
  })
  describe('addProposal', () => {
    it('should add a proposal and return transaction', async () => {
      const tx = await votingService.addProposal('0x1234', mockProposal)

      expect(tx).toBeDefined()
      expect(mockContract.addProposal).toHaveBeenCalledOnce()
      expect(mockContract.addProposal).toHaveReturnedWith(expect.any(Promise))
    })

    it('should handle errors when adding a proposal', async () => {
      mockContract.addProposal.mockRejectedValueOnce(new Error('Add Proposal Failed'))

      await expect(votingService.addProposal('0x1234', mockProposal)).rejects.toThrow(
        'Add Proposal Failed'
      )

      expect(mockContract.addProposal).toHaveBeenCalled()
    })
  })

  describe('getProposals', () => {
    it('should fetch proposals and return them', async () => {
      const proposals = await votingService.getProposals('0x1234')

      expect(proposals).toBeDefined()
      expect(proposals.length).toBeGreaterThan(0)
      expect(proposals).toEqual([mockProposal])
    })
  })

  describe('concludeProposal', () => {
    it('should conclude a proposal and return transaction', async () => {
      const tx = await votingService.concludeProposal('0x1232', 0)

      expect(tx).toBeDefined()
      expect(mockContract.concludeProposal).toHaveBeenCalledOnce()
      expect(mockContract.concludeProposal).toHaveBeenCalledWith(0)
    })

    it('should handle errors when concluding a proposal', async () => {
      mockContract.concludeProposal.mockRejectedValueOnce(new Error('Conclude Proposal Failed'))

      await expect(votingService.concludeProposal('0x1221', 0)).rejects.toThrow(
        'Conclude Proposal Failed'
      )

      expect(mockContract.concludeProposal).toHaveBeenCalled()
    })
  })

  describe('voteDirective', () => {
    it('should vote on a directive and return transaction', async () => {
      const tx = await votingService.voteDirective('0x123', 0, 1)

      expect(tx).toBeDefined()
      expect(mockContract.voteDirective).toHaveBeenCalledOnce()
      expect(mockContract.voteDirective).toHaveBeenCalledWith(0, 1)
    })

    it('should handle errors when voting on a directive', async () => {
      mockContract.voteDirective.mockRejectedValueOnce(new Error('Vote Directive Failed'))

      await expect(votingService.voteDirective('0x1232', 0, 1)).rejects.toThrow(
        'Vote Directive Failed'
      )

      expect(mockContract.voteDirective).toHaveBeenCalled()
    })
  })

  describe('voteElection', () => {
    it('should vote in an election and return transaction', async () => {
      const tx = await votingService.voteElection('0x123', 0, '0x1234')

      expect(tx).toBeDefined()
      expect(mockContract.voteElection).toHaveBeenCalledOnce()
      expect(mockContract.voteElection).toHaveBeenCalledWith(0, '0x1234')
    })

    it('should handle errors when voting in an election', async () => {
      mockContract.voteElection.mockRejectedValueOnce(new Error('Vote Election Failed'))

      await expect(votingService.voteElection('0x1234', 0, '0x1234')).rejects.toThrow(
        'Vote Election Failed'
      )

      expect(mockContract.voteElection).toHaveBeenCalled()
    })
  })
  describe('pause', () => {
    it('should pause the contract and return transaction', async () => {
      const tx = await votingService.pause('0x123')

      expect(tx).toBeDefined()
      expect(mockContract.pause).toHaveBeenCalledOnce()
    })
  })
  describe('unpause', () => {
    it('should unpause the contract and return transaction', async () => {
      const tx = await votingService.unpause('0x123')

      expect(tx).toBeDefined()
      expect(mockContract.unpause).toHaveBeenCalledOnce()
    })
  })
  describe('transferOwnership', () => {
    it('should transfer ownership and return transaction', async () => {
      console.log(votingService)
      const tx = await votingService.transferOwnership('0x123', '0xNewOwner')

      expect(tx).toBeDefined()
      expect(mockContract.transferOwnership).toHaveBeenCalledOnce()
      expect(mockContract.transferOwnership).toHaveBeenCalledWith('0xNewOwner')
    })
  })
  describe('isPaused', () => {
    it('should return the paused status of the contract', async () => {
      const paused = await votingService.isPaused('0x123')

      expect(paused).toBeDefined()
      expect(paused).toBe(false)
    })
  })
  describe('getOwner', () => {
    it('should return the owner of the contract', async () => {
      const result = await votingService.getOwner('0x123')
      expect(result).toBeDefined()
      expect(result).toMatchObject(tx)
    })
  })
})

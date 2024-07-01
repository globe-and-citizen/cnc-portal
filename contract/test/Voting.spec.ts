import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Voting } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'

describe('Voting Contract', () => {
  let votingProxy: Voting

  async function deployContracts(owner: SignerWithAddress) {
    const VotingImplementation = await ethers.getContractFactory('Voting')
    votingProxy = (await upgrades.deployProxy(VotingImplementation, [], {
      initializer: 'initialize',
      initialOwner: await owner.getAddress()
    })) as unknown as Voting
  }

  let owner: SignerWithAddress
  let member1: SignerWithAddress
  let member2: SignerWithAddress
  const candidates = [
    {
      name: 'Candidate 1',
      candidateAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      votes: 0
    },
    {
      name: 'Candidate 2',
      candidateAddress: '0x92d402Df9C107a5d539Fd8A430AaC9e2d93C0221',
      votes: 0
    }
  ]
  context('Deploying Voting Contract', () => {
    before(async () => {
      ;[owner, member1, member2] = await ethers.getSigners()
      await deployContracts(owner)
    })
    describe('Initialization', () => {
      it('should initialize with owner as the contract owner', async () => {
        expect(await votingProxy.owner()).to.equal(await owner.getAddress())
      })
      it('should have zero proposals initially', async () => {
        const proposals = await votingProxy.getProposals()
        expect(proposals).to.have.lengthOf(0)
      })
    })
    describe('CRUD Members and Proposals', async () => {
      it('should add a proposal successfully', async () => {
        const proposal = {
          title: 'Proposal 1',
          description: 'Description of Proposal 1',
          draftedBy: await owner.getAddress(),
          isElection: false,
          votes: { yes: 0, no: 0, abstain: 0 },
          candidates,
          isActive: true,
          voters: [
            {
              name: 'Member 1',
              memberAddress: await member1.getAddress(),
              isVoted: false,
              isEligible: true
            },
            {
              name: 'Member 2',
              memberAddress: await member2.getAddress(),
              isVoted: false,
              isEligible: true
            }
          ]
        }

        await expect(votingProxy.addProposal(proposal))
          .to.emit(votingProxy, 'ProposalAdded')
          .withArgs(0, proposal.title, proposal.description)
        await votingProxy.addProposal(proposal)
      })
      it('should return the proposal details', async () => {
        const proposals = await votingProxy.getProposals()
        expect(proposals).to.have.lengthOf(2)
      })
      it('should conclude a proposal successfully', async () => {
        await expect(votingProxy.concludeProposal(1))
          .to.emit(votingProxy, 'ProposalConcluded')
          .withArgs(1, anyValue)
      })
    })
    describe('Voting actions', () => {
      it('should vote on a proposal successfully', async () => {
        const votingProxyAsMember1 = votingProxy.connect(member1)

        await expect(await votingProxyAsMember1.voteProposal(0, 0))
          .to.emit(votingProxy, 'Voted')
          .withArgs(await member1.getAddress(), 0, 0)
      })
      it('should not allow a member to vote twice on a proposal', async () => {
        const votingProxyAsMember1 = votingProxy.connect(member1)
        await expect(votingProxyAsMember1.voteProposal(0, 0)).to.be.revertedWith(
          'You have already voted'
        )
      })
      it('should vote on an election successfully', async () => {
        const votingProxyAsMember2 = votingProxy.connect(member2)

        await expect(await votingProxyAsMember2.voteElection(0, candidates[1].candidateAddress))
          .to.emit(votingProxy, 'ElectionVoted')
          .withArgs(await member2.getAddress(), 0, candidates[1].candidateAddress)
      })
    })

    describe('Pausing and Unpausing the Contract', () => {
      it('should pause the contract', async () => {
        await votingProxy.pause()

        expect(await votingProxy.paused()).to.be.true
      })

      it('should unpause the contract', async () => {
        await votingProxy.unpause()

        expect(await votingProxy.paused()).to.be.false
      })
    })
  })
})

import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Voting } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('Voting Contract', () => {
  let voting: Voting
  let owner: SignerWithAddress
  let member1: SignerWithAddress
  let member2: SignerWithAddress
  let member3: SignerWithAddress
  let member4: SignerWithAddress
  let member5: SignerWithAddress
  let notMember: SignerWithAddress

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

  async function deployContracts() {
    const VotingFactory = await ethers.getContractFactory('Voting')
    voting = (await VotingFactory.deploy()) as Voting
    await voting.waitForDeployment()
  }

  context('Deploying Voting Contract', () => {
    before(async () => {
      ;[owner, member1, member2, notMember, member3, member4, member5] = await ethers.getSigners()
      await deployContracts()
    })

    describe('CRUD Members and Proposals', async () => {
      it('should add a proposal successfully', async () => {
        const proposal = {
          id: 0,
          title: 'Proposal 1',
          description: 'Description of Proposal 1',
          draftedBy: await owner.getAddress(),
          isElection: false,
          votes: { yes: 0, no: 0, abstain: 0 },
          candidates,
          isActive: true,
          teamId: 1,
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
            },
            {
              name: 'Member 3',
              memberAddress: await member3.getAddress(),
              isVoted: false,
              isEligible: true
            },
            {
              name: 'Member 4',
              memberAddress: await member4.getAddress(),
              isVoted: false,
              isEligible: true
            },
            {
              name: 'Member 5',
              memberAddress: await member5.getAddress(),
              isVoted: false,
              isEligible: true
            }
          ]
        }

        await expect(voting.addProposal(proposal))
          .to.emit(voting, 'ProposalAdded')
          .withArgs(0, proposal.title, proposal.description)
      })

      it('should return the proposal details', async () => {
        const proposals = await voting.getProposals(1)
        expect(proposals).to.have.lengthOf(1)
        expect(proposals[0].title).to.equal('Proposal 1')
      })
    })

    describe('Voting actions', () => {
      it('should vote "yes" on a proposal successfully', async () => {
        const votingAsMember3 = voting.connect(member3)

        await expect(await votingAsMember3.voteDirective(1, 0, 1))
          .to.emit(voting, 'DirectiveVoted')
          .withArgs(await member3.getAddress(), 0, 1)

        const proposals = await voting.getProposals(1)
        expect(proposals[0].votes.yes).to.equal(1)
      })

      it('should vote "no" on a proposal successfully', async () => {
        const votingAsMember4 = voting.connect(member4)

        await expect(await votingAsMember4.voteDirective(1, 0, 0))
          .to.emit(voting, 'DirectiveVoted')
          .withArgs(await member4.getAddress(), 0, 0)

        const proposals = await voting.getProposals(1)
        expect(proposals[0].votes.no).to.equal(1)
      })

      it('should vote "abstain" on a proposal successfully', async () => {
        const votingAsMember5 = voting.connect(member5)

        await expect(await votingAsMember5.voteDirective(1, 0, 2))
          .to.emit(voting, 'DirectiveVoted')
          .withArgs(await member5.getAddress(), 0, 2)

        const proposals = await voting.getProposals(1)
        expect(proposals[0].votes.abstain).to.equal(1)
      })
      it('should not allow a random member to vote on a proposal', async () => {
        const votingAsRandomMember = voting.connect(notMember)
        await expect(votingAsRandomMember.voteDirective(1, 0, 1)).to.be.revertedWith(
          'You are not registered to vote in this proposal'
        )
      })

      it('should not allow a member to vote twice on a proposal', async () => {
        const votingAsMember3 = voting.connect(member3)
        await expect(votingAsMember3.voteDirective(1, 0, 1)).to.be.revertedWith(
          'You have already voted'
        )
      })

      it('should vote on an election successfully', async () => {
        const votingAsMember2 = voting.connect(member2)

        await expect(await votingAsMember2.voteElection(1, 0, candidates[1].candidateAddress))
          .to.emit(voting, 'ElectionVoted')
          .withArgs(await member2.getAddress(), 0, candidates[1].candidateAddress)

        const proposals = await voting.getProposals(1)
        const candidate = proposals[0].candidates.find(
          (c) => c.candidateAddress === candidates[1].candidateAddress
        )
        if (candidate) {
          expect(candidate.votes).to.equal(1)
        }
      })
      it('should revert with proposal does not exist ', async () => {
        await expect(voting.voteDirective(1, 37, 1)).to.be.revertedWith('Proposal does not exist')
      })

      it('should conclude a proposal successfully', async () => {
        await expect(voting.concludeProposal(1, 0))
          .to.emit(voting, 'ProposalConcluded')
          .withArgs(0, false)

        const proposals = await voting.getProposals(1)
        expect(proposals[0].isActive).to.be.false
      })
    })
  })
})

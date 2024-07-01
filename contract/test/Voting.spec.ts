import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Voting } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('Voting Contract', () => {
  let votingProxy: Voting
  const memberInputs = [
    {
      memberAddress: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E',
      name: 'Member 1',
      teamId: 1
    },
    {
      memberAddress: '0xc542BdA5EC1aC9b86fF470c04062D6a181e67928',
      name: 'Member 2',
      teamId: 1
    }
  ]

  async function deployContracts(owner: SignerWithAddress) {
    const VotingImplementation = await ethers.getContractFactory('Voting')
    votingProxy = (await upgrades.deployProxy(VotingImplementation, [memberInputs], {
      initializer: 'initialize',
      initialOwner: await owner.getAddress()
    })) as unknown as Voting
  }

  describe('As An Owner', () => {
    let owner: SignerWithAddress
    let member1: SignerWithAddress
    let member2: SignerWithAddress

    context('Deploying Voting Contract', () => {
      before(async () => {
        ;[owner, member1, member2] = await ethers.getSigners()
        await deployContracts(owner)
      })
      describe('Initialization', () => {
        it('should initialize with owner as the contract owner', async () => {
          expect(await votingProxy.owner()).to.equal(await owner.getAddress())
        })

        it('should initialize with two members', async () => {
          const members = await votingProxy.getElectoralRoll()
          expect(members.length).equal(2)
        })
      })
      describe('CRUD Members and Proposals', () => {
        it('should add and retrieve electoral roll successfully', async () => {
          const memberInputs = [
            { memberAddress: await member1.getAddress(), name: 'Member 3', teamId: 1 },
            { memberAddress: await member2.getAddress(), name: 'Member 4', teamId: 1 }
          ]

          await votingProxy.addMembers(memberInputs)

          const members = await votingProxy.getElectoralRoll()
          expect(members).to.have.lengthOf(4)
          expect(members[0].name).to.equal('Member 1')
          expect(members[1].name).to.equal('Member 2')
        })

        it('should add a proposal successfully', async () => {
          const proposal = {
            draftedBy: await owner.getAddress(),
            title: 'Proposal 1',
            description: 'Description of Proposal 1',
            isElection: false,
            votes: {
              yes: 0,
              no: 0,
              abstain: 0
            },
            candidates: []
          }
          await expect(votingProxy.addProposal(proposal))
            .to.emit(votingProxy, 'ProposalAdded')
            .withArgs(0, proposal.title, proposal.description)
        })
      })
      describe('Voting actions', () => {
        it('should vote on a proposal successfully', async () => {
          const ownerAddress = await owner.getAddress()
          console.log('Owner Address:', ownerAddress)

          const proposal = {
            draftedBy: ownerAddress,
            title: 'Proposal 1',
            description: 'Description of Proposal 1',
            isElection: false,
            votes: {
              yes: 0,
              no: 0,
              abstain: 0
            },
            candidates: []
          }

          await votingProxy.addProposal(proposal)
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
})

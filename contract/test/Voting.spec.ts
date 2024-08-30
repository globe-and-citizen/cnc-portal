import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Voting } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { Types } from '../typechain-types/contracts/Voting/Voting'

describe('Voting Contract', () => {
  let voting: Voting
  let owner: SignerWithAddress
  let member1: SignerWithAddress
  let member2: SignerWithAddress
  let member3: SignerWithAddress
  let member4: SignerWithAddress
  let member5: SignerWithAddress
  let member6: SignerWithAddress
  async function deployFixture() {
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
        await member1.getAddress(),
        await member2.getAddress(),
        await member3.getAddress(),
        await member4.getAddress(),
        await member5.getAddress(),
        await member6.getAddress()
      ]
    }
    const proposalElection = {
      id: 0,
      title: 'Election 1',
      description: 'Description of Election 1',
      draftedBy: await owner.getAddress(),
      isElection: true,
      votes: { yes: 0, no: 0, abstain: 0 },
      candidates,
      isActive: true,
      teamId: 1,
      voters: [
        await member1.getAddress(),
        await member2.getAddress(),
        await member3.getAddress(),
        await member4.getAddress(),
        await member5.getAddress(),
        await member6.getAddress()
      ]
    }
    const [founder, boD1] = await ethers.getSigners()
    const VotingFactory = await ethers.getContractFactory('Voting')
    voting = await VotingFactory.connect(founder).deploy()
    await voting.initialize()

    const BoardOfDirectorsImplFactory = await ethers.getContractFactory('BoardOfDirectors')
    const boardOfDirectorsImpl = await BoardOfDirectorsImplFactory.deploy()

    const BoardOfDirectorsBeacon = await ethers.getContractFactory('Beacon')
    const boardOfDirectorsBeacon = await BoardOfDirectorsBeacon.connect(founder).deploy(
      await boardOfDirectorsImpl.getAddress()
    )

    const ProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
    const initialize = boardOfDirectorsImpl.interface.encodeFunctionData('initialize', [
      [founder.address, await voting.getAddress()]
    ])
    const boardOfDirectorsProxyDeployment = await ProxyFactory.connect(founder).deploy(
      await boardOfDirectorsBeacon.getAddress(),
      initialize
    )
    const boardOfDirectorsProxy = await ethers.getContractAt(
      'BoardOfDirectors',
      await boardOfDirectorsProxyDeployment.getAddress()
    )
    await voting.setBoardOfDirectorsContractAddress(await boardOfDirectorsProxy.getAddress())

    return {
      proposal,
      proposalElection,
      founder,
      boD1,
      voting,
      boardOfDirectorsProxy
    }
  }
  const candidates = [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0x92d402Df9C107a5d539Fd8A430AaC9e2d93C0221'
  ]

  context('Deploying Voting Contract', () => {
    before(async () => {
      ;[owner, member1, member2, member3, member4, member5, member6] = await ethers.getSigners()
      await deployFixture()
    })

    describe('CRUD Members and Proposals', async () => {
      it('should add a proposal successfully', async () => {
        const { proposalElection } = await deployFixture()
        await expect(
          voting.addProposal(
            proposalElection.title,
            proposalElection.description,
            proposalElection.draftedBy,
            proposalElection.isElection,
            2,
            proposalElection.voters,
            candidates
          )
        )
          .to.emit(voting, 'ProposalAdded')
          .withArgs(0, proposalElection.title, proposalElection.description)
        // voting.addProposal

        await expect(
          voting.addProposal(
            proposalElection.title,
            proposalElection.description,
            proposalElection.draftedBy,
            proposalElection.isElection,
            2,
            proposalElection.voters,
            candidates
          )
        )
          .to.emit(voting, 'ProposalAdded')
          .withArgs(1, proposalElection.title, proposalElection.description)
      })

      it('should return the proposal details', async () => {
        const proposal = await voting.proposalsById(0)
        expect(proposal.title).to.equal('Election 1')
      })
    })
    describe('OpenZeppelin', () => {
      it('initializer', () => {
        const votingAsOwner = voting.connect(owner)
        expect(votingAsOwner.initialize()).to.be.revertedWith(
          'Initializable: contract is already initialized'
        )
      })
    })
    describe('Voting actions', () => {
      it('should vote on a directive proposal successfully', async () => {
        const votingAsMember1 = voting.connect(member1)

        await expect(votingAsMember1.voteDirective(0, 1))
          .to.emit(voting, 'DirectiveVoted')
          .withArgs(await member1.getAddress(), 0, 1)

        const proposal = await voting.proposalsById(0)
        expect(proposal.votes.yes).to.equal(1)
      })
      it('should vote "no" on a proposal successfully', async () => {
        const votingAsMember4 = voting.connect(member4)

        await expect(await votingAsMember4.voteDirective(0, 0))
          .to.emit(voting, 'DirectiveVoted')
          .withArgs(await member4.getAddress(), 0, 0)

        const proposal = await voting.proposalsById(0)
        expect(proposal.votes.no).to.equal(1)
      })

      it('should vote "abstain" on a proposal successfully', async () => {
        const votingAsMember5 = voting.connect(member5)

        await expect(await votingAsMember5.voteDirective(0, 2))
          .to.emit(voting, 'DirectiveVoted')
          .withArgs(await member5.getAddress(), 0, 2)

        const proposal = await voting.proposalsById(0)
        expect(proposal.votes.abstain).to.equal(1)
      })
      it('should revert with invalid vote', async () => {
        const votingAsMember6 = voting.connect(member6)

        await expect(votingAsMember6.voteDirective(0, 4)).to.be.revertedWith('Invalid vote')
      })
      it('should not allow a member to vote twice on a proposal', async () => {
        const votingAsMember1 = voting.connect(member1)
        await expect(votingAsMember1.voteDirective(0, 1)).to.be.revertedWith(
          'You have already voted'
        )
      })

      it('should vote on an election proposal successfully', async () => {
        const votingAsMember2 = voting.connect(member2)

        await expect(votingAsMember2.voteElection(0, candidates[1]))
          .to.emit(voting, 'ElectionVoted')
          .withArgs(await member2.getAddress(), 0, candidates[1])

        const proposal = await voting.getProposalById(0)
        const candidate: Types.CandidateStructOutput | undefined = proposal.candidates.find(
          (c: Types.CandidateStructOutput) => c.candidateAddress === candidates[1]
        )
        if (candidate) expect(candidate.votes).to.equal(1)
      })

      it('should conclude a proposal successfully', async () => {
        const { boardOfDirectorsProxy, proposal, proposalElection } = await deployFixture()

        await voting.addProposal(
          proposal.title,
          proposal.description,
          proposal.draftedBy,
          proposal.isElection,
          0,
          proposal.voters,
          []
        )
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          proposalElection.draftedBy,
          proposalElection.isElection,
          2,
          proposalElection.voters,
          candidates
        )
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          proposalElection.draftedBy,
          proposalElection.isElection,
          2,
          proposalElection.voters,
          candidates
        )
        await voting.setBoardOfDirectorsContractAddress(await boardOfDirectorsProxy.getAddress())
        await expect(voting.concludeProposal(1))
          .to.emit(voting, 'ProposalConcluded')
          .withArgs(1, false)

        const proposal1 = await voting.getProposalById(1)
        expect(proposal1.isActive).to.be.false
        const proposalEle = await voting.getProposalById(2)
        console.log(proposalEle)
        if (proposalEle.isElection) {
          await voting.connect(member1).voteElection(2, candidates[0])
          await voting.connect(member2).voteElection(2, candidates[1])

          await expect(voting.concludeProposal(2))
            .to.emit(voting, 'BoardOfDirectorsSet')
            .withArgs([candidates[0], candidates[1]])
        }
      })
    })
  })
})

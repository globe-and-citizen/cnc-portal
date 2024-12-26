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
  let unknownAddress: SignerWithAddress
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
    await voting.initialize(await founder.getAddress())

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
      ;[owner, member1, member2, member3, member4, member5, member6, unknownAddress] =
        await ethers.getSigners()
      await deployFixture()
    })

    describe('CRUD Members and Proposals', async () => {
      it('should add a proposal successfully', async () => {
        const { proposalElection } = await deployFixture()
        await expect(
          voting.addProposal(
            proposalElection.title,
            proposalElection.description,
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
      it('initializer', async () => {
        const votingAsOwner = voting.connect(owner)
        expect(votingAsOwner.initialize(await owner.getAddress())).to.be.revertedWith(
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
      it('should not allow a non-member to vote on a proposal', async () => {
        const votingAsUnknown = voting.connect(unknownAddress)
        await expect(votingAsUnknown.voteDirective(0, 1)).to.be.revertedWith(
          'You are not registered to vote in this proposal'
        )
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
          proposal.isElection,
          0,
          proposal.voters,
          []
        )
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          proposalElection.isElection,
          2,
          proposalElection.voters,
          candidates
        )
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
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
        if (proposalEle.isElection) {
          await voting.connect(member1).voteElection(2, candidates[0])
          await voting.connect(member2).voteElection(2, candidates[1])

          await expect(voting.concludeProposal(2))
            .to.emit(voting, 'BoardOfDirectorsSet')
            .withArgs([candidates[0], candidates[1]])
        }
      })
      it('should sort candidates based on the number of votes in descending order', async () => {
        const { voting, proposalElection } = await deployFixture()

        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          proposalElection.isElection,
          2,
          proposalElection.voters,
          candidates
        )
        await voting.connect(member1).voteElection(0, candidates[0])
        await voting.connect(member2).voteElection(0, candidates[1])
        await voting.connect(member3).voteElection(0, candidates[1])

        await voting.concludeProposal(0)

        const proposal = await voting.getProposalById(0)
        const sortedCandidates = proposal.candidates

        expect(sortedCandidates[0].candidateAddress).to.equal(candidates[0])
        expect(sortedCandidates[0].votes).to.equal(1)

        expect(sortedCandidates[1].candidateAddress).to.equal(candidates[1])
        expect(sortedCandidates[1].votes).to.equal(2)
      })
      it('should emit an event when a directive proposal is concluded', async () => {
        const { voting, proposal } = await deployFixture()

        await voting.addProposal(
          proposal.title,
          proposal.description,
          proposal.isElection,
          2,
          proposal.voters,
          []
        )
        await expect(voting.concludeProposal(0))
          .to.emit(voting, 'ProposalConcluded')
          .withArgs(0, false)
      })
      it('Then I can pause the contract', async () => {
        await voting.pause()

        expect(await voting.paused()).to.be.true
      })

      it('Then I can unpause the contract', async () => {
        await voting.unpause()

        expect(await voting.paused()).to.be.false
      })
    })
    describe('Board of Directors Management', () => {
      it('should set board of directors contract address', async () => {
        const { voting } = await deployFixture()
        const newAddress = ethers.Wallet.createRandom().address

        await voting.setBoardOfDirectorsContractAddress(newAddress)
        expect(await voting.boardOfDirectorsContractAddress()).to.equal(newAddress)
      })

      it('should allow owner to set board of directors', async () => {
        const { voting, boardOfDirectorsProxy } = await deployFixture()
        const newBoard = [
          ethers.Wallet.createRandom().address,
          ethers.Wallet.createRandom().address
        ]

        await voting.setBoardOfDirectorsContractAddress(await boardOfDirectorsProxy.getAddress())
        await expect(voting.setBoardOfDirectors(newBoard))
          .to.emit(boardOfDirectorsProxy, 'BoardOfDirectorsChanged')
          .withArgs(newBoard)
      })

      it('should not allow non-owner to set board of directors', async () => {
        const { voting, boardOfDirectorsProxy } = await deployFixture()
        const newBoard = [
          ethers.Wallet.createRandom().address,
          ethers.Wallet.createRandom().address
        ]

        await voting.setBoardOfDirectorsContractAddress(await boardOfDirectorsProxy.getAddress())
        const votingAsMember = voting.connect(member1)
        await expect(votingAsMember.setBoardOfDirectors(newBoard))
          .to.be.revertedWithCustomError(voting, 'OwnableUnauthorizedAccount')
          .withArgs(await member1.getAddress())
      })
    })
    describe('Tie Breaking Functionality', () => {
      it('should detect a tie and emit TieDetected event', async () => {
        const { voting, proposalElection } = await deployFixture()

        // Create election with 3 candidates and 2 winner positions
        const threeWayTieCandidates = [...candidates, ethers.Wallet.createRandom().address]
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          true,
          2,
          proposalElection.voters,
          threeWayTieCandidates
        )

        // Create a tie by having equal votes
        await voting.connect(member1).voteElection(0, threeWayTieCandidates[0])
        await voting.connect(member2).voteElection(0, threeWayTieCandidates[1])
        await voting.connect(member3).voteElection(0, threeWayTieCandidates[2])

        // Conclude proposal should detect tie
        await expect(voting.concludeProposal(0))
          .to.emit(voting, 'TieDetected')
          .withArgs(0, threeWayTieCandidates)

        const proposal = await voting.getProposalById(0)
        expect(proposal.hasTie).to.be.true
        expect(proposal.tiedCandidates).to.have.lengthOf(3)
      })

      it('should resolve tie using random selection', async () => {
        const { voting, proposalElection } = await deployFixture()

        // Create and setup tied election
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          true,
          1,
          proposalElection.voters,
          candidates
        )

        await voting.connect(member1).voteElection(0, candidates[0])
        await voting.connect(member2).voteElection(0, candidates[1])

        await voting.concludeProposal(0)

        // Resolve tie with random selection
        await expect(voting.resolveTie(0, 0)) // 0 = RANDOM_SELECTION
          .to.emit(voting, 'TieBreakOptionSelected')
          .withArgs(0, 0)
          .to.emit(voting, 'BoardOfDirectorsSet')

        const proposal = await voting.getProposalById(0)
        expect(proposal.hasTie).to.be.false
      })

      it('should resolve tie by increasing winner count', async () => {
        const { voting, proposalElection } = await deployFixture()

        // Create and setup tied election
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          true,
          1,
          proposalElection.voters,
          candidates
        )

        await voting.connect(member1).voteElection(0, candidates[0])
        await voting.connect(member2).voteElection(0, candidates[1])

        await voting.concludeProposal(0)

        // Resolve tie by increasing winner count
        await expect(voting.resolveTie(0, 3)) // 3 = INCREASE_WINNER_COUNT
          .to.emit(voting, 'TieBreakOptionSelected')
          .withArgs(0, 3)
          .to.emit(voting, 'BoardOfDirectorsSet')

        const proposal = await voting.getProposalById(0)
        expect(proposal.hasTie).to.be.false
        expect(proposal.winnerCount).to.equal(2)
      })

      it('should create runoff election for tied candidates', async () => {
        const { voting, proposalElection } = await deployFixture()

        // Create and setup tied election
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          true,
          1,
          proposalElection.voters,
          candidates
        )

        await voting.connect(member1).voteElection(0, candidates[0])
        await voting.connect(member2).voteElection(0, candidates[1])

        await voting.concludeProposal(0)

        // Resolve tie with runoff election
        await expect(voting.resolveTie(0, 1)) // 1 = RUNOFF_ELECTION
          .to.emit(voting, 'TieBreakOptionSelected')
          .withArgs(0, 1)
          .to.emit(voting, 'RunoffElectionStarted')
          .withArgs(1, candidates)

        const proposal = await voting.getProposalById(0)
        expect(proposal.hasTie).to.be.false

        // Verify runoff election was created
        const runoffProposal = await voting.getProposalById(1)
        expect(runoffProposal.isElection).to.be.true
        expect(runoffProposal.candidates).to.have.lengthOf(2)
        expect(runoffProposal.title).to.include('Runoff:')
      })

      it('should allow founder to select winner from tied candidates', async () => {
        const { voting, proposalElection } = await deployFixture()

        // Create and setup tied election
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          true,
          1,
          proposalElection.voters,
          candidates
        )

        await voting.connect(member1).voteElection(0, candidates[0])
        await voting.connect(member2).voteElection(0, candidates[1])

        await voting.concludeProposal(0)

        // Set tie break option to founder choice
        await expect(voting.resolveTie(0, 2)) // 2 = FOUNDER_CHOICE
          .to.emit(voting, 'TieBreakOptionSelected')
          .withArgs(0, 2)

        // Select winner
        await expect(voting.selectWinner(0, candidates[0])).to.emit(voting, 'BoardOfDirectorsSet')

        const proposal = await voting.getProposalById(0)
        expect(proposal.hasTie).to.be.false
      })

      it('should only allow founder to resolve ties', async () => {
        const { voting, proposalElection } = await deployFixture()

        // Create and setup tied election
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          true,
          1,
          proposalElection.voters,
          candidates
        )

        await voting.connect(member1).voteElection(0, candidates[0])
        await voting.connect(member2).voteElection(0, candidates[1])

        await voting.concludeProposal(0)

        // Try to resolve tie as non-founder
        const votingAsMember = voting.connect(member1)
        await expect(votingAsMember.resolveTie(0, 0)).to.be.revertedWith(
          'Only the founder can resolve ties'
        )
      })

      it('should only allow selecting winner after setting FOUNDER_CHOICE option', async () => {
        const { voting, proposalElection } = await deployFixture()

        // Create and setup tied election
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          true,
          1,
          proposalElection.voters,
          candidates
        )

        await voting.connect(member1).voteElection(0, candidates[0])
        await voting.connect(member2).voteElection(0, candidates[1])

        await voting.concludeProposal(0)

        // Try to select winner without setting FOUNDER_CHOICE
        await expect(voting.selectWinner(0, candidates[0])).to.be.revertedWith(
          'Tie break option must be FOUNDER_CHOICE'
        )
      })

      it('should only allow selecting from tied candidates', async () => {
        const { voting, proposalElection } = await deployFixture()

        // Create and setup tied election
        await voting.addProposal(
          proposalElection.title,
          proposalElection.description,
          true,
          1,
          proposalElection.voters,
          candidates
        )

        await voting.connect(member1).voteElection(0, candidates[0])
        await voting.connect(member2).voteElection(0, candidates[1])

        await voting.concludeProposal(0)
        await voting.resolveTie(0, 2) // 2 = FOUNDER_CHOICE

        // Try to select non-tied candidate
        const invalidAddress = ethers.Wallet.createRandom().address
        await expect(voting.selectWinner(0, invalidAddress)).to.be.revertedWith(
          'Selected winner must be one of the tied candidates'
        )
      })
    })
  })
})

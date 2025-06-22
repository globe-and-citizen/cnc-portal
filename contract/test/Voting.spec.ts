import { ethers } from 'hardhat'
import { expect } from 'chai'
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers'
import { Types } from '../typechain-types/contracts/Voting/Voting'

describe('Voting Contract', () => {
  // Main fixture for deploying the contract and setting up accounts
  async function deployFixture() {
    const [owner, member1, member2, member3, member4, member5, member6, unknownAddress] =
      await ethers.getSigners()

    const candidates = [member1.address, member2.address, member3.address]

    const proposalInfo = {
      title: 'Directive Proposal',
      description: 'This is a test directive proposal.',
      isElection: false,
      teamId: 1,
      voters: [], // Automatically set to BoD members
      candidates: []
    }

    const electionProposalInfo = {
      title: 'Election Proposal',
      description: 'This is a test election proposal.',
      isElection: true,
      teamId: 1,
      voters: [
        member1.address,
        member2.address,
        member3.address,
        member4.address,
        member5.address,
        member6.address
      ],
      candidates
    }

    const VotingFactory = await ethers.getContractFactory('Voting')
    const voting = await VotingFactory.connect(owner).deploy()
    await voting.initialize(owner.address)

    const BoardOfDirectorsImplFactory = await ethers.getContractFactory('BoardOfDirectors')
    const boardOfDirectorsImpl = await BoardOfDirectorsImplFactory.deploy()

    const BoardOfDirectorsBeacon = await ethers.getContractFactory('Beacon')
    const boardOfDirectorsBeacon = await BoardOfDirectorsBeacon.connect(owner).deploy(
      await boardOfDirectorsImpl.getAddress()
    )

    const ProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
    const initialize = boardOfDirectorsImpl.interface.encodeFunctionData('initialize', [
      [owner.address, await voting.getAddress()]
    ])
    const boardOfDirectorsProxyDeployment = await ProxyFactory.connect(owner).deploy(
      await boardOfDirectorsBeacon.getAddress(),
      initialize
    )
    const boardOfDirectorsProxy = await ethers.getContractAt(
      'BoardOfDirectors',
      await boardOfDirectorsProxyDeployment.getAddress()
    )
    await voting.setBoardOfDirectorsContractAddress(await boardOfDirectorsProxy.getAddress())

    return {
      voting,
      boardOfDirectorsProxy,
      proposalInfo,
      electionProposalInfo,
      owner,
      member1,
      member2,
      member3,
      member4,
      member5,
      member6,
      unknownAddress,
      candidates
    }
  }

  // Fixture for when Board of Directors is set
  async function boardOfDirectorsSetFixture() {
    const fixture = await loadFixture(deployFixture)
    const { voting, owner, member1, member2 } = fixture
    await voting.connect(owner).setBoardOfDirectors([member1.address, member2.address])
    return fixture
  }

  function getProposalTimes() {
    const startTime = Math.floor(Date.now() / 1000) // Current time in seconds
    const endTime = startTime + 3600 // End in 1 hour
    return { startTime, endTime }
  }

  describe('Deployment and Initialization', () => {
    it('should deploy and initialize the contract correctly', async () => {
      const { voting, owner } = await loadFixture(deployFixture)
      expect(await voting.owner()).to.equal(owner.address)
      expect(await voting.paused()).to.be.false
    })
  })

  describe('Board of Directors Management', () => {
    it('should allow the owner to set the Board of Directors contract address', async () => {
      const { voting, owner } = await loadFixture(deployFixture)
      const newAddress = ethers.Wallet.createRandom().address
      await voting.connect(owner).setBoardOfDirectorsContractAddress(newAddress)
      expect(await voting.boardOfDirectorsContractAddress()).to.equal(newAddress)
    })

    it('should allow a non-owner to set the Board of Directors contract address', async () => {
      const { voting, member1 } = await loadFixture(deployFixture)
      const newAddress = ethers.Wallet.createRandom().address
      await voting.connect(member1).setBoardOfDirectorsContractAddress(newAddress)
      expect(await voting.boardOfDirectorsContractAddress()).to.equal(newAddress)
    })

    it('should allow the owner to set the Board of Directors members', async () => {
      const { voting, owner, boardOfDirectorsProxy, member1, member2 } =
        await loadFixture(deployFixture)
      const newBoard = [member1.address, member2.address]
      await expect(voting.connect(owner).setBoardOfDirectors(newBoard))
        .to.emit(boardOfDirectorsProxy, 'BoardOfDirectorsChanged')
        .withArgs(newBoard)
    })

    it('should not allow a non-owner to set the Board of Directors members', async () => {
      const { voting, member1, member2, member3 } = await loadFixture(deployFixture)
      const newBoard = [member2.address, member3.address]
      await expect(
        voting.connect(member1).setBoardOfDirectors(newBoard)
      ).to.be.revertedWithCustomError(voting, 'OwnableUnauthorizedAccount')
    })
  })

  describe('Proposal Management', () => {
    it('should not allow creating a proposal if Board of Directors is not set', async () => {
      const { voting, proposalInfo } = await loadFixture(deployFixture)
      const { startTime, endTime } = getProposalTimes()
      await expect(
        voting.addProposal(
          proposalInfo.title,
          proposalInfo.description,
          proposalInfo.isElection,
          2,
          proposalInfo.voters,
          proposalInfo.candidates,
          startTime,
          endTime
        )
      ).to.be.revertedWith('Board of Directors must be set before creating proposals')
    })

    it('should revert when creating a proposal with an empty title', async () => {
      const { voting, proposalInfo } = await loadFixture(boardOfDirectorsSetFixture)
      const { startTime, endTime } = getProposalTimes()
      await expect(
        voting.addProposal(
          '',
          proposalInfo.description,
          proposalInfo.isElection,
          0,
          proposalInfo.voters,
          proposalInfo.candidates,
          startTime,
          endTime
        )
      ).to.be.revertedWith('Title cannot be empty')
    })

    it('should revert when creating an election with no candidates', async () => {
      const { voting, owner, electionProposalInfo } = await loadFixture(boardOfDirectorsSetFixture)
      const { startTime, endTime } = getProposalTimes()
      await expect(
        voting
          .connect(owner)
          .addProposal(
            electionProposalInfo.title,
            electionProposalInfo.description,
            true,
            2,
            electionProposalInfo.voters,
            [],
            startTime,
            endTime
          )
      ).to.be.revertedWith('Candidates cannot be empty')
    })

    it('should revert when creating an election with an even number of candidates', async () => {
      const { voting, owner, electionProposalInfo, member4 } = await loadFixture(
        boardOfDirectorsSetFixture
      )
      const { startTime, endTime } = getProposalTimes()
      const evenCandidates = [...electionProposalInfo.candidates, member4.address]
      await expect(
        voting
          .connect(owner)
          .addProposal(
            electionProposalInfo.title,
            electionProposalInfo.description,
            true,
            2,
            electionProposalInfo.voters,
            evenCandidates,
            startTime,
            endTime
          )
      ).to.be.revertedWith('Number of candidates must be odd')
    })

    it('should allow creating a directive proposal after BoD is set', async () => {
      const { voting, proposalInfo } = await loadFixture(boardOfDirectorsSetFixture)
      const { startTime, endTime } = getProposalTimes()

      await expect(
        voting.addProposal(
          proposalInfo.title,
          proposalInfo.description,
          proposalInfo.isElection,
          0,
          proposalInfo.voters,
          proposalInfo.candidates,
          startTime,
          endTime
        )
      )
        .to.emit(voting, 'ProposalAdded')
        .withArgs(0, proposalInfo.title, proposalInfo.description)
    })

    it('should only allow owner to create election proposals', async () => {
      const { voting, member1, electionProposalInfo } = await loadFixture(
        boardOfDirectorsSetFixture
      )
      const { startTime, endTime } = getProposalTimes()

      await expect(
        voting
          .connect(member1)
          .addProposal(
            electionProposalInfo.title,
            electionProposalInfo.description,
            electionProposalInfo.isElection,
            2,
            electionProposalInfo.voters,
            electionProposalInfo.candidates,
            startTime,
            endTime
          )
      ).to.be.revertedWith('Only owner can create BoD elections')
    })

    it('should allow owner to create an election proposal', async () => {
      const { voting, owner, electionProposalInfo } = await loadFixture(boardOfDirectorsSetFixture)
      const { startTime, endTime } = getProposalTimes()

      await expect(
        voting
          .connect(owner)
          .addProposal(
            electionProposalInfo.title,
            electionProposalInfo.description,
            electionProposalInfo.isElection,
            2,
            electionProposalInfo.voters,
            electionProposalInfo.candidates,
            startTime,
            endTime
          )
      )
        .to.emit(voting, 'ProposalAdded')
        .withArgs(0, electionProposalInfo.title, electionProposalInfo.description)
    })

    it('should return correct proposal details', async () => {
      const { voting, owner, electionProposalInfo } = await loadFixture(boardOfDirectorsSetFixture)
      const { startTime, endTime } = getProposalTimes()
      await voting
        .connect(owner)
        .addProposal(
          electionProposalInfo.title,
          electionProposalInfo.description,
          electionProposalInfo.isElection,
          2,
          electionProposalInfo.voters,
          electionProposalInfo.candidates,
          startTime,
          endTime
        )

      const proposal = await voting.proposalsById(0)
      expect(proposal.title).to.equal(electionProposalInfo.title)
      expect(proposal.isElection).to.be.true
    })
  })

  describe('Voting on Proposals', () => {
    async function proposalsCreatedFixture() {
      const {
        voting,
        owner,
        member1,
        member2,
        member3,
        member4,
        proposalInfo,
        electionProposalInfo,
        candidates,
        unknownAddress
      } = await loadFixture(deployFixture)
      await voting
        .connect(owner)
        .setBoardOfDirectors([member1.address, member2.address, member3.address])
      const { startTime, endTime } = getProposalTimes()

      // Add a directive proposal (ID 0)
      await voting.addProposal(
        proposalInfo.title,
        proposalInfo.description,
        false,
        0,
        [],
        [],
        startTime,
        endTime
      )

      // Add an election proposal (ID 1)
      await voting.connect(owner).addProposal(
        electionProposalInfo.title,
        electionProposalInfo.description,
        true,
        2, // 2 winners
        electionProposalInfo.voters,
        electionProposalInfo.candidates,
        startTime,
        endTime
      )
      return {
        voting,
        owner,
        member1,
        member2,
        member3,
        member4,
        unknownAddress,
        candidates,
        electionProposalInfo
      }
    }

    it('should allow a board member to vote on a directive proposal', async () => {
      const { voting, member1 } = await loadFixture(proposalsCreatedFixture)
      await expect(voting.connect(member1).voteDirective(0, 1)) // Vote 'yes'
        .to.emit(voting, 'DirectiveVoted')
        .withArgs(member1.address, 0, 1)

      const p = await voting.proposalsById(0)
      expect(p.votes.yes).to.equal(1)
    })

    it('should not allow non-board members to vote on a directive proposal', async () => {
      const { voting, member4 } = await loadFixture(proposalsCreatedFixture)
      await expect(voting.connect(member4).voteDirective(0, 1)).to.be.revertedWith(
        'You are not registered to vote in this proposal'
      )
    })

    it('should not allow voting twice on a directive proposal', async () => {
      const { voting, member1 } = await loadFixture(proposalsCreatedFixture)
      await voting.connect(member1).voteDirective(0, 1)
      await expect(voting.connect(member1).voteDirective(0, 1)).to.be.revertedWith(
        'You have already voted'
      )
    })

    it('should revert on invalid vote for directive proposal', async () => {
      const { voting, member1 } = await loadFixture(proposalsCreatedFixture)
      await expect(voting.connect(member1).voteDirective(0, 4)).to.be.revertedWith('Invalid vote')
    })

    it('should allow a registered voter to vote on an election proposal', async () => {
      const { voting, member1, candidates } = await loadFixture(proposalsCreatedFixture)
      await expect(voting.connect(member1).voteElection(1, candidates[0]))
        .to.emit(voting, 'ElectionVoted')
        .withArgs(member1.address, 1, candidates[0])

      const proposal = await voting.getProposalById(1)
      const candidate = proposal.candidates.find(
        (c: Types.CandidateStruct) => c.candidateAddress === candidates[0]
      )
      expect(candidate).to.exist
      expect(candidate!.votes).to.equal(1)
    })

    it('should not allow a non-registered voter to vote on an election proposal', async () => {
      const { voting, unknownAddress, candidates } = await loadFixture(proposalsCreatedFixture)
      await expect(
        voting.connect(unknownAddress).voteElection(1, candidates[0])
      ).to.be.revertedWith('You are not registered to vote in this proposal')
    })
  })

  describe('Voting Edge Cases', () => {
    it('should revert when voting on a non-existent proposal', async () => {
      const { voting, member1 } = await loadFixture(boardOfDirectorsSetFixture)
      await expect(voting.connect(member1).voteDirective(99, 1)).to.be.revertedWith(
        'Proposal does not exist'
      )
    })

    it('should revert when voting before the proposal start time', async () => {
      const { voting, member1, proposalInfo } = await loadFixture(boardOfDirectorsSetFixture)
      const startTime = (await time.latest()) + 3600
      const endTime = startTime + 3600
      await voting.addProposal(
        proposalInfo.title,
        proposalInfo.description,
        false,
        0,
        [],
        [],
        startTime,
        endTime
      )
      await expect(voting.connect(member1).voteDirective(0, 1)).to.be.revertedWith(
        'Voting period has not started yet'
      )
    })

    it('should revert when voting after the proposal end time', async () => {
      const { voting, member1, proposalInfo } = await loadFixture(boardOfDirectorsSetFixture)
      const { startTime, endTime } = getProposalTimes()
      await voting.addProposal(
        proposalInfo.title,
        proposalInfo.description,
        false,
        0,
        [],
        [],
        startTime,
        endTime
      )
      await time.increaseTo(endTime + 1)
      await expect(voting.connect(member1).voteDirective(0, 1)).to.be.revertedWith(
        'Voting period has ended'
      )
    })

    it('should revert when voting for a non-existent candidate', async () => {
      const { voting, owner, member1, electionProposalInfo, unknownAddress } = await loadFixture(
        boardOfDirectorsSetFixture
      )
      const { startTime, endTime } = getProposalTimes()
      await voting
        .connect(owner)
        .addProposal(
          electionProposalInfo.title,
          electionProposalInfo.description,
          true,
          1,
          electionProposalInfo.voters,
          electionProposalInfo.candidates,
          startTime,
          endTime
        )
      await expect(
        voting.connect(member1).voteElection(0, unknownAddress.address)
      ).to.be.revertedWith('Candidate does not exist')
    })

    it('should not allow voting twice on an election proposal', async () => {
      const { voting, owner, member1, electionProposalInfo } = await loadFixture(
        boardOfDirectorsSetFixture
      )
      const { startTime, endTime } = getProposalTimes()
      await voting
        .connect(owner)
        .addProposal(
          electionProposalInfo.title,
          electionProposalInfo.description,
          true,
          1,
          electionProposalInfo.voters,
          electionProposalInfo.candidates,
          startTime,
          endTime
        )
      await voting.connect(member1).voteElection(0, electionProposalInfo.candidates[0])
      await expect(
        voting.connect(member1).voteElection(0, electionProposalInfo.candidates[1])
      ).to.be.revertedWith('You have already voted')
    })
  })

  describe('Proposal Conclusion and Tie-Breaking', () => {
    it('should conclude a directive proposal when all voters have voted', async () => {
      const { voting, owner, member1, member2, member3, proposalInfo } =
        await loadFixture(deployFixture)
      await voting
        .connect(owner)
        .setBoardOfDirectors([member1.address, member2.address, member3.address])
      const { startTime, endTime } = getProposalTimes()
      await voting.addProposal(
        proposalInfo.title,
        proposalInfo.description,
        false,
        0,
        [],
        [],
        startTime,
        endTime
      )

      await voting.connect(member1).voteDirective(0, 1) // Yes
      await voting.connect(member2).voteDirective(0, 0) // No

      await expect(voting.connect(member3).voteDirective(0, 2)) // Abstain
        .to.emit(voting, 'ProposalConcluded')
        .withArgs(0, false)

      const concludedProposal = await voting.getProposalById(0)
      expect(concludedProposal.isActive).to.be.false
      expect(concludedProposal.votes.yes).to.equal(1)
      expect(concludedProposal.votes.no).to.equal(1)
      expect(concludedProposal.votes.abstain).to.equal(1)
    })

    it('should revert when a non-owner tries to conclude an election', async () => {
      const { voting, owner, member1, electionProposalInfo, candidates } =
        await loadFixture(deployFixture)
      const { startTime, endTime } = getProposalTimes()
      await voting
        .connect(owner)
        .addProposal(
          electionProposalInfo.title,
          electionProposalInfo.description,
          true,
          2,
          electionProposalInfo.voters,
          candidates,
          startTime,
          endTime
        )
      await time.increaseTo(endTime + 1)
      await expect(voting.connect(member1).concludeProposal(0)).to.be.revertedWith(
        'Only owner can conclude elections'
      )
    })

    it('should allow a board member to conclude a directive proposal', async () => {
      const { voting, owner, member1, member2, proposalInfo } = await loadFixture(deployFixture)
      await voting.connect(owner).setBoardOfDirectors([member1.address, member2.address])
      const { startTime, endTime } = getProposalTimes()
      await voting
        .connect(member1) // member1 is drafter and board member
        .addProposal(
          proposalInfo.title,
          proposalInfo.description,
          false,
          0,
          [],
          [],
          startTime,
          endTime
        )
      await time.increaseTo(endTime + 1)
      // member2 is also a board member and should be able to conclude
      await expect(voting.connect(member2).concludeProposal(0))
        .to.emit(voting, 'ProposalConcluded')
        .withArgs(0, false)
    })

    it('should revert when a non-authorized user tries to conclude a directive proposal', async () => {
      const { voting, owner, member1, member2, unknownAddress, proposalInfo } =
        await loadFixture(deployFixture)
      await voting.connect(owner).setBoardOfDirectors([member1.address, member2.address])
      const { startTime, endTime } = getProposalTimes()
      await voting
        .connect(member1)
        .addProposal(
          proposalInfo.title,
          proposalInfo.description,
          false,
          0,
          [],
          [],
          startTime,
          endTime
        )
      await time.increaseTo(endTime + 1)
      await expect(voting.connect(unknownAddress).concludeProposal(0)).to.be.revertedWith(
        'Only the founder or board member can conclude this proposal'
      )
    })

    it('should conclude an election and set new Board of Directors', async () => {
      const { voting, owner, member1, member2, member3, electionProposalInfo, candidates } =
        await loadFixture(deployFixture)
      const { startTime, endTime } = getProposalTimes()
      await voting
        .connect(owner)
        .addProposal(
          electionProposalInfo.title,
          electionProposalInfo.description,
          true,
          2,
          electionProposalInfo.voters,
          candidates,
          startTime,
          endTime
        )

      await voting.connect(member1).voteElection(0, candidates[0])
      await voting.connect(member2).voteElection(0, candidates[0])
      await voting.connect(member3).voteElection(0, candidates[1])

      await time.increaseTo(endTime + 1) // Ensure proposal is concluded
      await expect(voting.concludeProposal(0))
        .to.emit(voting, 'ProposalConcluded')
        .withArgs(0, false)
        .to.emit(voting, 'BoardOfDirectorsSet')
        .withArgs([candidates[0], candidates[1]])

      const concludedProposal = await voting.getProposalById(0)
      expect(concludedProposal.isActive).to.be.false
    })

    it('should detect a tie in an election', async () => {
      const { voting, owner, member1, member2, member3, electionProposalInfo, candidates } =
        await loadFixture(deployFixture)
      const { startTime, endTime } = getProposalTimes()
      // 2 winners, but 3 candidates get 1 vote each
      await voting
        .connect(owner)
        .addProposal(
          electionProposalInfo.title,
          electionProposalInfo.description,
          true,
          2,
          electionProposalInfo.voters,
          candidates,
          startTime,
          endTime
        )

      await voting.connect(member1).voteElection(0, candidates[0])
      await voting.connect(member2).voteElection(0, candidates[1])
      await voting.connect(member3).voteElection(0, candidates[2])

      await time.increaseTo(endTime + 1) // Ensure proposal is concluded
      await expect(voting.concludeProposal(0))
        .to.emit(voting, 'TieDetected')
        .withArgs(0, [candidates[0], candidates[1], candidates[2]])

      const proposal = await voting.getProposalById(0)
      expect(proposal.hasTie).to.be.true
    })

    it('should resolve a tie by increasing winner count', async () => {
      const { voting, owner, member1, member2, member3, electionProposalInfo, candidates } =
        await loadFixture(deployFixture)
      const { startTime, endTime } = getProposalTimes()
      await voting.connect(owner).addProposal(
        electionProposalInfo.title,
        electionProposalInfo.description,
        true,
        2, // 2 winners
        electionProposalInfo.voters,
        candidates,
        startTime,
        endTime
      )

      await voting.connect(member1).voteElection(0, candidates[0])
      await voting.connect(member2).voteElection(0, candidates[1])
      await voting.connect(member3).voteElection(0, candidates[2])
      // Now votes are 1, 1, 1. Tie for 3 candidates for 2 spots.

      await time.increaseTo(endTime + 1)
      await voting.concludeProposal(0) // Tie detected
      console.log(await voting.getProposalById(0))

      await expect(voting.connect(owner).resolveTie(0, 3)) // INCREASE_WINNER_COUNT
        .to.emit(voting, 'BoardOfDirectorsSet') // This will set 3 winners

      const proposal = await voting.getProposalById(0)
      expect(proposal.hasTie).to.be.false
      expect(proposal.isActive).to.be.false
      expect(proposal.winnerCount).to.equal(3)
    })

    it('should resolve a tie by random selection', async () => {
      const { voting, owner, member1, member2, electionProposalInfo, candidates } =
        await loadFixture(deployFixture)
      const { startTime, endTime } = getProposalTimes()
      await voting
        .connect(owner)
        .addProposal(
          electionProposalInfo.title,
          electionProposalInfo.description,
          true,
          1,
          electionProposalInfo.voters,
          candidates,
          startTime,
          endTime
        )

      await voting.connect(member1).voteElection(0, candidates[0])
      await voting.connect(member2).voteElection(0, candidates[1])
      await time.increaseTo(endTime + 1)
      await voting.concludeProposal(0) // Tie detected

      // Random selection is difficult to test, but we can check that it executes
      // and one of the tied candidates becomes a winner.
      await expect(voting.connect(owner).resolveTie(0, 0)) // RANDOM_SELECTION
        .to.emit(voting, 'BoardOfDirectorsSet')

      const proposal = await voting.getProposalById(0)
      expect(proposal.hasTie).to.be.false
      expect(proposal.isActive).to.be.false
    })

    it('should resolve a tie by founder selection', async () => {
      const { voting, owner, member1, member2, electionProposalInfo, candidates } =
        await loadFixture(deployFixture)
      const { startTime, endTime } = getProposalTimes()
      await voting
        .connect(owner)
        .addProposal(
          electionProposalInfo.title,
          electionProposalInfo.description,
          true,
          1,
          electionProposalInfo.voters,
          candidates,
          startTime,
          endTime
        )

      await voting.connect(member1).voteElection(0, candidates[0])
      await voting.connect(member2).voteElection(0, candidates[1])
      await time.increaseTo(endTime + 1) // Ensure proposal is concluded
      await voting.concludeProposal(0) // Tie detected

      await voting.connect(owner).resolveTie(0, 2) // FOUNDER_CHOICE
      await expect(voting.connect(owner).selectWinner(0, candidates[1]))
        .to.emit(voting, 'BoardOfDirectorsSet')
        .withArgs([candidates[1]])

      const proposal = await voting.getProposalById(0)
      expect(proposal.hasTie).to.be.false
    })
  })

  describe('Getter and View Functions', () => {
    it('should revert when getting a non-existent proposal', async () => {
      const { voting } = await loadFixture(deployFixture)
      await expect(voting.getProposalById(99)).to.be.revertedWith('Proposal does not exist')
    })

    it('should correctly check if an address is a board member', async () => {
      const { voting, member1, unknownAddress } = await loadFixture(boardOfDirectorsSetFixture)
      expect(await voting.isBoardOfDirector(member1.address)).to.be.true
      expect(await voting.isBoardOfDirector(unknownAddress.address)).to.be.false
    })
  })

  describe('Pausable Functionality', () => {
    it('should allow owner to pause and unpause the contract', async () => {
      const { voting, owner } = await loadFixture(deployFixture)
      await voting.connect(owner).pause()
      expect(await voting.paused()).to.be.true

      await voting.connect(owner).unpause()
      expect(await voting.paused()).to.be.false
    })

    it('should not allow non-owner to pause or unpause', async () => {
      const { voting, owner, member1 } = await loadFixture(deployFixture)
      await expect(voting.connect(member1).pause()).to.be.revertedWithCustomError(
        voting,
        'OwnableUnauthorizedAccount'
      )

      await voting.connect(owner).pause() // owner pauses
      await expect(voting.connect(member1).unpause()).to.be.revertedWithCustomError(
        voting,
        'OwnableUnauthorizedAccount'
      )
    })
  })
})

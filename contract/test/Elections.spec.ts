import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { reset, time } from '@nomicfoundation/hardhat-network-helpers'
import { Elections, MockBoardOfDirectors } from '../typechain-types'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

describe('Elections', function () {
  let elections: Elections
  let boardOfDirectors: MockBoardOfDirectors
  let owner: HardhatEthersSigner
  let voter1: HardhatEthersSigner
  let voter2: HardhatEthersSigner
  let voter3: HardhatEthersSigner
  let voter4: HardhatEthersSigner
  let voter5: HardhatEthersSigner
  let voter6: HardhatEthersSigner
  let candidate1: HardhatEthersSigner
  let candidate2: HardhatEthersSigner
  let candidate3: HardhatEthersSigner
  let candidate4: HardhatEthersSigner
  let nonVoter: HardhatEthersSigner

  const ONE_DAY = 24 * 60 * 60
  const ONE_WEEK = 7 * ONE_DAY

  beforeEach(async function () {
    ;[
      owner,
      voter1,
      voter2,
      voter3,
      voter4,
      voter5,
      voter6,
      candidate1,
      candidate2,
      candidate3,
      candidate4,
      nonVoter
    ] = await ethers.getSigners()

    const ElectionsFactory = await ethers.getContractFactory('Elections')
    elections = (await upgrades.deployProxy(ElectionsFactory, [owner.address], {
      initializer: 'initialize'
    })) as unknown as Elections
    await elections.waitForDeployment()

    const BoardOfDirectorsFactory = await ethers.getContractFactory('MockBoardOfDirectors')
    boardOfDirectors = (await upgrades.deployProxy(BoardOfDirectorsFactory, [], {
      initializer: 'initialize'
    })) as unknown as MockBoardOfDirectors
    await boardOfDirectors.waitForDeployment()

    await elections
      .connect(owner)
      .setBoardOfDirectorsContractAddress(await boardOfDirectors.getAddress())
  })

  afterEach(async function () {
    await reset()
  })

  describe('Deployment', function () {
    it('Should set the correct owner', async function () {
      expect(await elections.owner()).to.equal(owner.address)
    })

    it('Should initialize with nextElectionId as 1', async function () {
      expect(await elections.getNextElectionId()).to.equal(1)
    })
  })

  describe('Election Creation', function () {
    let candidates: string[]
    let eligibleVoters: string[]
    let startDate: number
    let endDate: number

    beforeEach(async function () {
      candidates = [candidate1.address, candidate2.address, candidate3.address]
      eligibleVoters = [voter1.address, voter2.address, voter3.address]

      const currentTime = await time.latest()
      startDate = currentTime + ONE_DAY
      endDate = startDate + ONE_WEEK
    })

    it('Should create an election with valid parameters', async function () {
      const tx = await elections.createElection(
        'BOD Election 2025',
        'Annual Board of Directors Election',
        startDate,
        endDate,
        3, // odd number of seats
        candidates,
        eligibleVoters
      )

      await expect(tx)
        .to.emit(elections, 'ElectionCreated')
        .withArgs(1, 'BOD Election 2025', owner.address, startDate, endDate, 3)

      const election = await elections.getElection(1)
      expect(election.id).to.equal(1)
      expect(election.title).to.equal('BOD Election 2025')
      expect(election.seatCount).to.equal(3)
    })

    it('Should revert with even number of seats', async function () {
      await expect(
        elections.createElection(
          'BOD Election 2025',
          'Annual Board of Directors Election',
          startDate,
          endDate,
          4, // even number - should fail
          candidates,
          eligibleVoters
        )
      ).to.be.revertedWithCustomError(elections, 'InvalidSeatCount')
    })

    it('Should revert with zero seats', async function () {
      await expect(
        elections.createElection(
          'BOD Election 2025',
          'Annual Board of Directors Election',
          startDate,
          endDate,
          0, // zero seats - should fail
          candidates,
          eligibleVoters
        )
      ).to.be.revertedWithCustomError(elections, 'InvalidSeatCount')
    })

    it('Should revert if election already exists', async function () {
      await elections.createElection(
        'BOD Election 2025',
        'Annual Board of Directors Election',
        startDate,
        endDate,
        3,
        candidates,
        eligibleVoters
      )
      console.log((await elections.getElection(1)).resultsPublished, 'resultsPublished')
      console.log((await elections.getElection(1)).id, 'electionId')

      await expect(
        elections.createElection(
          'BOD Election 2025',
          'Annual Board of Directors Election',
          startDate,
          endDate,
          3,
          candidates,
          eligibleVoters
        )
      ).to.be.revertedWithCustomError(elections, 'ElectionIsOngoing')
    })

    it('Should revert with past start date', async function () {
      const pastDate = (await time.latest()) - ONE_DAY

      await expect(
        elections.createElection(
          'BOD Election 2025',
          'Annual Board of Directors Election',
          pastDate,
          endDate,
          3,
          candidates,
          eligibleVoters
        )
      ).to.be.revertedWithCustomError(elections, 'InvalidDates')
    })

    it('Should revert with end date before start date', async function () {
      await expect(
        elections.createElection(
          'BOD Election 2025',
          'Annual Board of Directors Election',
          endDate,
          startDate, // end before start
          3,
          candidates,
          eligibleVoters
        )
      ).to.be.revertedWithCustomError(elections, 'InvalidDates')
    })

    it('Should revert with insufficient candidates', async function () {
      await expect(
        elections.createElection(
          'BOD Election 2025',
          'Annual Board of Directors Election',
          startDate,
          endDate,
          5, // more seats than candidates
          candidates, // only 3 candidates
          eligibleVoters
        )
      ).to.be.revertedWithCustomError(elections, 'InsufficientCandidates')
    })

    it('Should revert with duplicate candidates', async function () {
      const duplicateCandidates = [candidate1.address, candidate1.address, candidate2.address] // duplicate

      await expect(
        elections.createElection(
          'BOD Election 2025',
          'Annual Board of Directors Election',
          startDate,
          endDate,
          3,
          duplicateCandidates,
          eligibleVoters
        )
      ).to.be.revertedWithCustomError(elections, 'DuplicateCandidates')
    })

    it('Should revert with empty voter list', async function () {
      await expect(
        elections.createElection(
          'BOD Election 2025',
          'Annual Board of Directors Election',
          startDate,
          endDate,
          3,
          candidates,
          [] // empty voters
        )
      ).to.be.revertedWithCustomError(elections, 'NoEligibleVoters')
    })

    it('Should revert with duplicate voters', async function () {
      const duplicateVoters = [voter1.address, voter1.address, voter2.address]

      await expect(
        elections.createElection(
          'BOD Election 2025',
          'Annual Board of Directors Election',
          startDate,
          endDate,
          3,
          candidates,
          duplicateVoters
        )
      ).to.be.revertedWithCustomError(elections, 'DuplicateVoters')
    })

    it('Should only allow owner to create elections', async function () {
      await expect(
        elections
          .connect(voter1)
          .createElection(
            'BOD Election 2025',
            'Annual Board of Directors Election',
            startDate,
            endDate,
            3,
            candidates,
            eligibleVoters
          )
      ).to.be.revertedWithCustomError(elections, 'OwnableUnauthorizedAccount')
    })
  })

  describe('Voting', function () {
    let electionId: number
    let candidates: string[]

    beforeEach(async function () {
      candidates = [candidate1.address, candidate2.address, candidate3.address]
      const eligibleVoters = [voter1.address, voter2.address, voter3.address]

      const currentTime = await time.latest()
      const startDate = currentTime + 100
      const endDate = startDate + ONE_WEEK

      await elections.createElection(
        'BOD Election 2025',
        'Annual Board of Directors Election',
        startDate,
        endDate,
        3,
        candidates,
        eligibleVoters
      )
      electionId = 1
      await time.increaseTo(startDate + 50)
    })

    it('Should allow eligible voter to cast a valid vote', async function () {
      const tx = await elections.connect(voter1).castVote(electionId, candidate1.address)

      await expect(tx)
        .to.emit(elections, 'VoteSubmitted')
        .withArgs(electionId, voter1.address, candidate1.address)

      expect(await elections.hasVoted(electionId, voter1.address)).to.be.true
      expect(await elections.getVoteCount(electionId)).to.equal(1)
    })

    it('Should revert when non-eligible voter tries to vote', async function () {
      await expect(
        elections.connect(nonVoter).castVote(electionId, candidate1.address)
      ).to.be.revertedWithCustomError(elections, 'NotEligibleVoter')
    })

    it('Should revert when voter tries to vote twice', async function () {
      await elections.connect(voter1).castVote(electionId, candidate1.address)
      await expect(
        elections.connect(voter1).castVote(electionId, candidate2.address)
      ).to.be.revertedWithCustomError(elections, 'AlreadyVoted')
    })

    it('Should revert with invalid candidate in vote', async function () {
      await expect(
        elections.connect(voter1).castVote(electionId, nonVoter.address)
      ).to.be.revertedWithCustomError(elections, 'InvalidCandidate')
    })

    it('Should revert when election has not started', async function () {
      // Conclude the first election
      await time.increaseTo((await time.latest()) + ONE_WEEK + 100)
      await elections.publishResults(electionId)

      const currentTime = await time.latest()
      const futureStartDate = currentTime + ONE_DAY
      const futureEndDate = futureStartDate + ONE_WEEK

      await elections.createElection(
        'Future Election',
        'Future Desc',
        futureStartDate,
        futureEndDate,
        3,
        candidates,
        [voter1.address]
      )
      const futureElectionId = 2

      await expect(
        elections.connect(voter1).castVote(futureElectionId, candidate1.address)
      ).to.be.revertedWithCustomError(elections, 'ElectionNotActive')
    })

    it('Should revert when election has ended', async function () {
      // Conclude the first election
      await time.increaseTo((await time.latest()) + ONE_WEEK + 100)
      await elections.publishResults(electionId)

      const currentTime = await time.latest()
      const pastStartDate = currentTime + 100
      const pastEndDate = pastStartDate + 200

      await elections.createElection(
        'Past Election',
        'Past Desc',
        pastStartDate,
        pastEndDate,
        3,
        candidates,
        [voter1.address]
      )
      const pastElectionId = 2

      await time.increaseTo(pastEndDate + 100)
      await elections.publishResults(pastElectionId)

      await expect(
        elections.connect(voter1).castVote(pastElectionId, candidate1.address)
      ).to.be.revertedWithCustomError(elections, 'ElectionNotActive')
    })
  })

  describe('Results Publication', function () {
    let electionId: number
    let candidates: string[]

    beforeEach(async function () {
      candidates = [candidate1.address, candidate2.address, candidate3.address]
      const eligibleVoters = [voter1.address, voter2.address, voter3.address]
      const currentTime = await time.latest()
      const startDate = currentTime + 100
      const endDate = startDate + 200
      await elections.createElection(
        'BOD Election 2025',
        'Annual Board of Directors Election',
        startDate,
        endDate,
        1, // 1 seat for simple testing
        candidates,
        eligibleVoters
      )
      electionId = 1
      await time.increaseTo(endDate + 100)
    })

    it('Should publish results after election ends', async function () {
      const tx = await elections.publishResults(electionId)
      await expect(tx).to.emit(elections, 'ResultsPublished')
      const election = await elections.getElection(electionId)
      expect(election.resultsPublished).to.be.true
    })

    it('Should publish correct results with votes', async function () {
      // Conclude the first election
      await elections.publishResults(electionId)

      const currentTime = await time.latest()
      const activeStartDate = currentTime + 100
      const activeEndDate = activeStartDate + 200
      const seatCount = 1 // We want 1 winners

      await elections.createElection(
        'Active Election',
        'Active Election Description',
        activeStartDate,
        activeEndDate,
        seatCount,
        candidates,
        [voter1.address, voter2.address, voter3.address]
      )
      const activeElectionId = 2
      await time.increaseTo(activeStartDate + 50)

      // Vote tally:
      // Candidate 1: 2 votes (from voter1, voter2)
      // Candidate 2: 1 vote (from voter3)
      // Candidate 3: 0 votes
      await elections.connect(voter1).castVote(activeElectionId, candidate1.address)
      await elections.connect(voter2).castVote(activeElectionId, candidate1.address)
      await elections.connect(voter3).castVote(activeElectionId, candidate2.address)

      await time.increaseTo(activeEndDate + 100)
      await elections.publishResults(activeElectionId)

      const winners = await elections.getElectionWinners(activeElectionId)
      const results = await elections.getElectionResults(activeElectionId)

      expect(winners.length).to.equal(seatCount)
      expect(results.length).to.equal(seatCount)

      // C1 should be the first winner
      expect(winners).to.deep.equal([candidate1.address])
      expect(results).to.deep.equal([candidate1.address])

      // Check if the board of directors contract was updated
      const boardMembers = await boardOfDirectors.getBoardOfDirectors()
      expect(boardMembers).to.deep.equal([candidate1.address])
    })

    it('Should correctly sort winners when a new candidate displaces another (tests bubble-up)', async function () {
      // Conclude the first election
      await elections.publishResults(electionId)

      const fourCandidates = [
        candidate1.address,
        candidate2.address,
        candidate3.address,
        candidate4.address
      ]
      const moreVoters = await ethers.getSigners()
      const allVoters = [
        voter1.address,
        voter2.address,
        voter3.address,
        voter4.address,
        voter5.address,
        voter6.address,
        moreVoters[15].address,
        moreVoters[16].address,
        moreVoters[17].address,
        moreVoters[18].address
      ]

      const currentTime = await time.latest()
      const activeStartDate = currentTime + 100
      const activeEndDate = activeStartDate + 200
      const seatCount = 3 // 3 seats

      await elections.createElection(
        'Bubble Sort Test Election',
        'Test sorting logic',
        activeStartDate,
        activeEndDate,
        seatCount,
        fourCandidates,
        allVoters
      )
      const activeElectionId = 2
      await time.increaseTo(activeStartDate + 50)

      // --- Vote Tally ---
      // C4 gets 1 vote (from voter1)
      // C3 gets 2 votes (from voter2, voter3)
      // C2 gets 4 votes (from voter4, voter5, voter6)
      // C1 gets 3 votes (will displace C4 and bubble up past C3)

      // Setup initial state of top candidates [C2, C3, C4]
      await elections.connect(voter4).castVote(activeElectionId, candidate2.address)
      await elections.connect(voter5).castVote(activeElectionId, candidate2.address)
      await elections.connect(voter6).castVote(activeElectionId, candidate2.address)
      await elections.connect(voter2).castVote(activeElectionId, candidate3.address)
      await elections.connect(voter3).castVote(activeElectionId, candidate3.address)
      await elections.connect(voter1).castVote(activeElectionId, candidate4.address)

      // At this point, the vote counts are: C2=3, C3=2, C4=1. C1=0.
      // Now, have more voters vote to trigger the bubble-up logic.
      // We need more signers for this. Let's re-use.
      await elections.connect(moreVoters[15]).castVote(activeElectionId, candidate1.address)
      await elections.connect(moreVoters[16]).castVote(activeElectionId, candidate1.address)
      await elections.connect(moreVoters[17]).castVote(activeElectionId, candidate1.address) // C1 has 3 votes now
      await elections.connect(moreVoters[18]).castVote(activeElectionId, candidate2.address) // C2 has 4 votes now

      // Final Tally: C2(4), C1(3), C3(2), C4(1)

      await time.increaseTo(activeEndDate + 100)
      await elections.publishResults(activeElectionId)

      const winners = await elections.getElectionWinners(activeElectionId)

      // Expected order: C2 (4 votes), C1 (3 votes), C3 (2 votes)
      expect(winners).to.deep.equal([candidate2.address, candidate1.address, candidate3.address])
    })

    it('Should revert when trying to publish results for active election', async function () {
      await elections.publishResults(electionId)

      const currentTime = await time.latest()
      const activeStartDate = currentTime + 100
      const activeEndDate = activeStartDate + ONE_WEEK
      await elections.createElection(
        'Active Election',
        'Active Election Description',
        activeStartDate,
        activeEndDate,
        3,
        candidates,
        [voter1.address]
      )
      const activeElectionId = 2
      await time.increaseTo(activeStartDate + 100)
      await expect(elections.publishResults(activeElectionId)).to.be.revertedWithCustomError(
        elections,
        'ResultsNotReady'
      )
    })

    it('Should revert when trying to publish results twice', async function () {
      await elections.publishResults(electionId)
      await expect(elections.publishResults(electionId)).to.be.revertedWithCustomError(
        elections,
        'ResultsAlreadyPublished'
      )
    })

    it('Should only allow owner to publish results', async function () {
      await expect(
        elections.connect(voter1).publishResults(electionId)
      ).to.be.revertedWithCustomError(elections, 'OwnableUnauthorizedAccount')
    })
  })

  describe('Admin Functions', function () {
    it('Should pause the contract', async function () {
      await elections.pause()
      expect(await elections.paused()).to.be.true
    })

    it('Should unpause the contract', async function () {
      await elections.pause()
      await elections.unpause()
      expect(await elections.paused()).to.be.false
    })
  })

  describe('View Functions', function () {
    let electionId: number
    let startDate: number
    let candidates: string[]

    beforeEach(async function () {
      candidates = [candidate1.address, candidate2.address, candidate3.address]
      const eligibleVoters = [voter1.address, voter2.address, voter3.address]
      const currentTime = await time.latest()
      startDate = currentTime + ONE_DAY
      const endDate = startDate + ONE_WEEK
      await elections.createElection(
        'BOD Election 2025',
        'Annual Board of Directors Election',
        startDate,
        endDate,
        3,
        candidates,
        eligibleVoters
      )
      electionId = 1
    })

    it('Should return election candidates', async function () {
      const returnedCandidates = await elections.getElectionCandidates(electionId)
      expect(returnedCandidates).to.deep.equal(candidates)
    })

    it('Should return eligible voters', async function () {
      const returnedVoters = await elections.getElectionEligibleVoters(electionId)
      expect(returnedVoters).to.deep.equal([voter1.address, voter2.address, voter3.address])
    })

    it('Should check voter eligibility', async function () {
      expect(await elections.isEligibleVoter(electionId, voter1.address)).to.be.true
      expect(await elections.isEligibleVoter(electionId, nonVoter.address)).to.be.false
    })

    it('Should track voting status and voter choice', async function () {
      expect(await elections.hasVoted(electionId, voter1.address)).to.be.false
      await time.increaseTo(startDate + 50)
      await elections.connect(voter1).castVote(electionId, candidate2.address)
      expect(await elections.hasVoted(electionId, voter1.address)).to.be.true
      expect(await elections.getVoterChoice(electionId, voter1.address)).to.equal(
        candidate2.address
      )
    })

    it('Should revert for non-existent election', async function () {
      await expect(elections.getElection(999)).to.be.revertedWithCustomError(
        elections,
        'ElectionNotFound'
      )
    })
  })
})

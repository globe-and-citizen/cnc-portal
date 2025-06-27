import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { Elections, MockBoardOfDirectors } from '../typechain-types'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

describe.only('Elections', function () {
  let elections: Elections
  let boardOfDirectors: MockBoardOfDirectors
  let owner: HardhatEthersSigner
  let voter1: HardhatEthersSigner
  let voter2: HardhatEthersSigner
  let voter3: HardhatEthersSigner
  let candidate1: HardhatEthersSigner
  let candidate2: HardhatEthersSigner
  let candidate3: HardhatEthersSigner
  let nonVoter: HardhatEthersSigner

  const ONE_DAY = 24 * 60 * 60
  const ONE_WEEK = 7 * ONE_DAY

  beforeEach(async function () {
    ;[owner, voter1, voter2, voter3, candidate1, candidate2, candidate3, nonVoter] =
      await ethers.getSigners()

    const ElectionsFactory = await ethers.getContractFactory('Elections')
    elections = (await upgrades.deployBeacon(ElectionsFactory)) as unknown as Elections

    // Deploy beacon proxy
    const beaconProxy = await upgrades.deployBeaconProxy(elections, ElectionsFactory, [
      owner.address
    ])
    elections = ElectionsFactory.attach(beaconProxy.target) as unknown as Elections

    const BoardOfDirectorsFactory = await ethers.getContractFactory('MockBoardOfDirectors')
    boardOfDirectors = (await upgrades.deployBeacon(
      BoardOfDirectorsFactory
    )) as unknown as MockBoardOfDirectors

    // Deploy beacon proxy
    const bodBeaconProxy = await upgrades.deployBeaconProxy(
      boardOfDirectors,
      BoardOfDirectorsFactory
    )
    boardOfDirectors = BoardOfDirectorsFactory.attach(
      bodBeaconProxy.target
    ) as unknown as MockBoardOfDirectors

    await elections
      .connect(owner)
      .setBoardOfDirectorsContractAddress(await boardOfDirectors.getAddress())
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

      // Create election that starts in the future but we'll fast forward to make it active
      const currentTime = await time.latest()
      const startDate = currentTime + 100 // starts in 100 seconds
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

      // Fast forward time to make the election active
      await time.increaseTo(startDate + 50)
    })

    it('Should allow eligible voter to submit valid vote', async function () {
      const rankedCandidates = [candidate1.address, candidate2.address, candidate3.address]

      const tx = await elections.connect(voter1).submitRankOrderVote(electionId, rankedCandidates)

      await expect(tx).to.emit(elections, 'VoteSubmitted').withArgs(electionId, voter1.address)

      expect(await elections.hasVoted(electionId, voter1.address)).to.be.true
      expect(await elections.getVoteCount(electionId)).to.equal(1)
    })

    it('Should allow partial ranking', async function () {
      const rankedCandidates = [candidate2.address] // only rank one candidate

      await elections.connect(voter1).submitRankOrderVote(electionId, rankedCandidates)

      expect(await elections.hasVoted(electionId, voter1.address)).to.be.true
    })

    it('Should revert when non-eligible voter tries to vote', async function () {
      const rankedCandidates = [candidate1.address, candidate2.address]

      await expect(
        elections.connect(nonVoter).submitRankOrderVote(electionId, rankedCandidates)
      ).to.be.revertedWithCustomError(elections, 'NotEligibleVoter')
    })

    it('Should revert when voter tries to vote twice', async function () {
      const rankedCandidates = [candidate1.address, candidate2.address]

      await elections.connect(voter1).submitRankOrderVote(electionId, rankedCandidates)

      await expect(
        elections.connect(voter1).submitRankOrderVote(electionId, rankedCandidates)
      ).to.be.revertedWithCustomError(elections, 'AlreadyVoted')
    })

    it('Should revert with empty vote', async function () {
      await expect(
        elections.connect(voter1).submitRankOrderVote(electionId, [])
      ).to.be.revertedWith('Empty vote')
    })

    it('Should revert with duplicate candidates in vote', async function () {
      const rankedCandidates = [candidate1.address, candidate1.address] // duplicate

      await expect(
        elections.connect(voter1).submitRankOrderVote(electionId, rankedCandidates)
      ).to.be.revertedWith('Duplicate candidate in vote')
    })

    it('Should revert with invalid candidate in vote', async function () {
      const rankedCandidates = [nonVoter.address] // not a candidate

      await expect(
        elections.connect(voter1).submitRankOrderVote(electionId, rankedCandidates)
      ).to.be.revertedWith('Invalid candidate in vote')
    })

    it('Should revert when election has not started', async function () {
      // Create future election
      const currentTime = await time.latest()
      const futureStartDate = currentTime + ONE_DAY
      const futureEndDate = futureStartDate + ONE_WEEK

      await elections.createElection(
        'Future Election',
        'Future Election Description',
        futureStartDate,
        futureEndDate,
        3,
        candidates,
        [voter1.address]
      )

      const futureElectionId = 2
      const rankedCandidates = [candidate1.address]

      await expect(
        elections.connect(voter1).submitRankOrderVote(futureElectionId, rankedCandidates)
      ).to.be.revertedWithCustomError(elections, 'ElectionNotActive')
    })

    it('Should revert when election has ended', async function () {
      // Create past election - but we need to create it with future dates first, then advance time
      const currentTime = await time.latest()
      const pastStartDate = currentTime + 100
      const pastEndDate = pastStartDate + 200

      await elections.createElection(
        'Past Election',
        'Past Election Description',
        pastStartDate,
        pastEndDate,
        3,
        candidates,
        [voter1.address]
      )

      const pastElectionId = 2

      // Advance time past the election end
      await time.increaseTo(pastEndDate + 100)

      const rankedCandidates = [candidate1.address]

      await expect(
        elections.connect(voter1).submitRankOrderVote(pastElectionId, rankedCandidates)
      ).to.be.revertedWithCustomError(elections, 'ElectionNotActive')
    })
  })

  describe('Results Publication', function () {
    let electionId: number
    let candidates: string[]

    beforeEach(async function () {
      candidates = [candidate1.address, candidate2.address, candidate3.address]

      const eligibleVoters = [voter1.address, voter2.address, voter3.address]

      // Create election that starts in future but ends in past (we'll fast forward)
      const currentTime = await time.latest()
      const startDate = currentTime + 100
      const endDate = startDate + 200 // 200 seconds duration

      await elections.createElection(
        'BOD Election 2025',
        'Annual Board of Directors Election',
        startDate,
        endDate,
        1, // only 1 seat for simple testing
        candidates,
        eligibleVoters
      )

      electionId = 1

      // Fast forward time to end the election
      await time.increaseTo(endDate + 100)
    })

    it('Should publish results after election ends', async function () {
      const tx = await elections.publishResults(electionId)

      // Since there are no votes, winners array should be empty
      await expect(tx).to.emit(elections, 'ResultsPublished')

      const election = await elections.getElection(electionId)
      expect(election.resultsPublished).to.be.true
    })

    it('Should automatically to publish correct results with votes', async function () {
      // Create active election for voting
      const currentTime = await time.latest()
      const activeStartDate = currentTime + 100
      const activeEndDate = activeStartDate + 200

      await elections.createElection(
        'Active Election',
        'Active Election Description',
        activeStartDate,
        activeEndDate,
        1,
        candidates,
        [voter1.address, voter2.address, voter3.address]
      )

      const activeElectionId = 2

      // Make election active
      await time.increaseTo(activeStartDate + 50)

      // Submit votes with different rankings
      // voter1: candidate1 > candidate2 > candidate3
      // voter2: candidate2 > candidate1 > candidate3
      // voter3: candidate1 > candidate3 > candidate2

      await elections
        .connect(voter1)
        .submitRankOrderVote(activeElectionId, [
          candidate1.address,
          candidate2.address,
          candidate3.address
        ])
      await elections
        .connect(voter2)
        .submitRankOrderVote(activeElectionId, [
          candidate2.address,
          candidate1.address,
          candidate3.address
        ])
      await elections
        .connect(voter3)
        .submitRankOrderVote(activeElectionId, [
          candidate1.address,
          candidate3.address,
          candidate2.address
        ])

      // Fast forward time to end the election
      await time.increaseTo(activeEndDate + 100)

      await elections.publishResults(activeElectionId)

      const results = await elections.getElectionResults(activeElectionId)
      const winners = await elections.getElectionWinners(activeElectionId)
      expect(results.length).to.equal(3)

      // candidate1 should win with most points: 3+2+3 = 8 points
      expect(results[0].candidateAddress).to.equal(candidate1.address)
      expect(results[0].isWinner).to.be.true
      expect(results[0].rank).to.equal(1)
      expect(winners.length).to.equal(1)
      expect(winners).to.include(candidate1.address)
    })

    it('Should revert when trying to publish results for active election', async function () {
      // Create active election
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

      // Make it active but not ended
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
    let endDate: number
    let candidates: string[]

    beforeEach(async function () {
      candidates = [candidate1.address, candidate2.address, candidate3.address]

      const eligibleVoters = [voter1.address, voter2.address, voter3.address]

      const currentTime = await time.latest()
      startDate = currentTime + ONE_DAY
      endDate = startDate + ONE_WEEK

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

      expect(returnedCandidates.length).to.equal(3)
      expect(returnedCandidates[0]).to.equal(candidate1.address)
      expect(returnedCandidates[1]).to.equal(candidate2.address)
      expect(returnedCandidates[2]).to.equal(candidate3.address)
    })

    it('Should return eligible voters', async function () {
      const returnedVoters = await elections.getElectionEligibleVoters(electionId)

      expect(returnedVoters.length).to.equal(3)
      expect(returnedVoters[0]).to.equal(voter1.address)
    })

    it('Should check voter eligibility', async function () {
      expect(await elections.isEligibleVoter(electionId, voter1.address)).to.be.true
      expect(await elections.isEligibleVoter(electionId, nonVoter.address)).to.be.false
    })

    it('Should track voting status', async function () {
      expect(await elections.hasVoted(electionId, voter1.address)).to.be.false

      // Make election active and vote
      await time.increaseTo(startDate + 50)

      await elections.connect(voter1).submitRankOrderVote(electionId, [candidate1.address])

      expect(await elections.hasVoted(electionId, voter1.address)).to.be.true
    })

    it('Should revert for non-existent election', async function () {
      await expect(elections.getElection(999)).to.be.revertedWithCustomError(
        elections,
        'ElectionNotFound'
      )
    })
  })
})

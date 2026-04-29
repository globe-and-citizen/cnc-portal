import { expect } from 'chai'
import { ethers } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { Elections } from '../typechain-types'

describe('Elections', function () {
  async function deployFixture() {
    const [owner, voter1, voter2, candidate1, candidate2, nonVoter] = await ethers.getSigners()

    const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
    const mockOfficer = await MockOfficerFactory.deploy()

    const BoardFactory = await ethers.getContractFactory('MockBoardOfDirectors')
    const boardOfDirectors = await BoardFactory.deploy()

    // Deploy Elections behind a beacon proxy. The implementation's constructor calls
    // `_disableInitializers()`, so `initialize` can only run in the context of a proxy.
    // Spawning the proxy through MockOfficer ensures the Elections proxy records
    // `officerAddress = mockOfficer`.
    const ElectionsFactory = await ethers.getContractFactory('Elections')
    const electionsImpl = await ElectionsFactory.deploy()
    const BeaconFactory = await ethers.getContractFactory('Beacon')
    const electionsBeacon = await BeaconFactory.deploy(await electionsImpl.getAddress())
    const initData = electionsImpl.interface.encodeFunctionData('initialize', [owner.address])
    const tx = await mockOfficer.deployBeaconProxy(
      await electionsBeacon.getAddress(),
      initData,
      'Elections'
    )
    await tx.wait()
    const electionsProxyAddress = await mockOfficer.findDeployedContract('Elections')
    const elections = (await ethers.getContractAt(
      'Elections',
      electionsProxyAddress
    )) as unknown as Elections

    await mockOfficer.setDeployedContract('BoardOfDirectors', await boardOfDirectors.getAddress())

    return { elections, boardOfDirectors, owner, voter1, voter2, candidate1, candidate2, nonVoter }
  }

  async function createActiveElection(
    elections: Elections,
    owner: HardhatEthersSigner,
    candidate1: string,
    candidate2: string,
    voter1: string,
    voter2: string
  ) {
    const now = await time.latest()
    const startDate = now + 100
    const endDate = startDate + 7 * 24 * 60 * 60

    await elections
      .connect(owner)
      .createElection(
        'Board Election',
        'Select board member',
        startDate,
        endDate,
        1,
        [candidate1, candidate2],
        [voter1, voter2]
      )

    await time.increase(101)

    return { electionId: 1 }
  }

  it('sets owner and starts election IDs from 1', async () => {
    const { elections, owner } = await deployFixture()
    expect(await elections.owner()).to.equal(owner.address)
    expect(await elections.getNextElectionId()).to.equal(1)
  })

  it('creates elections with valid params', async () => {
    const { elections, owner, candidate1, candidate2, voter1, voter2 } = await deployFixture()
    const now = await time.latest()

    await expect(
      elections
        .connect(owner)
        .createElection(
          'Board Election',
          'Select board member',
          now + 100,
          now + 7 * 24 * 60 * 60 + 100,
          1,
          [candidate1.address, candidate2.address],
          [voter1.address, voter2.address]
        )
    ).to.emit(elections, 'ElectionCreated')
  })

  it('allows eligible voters to cast votes and blocks non-voters', async () => {
    const { elections, owner, voter1, candidate1, candidate2, voter2, nonVoter } =
      await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    await expect(elections.connect(voter1).castVote(1, candidate1.address))
      .to.emit(elections, 'VoteSubmitted')
      .withArgs(1, voter1.address, candidate1.address)

    await expect(
      elections.connect(nonVoter).castVote(1, candidate1.address)
    ).to.be.revertedWithCustomError(elections, 'NotEligibleVoter')
  })

  it('publishes results and updates board winners', async () => {
    const { elections, boardOfDirectors, owner, voter1, voter2, candidate1, candidate2 } =
      await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    await elections.connect(voter1).castVote(1, candidate1.address)
    await elections.connect(voter2).castVote(1, candidate1.address)

    await expect(elections.connect(owner).publishResults(1))
      .to.emit(elections, 'ResultsPublished')
      .withArgs(1, [candidate1.address])

    const winners = await boardOfDirectors.getBoardOfDirectors()
    expect(winners).to.deep.equal([candidate1.address])
  })

  it('pause and unpause by owner', async () => {
    const { elections, owner } = await deployFixture()

    await elections.connect(owner).pause()
    expect(await elections.paused()).to.equal(true)

    await elections.connect(owner).unpause()
    expect(await elections.paused()).to.equal(false)
  })

  it('rejects createElection with even seat count', async () => {
    const { elections, owner, candidate1, candidate2, voter1 } = await deployFixture()

    const now = await time.latest()

    await expect(
      elections.connect(owner).createElection(
        'Invalid',
        'Even seat count',
        now + 100,
        now + 7 * 24 * 60 * 60 + 100,
        2, // even - invalid
        [candidate1.address, candidate2.address],
        [voter1.address]
      )
    ).to.be.revertedWithCustomError(elections, 'InvalidSeatCount')
  })

  it('rejects createElection with invalid dates (start in past)', async () => {
    const { elections, owner, candidate1, candidate2, voter1 } = await deployFixture()

    const now = await time.latest()

    await expect(
      elections.connect(owner).createElection(
        'Invalid',
        'Past start date',
        now - 100, // in the past
        now + 7 * 24 * 60 * 60,
        1,
        [candidate1.address, candidate2.address],
        [voter1.address]
      )
    ).to.be.revertedWithCustomError(elections, 'InvalidDates')
  })

  it('rejects createElection with end before start', async () => {
    const { elections, owner, candidate1, candidate2, voter1 } = await deployFixture()

    const now = await time.latest()

    await expect(
      elections.connect(owner).createElection(
        'Invalid',
        'End before start',
        now + 200,
        now + 100, // end before start
        1,
        [candidate1.address, candidate2.address],
        [voter1.address]
      )
    ).to.be.revertedWithCustomError(elections, 'InvalidDates')
  })

  it('rejects createElection with duplicate candidates', async () => {
    const { elections, owner, candidate1, voter1 } = await deployFixture()

    const now = await time.latest()

    await expect(
      elections.connect(owner).createElection(
        'Invalid',
        'Duplicate candidates',
        now + 100,
        now + 7 * 24 * 60 * 60 + 100,
        1,
        [candidate1.address, candidate1.address], // duplicate
        [voter1.address]
      )
    ).to.be.revertedWithCustomError(elections, 'DuplicateCandidates')
  })

  it('rejects createElection with duplicate voters', async () => {
    const { elections, owner, candidate1, candidate2, voter1 } = await deployFixture()

    const now = await time.latest()

    await expect(
      elections.connect(owner).createElection(
        'Invalid',
        'Duplicate voters',
        now + 100,
        now + 7 * 24 * 60 * 60 + 100,
        1,
        [candidate1.address, candidate2.address],
        [voter1.address, voter1.address] // duplicate
      )
    ).to.be.revertedWithCustomError(elections, 'DuplicateVoters')
  })

  it('rejects createElection when a previous election is ongoing', async () => {
    const { elections, owner, candidate1, candidate2, voter1, voter2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    const now = await time.latest()

    await expect(
      elections
        .connect(owner)
        .createElection(
          'Second Election',
          'Should fail',
          now + 100,
          now + 7 * 24 * 60 * 60 + 100,
          1,
          [candidate1.address, candidate2.address],
          [voter1.address, voter2.address]
        )
    ).to.be.revertedWithCustomError(elections, 'ElectionIsOngoing')
  })

  it('rejects castVote when already voted', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    await elections.connect(voter1).castVote(1, candidate1.address)

    await expect(
      elections.connect(voter1).castVote(1, candidate1.address)
    ).to.be.revertedWithCustomError(elections, 'AlreadyVoted')
  })

  it('rejects castVote before election starts', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    const now = await time.latest()
    const startDate = now + 1000
    const endDate = startDate + 7 * 24 * 60 * 60

    await elections
      .connect(owner)
      .createElection(
        'Future Election',
        'Not started yet',
        startDate,
        endDate,
        1,
        [candidate1.address, candidate2.address],
        [voter1.address, voter2.address]
      )

    // Do not advance time - election hasn't started
    await expect(
      elections.connect(voter1).castVote(1, candidate1.address)
    ).to.be.revertedWithCustomError(elections, 'ElectionNotActive')
  })

  it('rejects publishResults before election ends and not all voted', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    // Only 1 of 2 voters voted, and time hasn't passed
    await elections.connect(voter1).castVote(1, candidate1.address)

    await expect(elections.connect(owner).publishResults(1)).to.be.revertedWithCustomError(
      elections,
      'ResultsNotReady'
    )
  })

  it('allows publishResults after all voters have voted (before end)', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    await elections.connect(voter1).castVote(1, candidate1.address)
    await elections.connect(voter2).castVote(1, candidate2.address)

    // All voters voted, can publish even before end
    await expect(elections.connect(owner).publishResults(1)).to.emit(elections, 'ResultsPublished')
  })

  it('allows publishResults after election has ended (not all voted)', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    const now = await time.latest()
    const startDate = now + 100
    const endDate = startDate + 60 // short duration

    await elections
      .connect(owner)
      .createElection(
        'Short Election',
        'Ends quickly',
        startDate,
        endDate,
        1,
        [candidate1.address, candidate2.address],
        [voter1.address, voter2.address]
      )

    await time.increase(101)

    await elections.connect(voter1).castVote(1, candidate1.address)
    // voter2 doesn't vote

    await time.increase(61) // advance past end

    await expect(elections.connect(owner).publishResults(1)).to.emit(elections, 'ResultsPublished')
  })

  it('rejects publishResults if already published', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    await elections.connect(voter1).castVote(1, candidate1.address)
    await elections.connect(voter2).castVote(1, candidate1.address)

    await elections.connect(owner).publishResults(1)

    await expect(elections.connect(owner).publishResults(1)).to.be.revertedWithCustomError(
      elections,
      'ResultsAlreadyPublished'
    )
  })

  it('rejects publishResults for non-existent election', async () => {
    const { elections, owner } = await deployFixture()

    await expect(elections.connect(owner).publishResults(99)).to.be.revertedWithCustomError(
      elections,
      'ElectionNotFound'
    )
  })

  it('getElection returns correct election data', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    const now = await time.latest()
    const startDate = now + 100
    const endDate = startDate + 7 * 24 * 60 * 60

    await elections
      .connect(owner)
      .createElection(
        'My Election',
        'A description',
        startDate,
        endDate,
        1,
        [candidate1.address, candidate2.address],
        [voter1.address, voter2.address]
      )

    const [id, title, description, , , , seatCount, resultsPublished] =
      await elections.getElection(1)

    expect(id).to.equal(1)
    expect(title).to.equal('My Election')
    expect(description).to.equal('A description')
    expect(seatCount).to.equal(1)
    expect(resultsPublished).to.equal(false)
  })

  it('getElection reverts for non-existent election', async () => {
    const { elections } = await deployFixture()

    await expect(elections.getElection(99)).to.be.revertedWithCustomError(
      elections,
      'ElectionNotFound'
    )
  })

  it('getElectionCandidates returns candidates', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    const candidates = await elections.getElectionCandidates(1)
    expect(candidates).to.include(candidate1.address)
    expect(candidates).to.include(candidate2.address)
  })

  it('getElectionEligibleVoters returns voters', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    const voters = await elections.getElectionEligibleVoters(1)
    expect(voters).to.include(voter1.address)
    expect(voters).to.include(voter2.address)
  })

  it('getElectionWinners reverts before results published', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    await expect(elections.getElectionWinners(1)).to.be.revertedWithCustomError(
      elections,
      'ResultsNotReady'
    )
  })

  it('getElectionWinners returns winners after publish', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    await elections.connect(voter1).castVote(1, candidate1.address)
    await elections.connect(voter2).castVote(1, candidate1.address)
    await elections.connect(owner).publishResults(1)

    const winners = await elections.getElectionWinners(1)
    expect(winners).to.include(candidate1.address)
  })

  it('getVoterChoice returns chosen candidate', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    await elections.connect(voter1).castVote(1, candidate1.address)

    expect(await elections.getVoterChoice(1, voter1.address)).to.equal(candidate1.address)
  })

  it('hasVoted returns correct status', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    expect(await elections.hasVoted(1, voter1.address)).to.equal(false)

    await elections.connect(voter1).castVote(1, candidate1.address)

    expect(await elections.hasVoted(1, voter1.address)).to.equal(true)
  })

  it('isEligibleVoter returns correct status', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2, nonVoter } =
      await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    expect(await elections.isEligibleVoter(1, voter1.address)).to.equal(true)
    expect(await elections.isEligibleVoter(1, nonVoter.address)).to.equal(false)
  })

  it('getVoteCount returns current vote count', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    expect(await elections.getVoteCount(1)).to.equal(0)

    await elections.connect(voter1).castVote(1, candidate1.address)

    expect(await elections.getVoteCount(1)).to.equal(1)
  })

  it('getElectionResults handles tie-breaking by address comparison', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    // voter1 votes candidate1, voter2 votes candidate2 → tie
    await elections.connect(voter1).castVote(1, candidate1.address)
    await elections.connect(voter2).castVote(1, candidate2.address)

    const results = await elections.getElectionResults(1)
    expect(results.length).to.equal(1) // seatCount = 1
    // The winner should be deterministic (lower address wins tie-breaking)
    const expectedWinner =
      candidate1.address.toLowerCase() < candidate2.address.toLowerCase()
        ? candidate1.address
        : candidate2.address
    expect(results[0].toLowerCase()).to.equal(expectedWinner.toLowerCase())
  })

  it('rejects view functions with non-existent election ID', async () => {
    const { elections, voter1 } = await deployFixture()

    await expect(elections.getElectionCandidates(99)).to.be.revertedWithCustomError(
      elections,
      'ElectionNotFound'
    )
    await expect(elections.getElectionEligibleVoters(99)).to.be.revertedWithCustomError(
      elections,
      'ElectionNotFound'
    )
    await expect(elections.getElectionWinners(99)).to.be.revertedWithCustomError(
      elections,
      'ElectionNotFound'
    )
    await expect(elections.getVoterChoice(99, voter1.address)).to.be.revertedWithCustomError(
      elections,
      'ElectionNotFound'
    )
    await expect(elections.hasVoted(99, voter1.address)).to.be.revertedWithCustomError(
      elections,
      'ElectionNotFound'
    )
    await expect(elections.isEligibleVoter(99, voter1.address)).to.be.revertedWithCustomError(
      elections,
      'ElectionNotFound'
    )
    await expect(elections.getVoteCount(99)).to.be.revertedWithCustomError(
      elections,
      'ElectionNotFound'
    )
  })

  it('rejects createElection when paused', async () => {
    const { elections, owner, candidate1, candidate2, voter1, voter2 } = await deployFixture()

    await elections.connect(owner).pause()

    const now = await time.latest()

    await expect(
      elections
        .connect(owner)
        .createElection(
          'Election',
          'desc',
          now + 100,
          now + 7 * 24 * 60 * 60 + 100,
          1,
          [candidate1.address, candidate2.address],
          [voter1.address, voter2.address]
        )
    ).to.be.reverted
  })

  it('rejects castVote when paused', async () => {
    const { elections, owner, voter1, voter2, candidate1, candidate2 } = await deployFixture()

    await createActiveElection(
      elections,
      owner,
      candidate1.address,
      candidate2.address,
      voter1.address,
      voter2.address
    )

    await elections.connect(owner).pause()

    await expect(elections.connect(voter1).castVote(1, candidate1.address)).to.be.reverted
  })
})

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

    const ElectionsFactory = await ethers.getContractFactory('Elections')
    const elections = await ElectionsFactory.deploy()

    await mockOfficer.setDeployedContract('BoardOfDirectors', await boardOfDirectors.getAddress())
    await mockOfficer.initializeUpgradeable(await elections.getAddress(), owner.address)

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
})

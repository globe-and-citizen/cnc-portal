import { ethers } from 'hardhat'
import { expect } from 'chai'
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'

const ONE_DAY_IN_SECS = 24 * 60 * 60

enum VoteOption {
  Yes,
  No,
  Abstain
}

enum ProposalState {
  Active,
  Succeeded,
  Defeated,
  Expired
}

describe('Proposals Contract', function () {
  async function deployContracts() {
    const [owner, boardMember1, boardMember2, boardMember3, nonMember] = await ethers.getSigners()

    const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
    const mockOfficer = await MockOfficerFactory.deploy()

    const BoardOfDirectorsMockFactory = await ethers.getContractFactory('MockBoardOfDirectors')
    const boardOfDirectorsMock = await BoardOfDirectorsMockFactory.deploy()
    await boardOfDirectorsMock.addMember(boardMember1.address)
    await boardOfDirectorsMock.addMember(boardMember2.address)
    await boardOfDirectorsMock.addMember(boardMember3.address)

    const ProposalsFactory = await ethers.getContractFactory('Proposals')
    const proposalsContract = await ProposalsFactory.deploy()

    await mockOfficer.setDeployedContract(
      'BoardOfDirectors',
      await boardOfDirectorsMock.getAddress()
    )
    await mockOfficer.initializeUpgradeable(await proposalsContract.getAddress(), owner.address)

    return {
      proposalsContract,
      boardOfDirectorsMock,
      owner,
      boardMember1,
      boardMember2,
      boardMember3,
      nonMember,
      mockOfficer
    }
  }

  it('sets owner and starts IDs from 1', async function () {
    const { proposalsContract, owner, boardMember1 } = await deployContracts()
    const now = await time.latest()

    expect(await proposalsContract.owner()).to.equal(owner.address)

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Test', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS)

    const proposal = await proposalsContract.getProposal(1)
    expect(proposal.id).to.equal(1)
  })

  it('allows only board members to create proposals', async function () {
    const { proposalsContract, boardMember1, nonMember } = await deployContracts()
    const now = await time.latest()

    await expect(
      proposalsContract
        .connect(boardMember1)
        .createProposal('Valid', 'Description', 'Policy', now + 1, now + ONE_DAY_IN_SECS)
    ).to.emit(proposalsContract, 'ProposalCreated')

    await expect(
      proposalsContract
        .connect(nonMember)
        .createProposal('Invalid', 'Description', 'Policy', now + 2, now + ONE_DAY_IN_SECS + 1)
    ).to.be.revertedWithCustomError(proposalsContract, 'OnlyBoardMember')
  })

  it('tracks voting and tallies to succeeded', async function () {
    const { proposalsContract, boardMember1, boardMember2, boardMember3 } = await deployContracts()
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Vote Test', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS + 1)

    await time.increase(2)

    await proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
    await proposalsContract.connect(boardMember2).castVote(1, VoteOption.Yes)
    await proposalsContract.connect(boardMember3).castVote(1, VoteOption.No)

    const proposal = await proposalsContract.getProposal(1)
    expect(proposal.voteCount).to.equal(3)
    expect(proposal.yesCount).to.equal(2)
    expect(proposal.noCount).to.equal(1)
    expect(proposal.state).to.equal(1) // Succeeded
  })

  it('returns board members through officer wiring', async function () {
    const { proposalsContract, boardMember1, boardMember2, boardMember3 } = await deployContracts()
    const members = await proposalsContract.getBoardOfDirectors()

    expect(members).to.have.lengthOf(3)
    expect(members).to.include(boardMember1.address)
    expect(members).to.include(boardMember2.address)
    expect(members).to.include(boardMember3.address)
  })

  it('reverts when board contract is not configured in officer', async function () {
    const [owner] = await ethers.getSigners()
    const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
    const mockOfficer = await MockOfficerFactory.deploy()

    const ProposalsFactory = await ethers.getContractFactory('Proposals')
    const proposalsContract = await ProposalsFactory.deploy()
    await mockOfficer.initializeUpgradeable(await proposalsContract.getAddress(), owner.address)

    const now = await time.latest()

    await expect(
      proposalsContract.createProposal('T', 'D', 'Type', now + 1, now + ONE_DAY_IN_SECS)
    ).to.be.revertedWithCustomError(proposalsContract, 'BoardOfDirectorsNotFound')
  })

  it('tallies to Defeated when No votes exceed Yes votes', async function () {
    const { proposalsContract, boardMember1, boardMember2, boardMember3 } =
      await loadFixture(deployContracts)
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Rejected', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS + 1)

    await time.increase(2)

    await proposalsContract.connect(boardMember1).castVote(1, VoteOption.No)
    await proposalsContract.connect(boardMember2).castVote(1, VoteOption.No)
    await proposalsContract.connect(boardMember3).castVote(1, VoteOption.Yes)

    const proposal = await proposalsContract.getProposal(1)
    expect(proposal.state).to.equal(ProposalState.Defeated)
    expect(proposal.noCount).to.equal(2)
    expect(proposal.yesCount).to.equal(1)
  })

  it('tallies to Expired on a tie (yes == no)', async function () {
    const { proposalsContract, boardMember1, boardMember2, boardMember3 } =
      await loadFixture(deployContracts)
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Tied', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS + 1)

    await time.increase(2)

    await proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
    await proposalsContract.connect(boardMember2).castVote(1, VoteOption.No)
    await proposalsContract.connect(boardMember3).castVote(1, VoteOption.Abstain)

    const proposal = await proposalsContract.getProposal(1)
    expect(proposal.state).to.equal(ProposalState.Expired)
    expect(proposal.yesCount).to.equal(1)
    expect(proposal.noCount).to.equal(1)
    expect(proposal.abstainCount).to.equal(1)
  })

  it('emits ProposalVoted with the correct arguments', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Emit Test', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS + 1)

    await time.increase(2)

    const tx = await proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
    const receipt = await tx.wait()
    const blk = await ethers.provider.getBlock(receipt!.blockNumber)

    await expect(tx)
      .to.emit(proposalsContract, 'ProposalVoted')
      .withArgs(1, boardMember1.address, VoteOption.Yes, blk!.timestamp)
  })

  it('emits ProposalTallyResults when the last member votes', async function () {
    const { proposalsContract, boardMember1, boardMember2, boardMember3 } =
      await loadFixture(deployContracts)
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Auto Tally', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS + 1)

    await time.increase(2)

    await proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
    await proposalsContract.connect(boardMember2).castVote(1, VoteOption.Yes)

    await expect(proposalsContract.connect(boardMember3).castVote(1, VoteOption.No))
      .to.emit(proposalsContract, 'ProposalTallyResults')
      .withArgs(1, ProposalState.Succeeded, 2, 1, 0)
  })

  it('rejects castVote before voting has started', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Future', 'Description', 'Budget', now + 1000, now + ONE_DAY_IN_SECS + 1000)

    // Do not advance time
    await expect(
      proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
    ).to.be.revertedWithCustomError(proposalsContract, 'ProposalVotingNotStarted')
  })

  it('rejects castVote after the voting period has ended', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()
    const startDate = now + 5
    const endDate = startDate + 60

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Expired', 'Description', 'Budget', startDate, endDate)

    await time.increaseTo(endDate + 10)

    await expect(
      proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
    ).to.be.revertedWithCustomError(proposalsContract, 'ProposalVotingEnded')
  })

  it('rejects duplicate votes from the same member', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('No Double', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS + 1)

    await time.increase(2)

    await proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
    await expect(
      proposalsContract.connect(boardMember1).castVote(1, VoteOption.No)
    ).to.be.revertedWithCustomError(proposalsContract, 'ProposalAlreadyVoted')
  })

  it('rejects castVote on a non-existent proposal', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)

    await expect(
      proposalsContract.connect(boardMember1).castVote(999, VoteOption.Yes)
    ).to.be.revertedWithCustomError(proposalsContract, 'ProposalNotFound')
  })

  it('rejects castVote from a non board member', async function () {
    const { proposalsContract, boardMember1, nonMember } = await loadFixture(deployContracts)
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Members Only', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS + 1)

    await time.increase(2)

    await expect(
      proposalsContract.connect(nonMember).castVote(1, VoteOption.Yes)
    ).to.be.revertedWithCustomError(proposalsContract, 'OnlyBoardMember')
  })

  it('rejects createProposal with empty title', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()

    await expect(
      proposalsContract
        .connect(boardMember1)
        .createProposal('', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS)
    ).to.be.revertedWithCustomError(proposalsContract, 'InvalidProposalContent')
  })

  it('rejects createProposal with empty description', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()

    await expect(
      proposalsContract
        .connect(boardMember1)
        .createProposal('Title', '', 'Budget', now + 1, now + ONE_DAY_IN_SECS)
    ).to.be.revertedWithCustomError(proposalsContract, 'InvalidProposalContent')
  })

  it('rejects createProposal with title too long', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()

    const longTitle = 'a'.repeat(101)
    await expect(
      proposalsContract
        .connect(boardMember1)
        .createProposal(longTitle, 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS)
    ).to.be.revertedWithCustomError(proposalsContract, 'InvalidProposalContent')
  })

  it('rejects createProposal with invalid dates (start >= end)', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()

    await expect(
      proposalsContract
        .connect(boardMember1)
        .createProposal('Title', 'Description', 'Budget', now + 1000, now + 500)
    ).to.be.revertedWithCustomError(proposalsContract, 'InvalidProposalDates')
  })

  it('rejects createProposal with start date in the past', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()

    await expect(
      proposalsContract
        .connect(boardMember1)
        .createProposal('Title', 'Description', 'Budget', now - 100, now + ONE_DAY_IN_SECS)
    ).to.be.revertedWithCustomError(proposalsContract, 'InvalidProposalDates')
  })

  it('rejects createProposal with zero dates', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)

    await expect(
      proposalsContract.connect(boardMember1).createProposal('Title', 'Description', 'Budget', 0, 0)
    ).to.be.revertedWithCustomError(proposalsContract, 'InvalidProposalDates')
  })

  it('getProposal reverts for non-existent proposal', async function () {
    const { proposalsContract } = await loadFixture(deployContracts)

    await expect(proposalsContract.getProposal(999)).to.be.revertedWithCustomError(
      proposalsContract,
      'ProposalNotFound'
    )
  })

  it('hasVoted reflects vote status and reverts for unknown proposal', async function () {
    const { proposalsContract, boardMember1, boardMember2 } = await loadFixture(deployContracts)
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Track', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS + 1)

    await time.increase(2)

    expect(await proposalsContract.hasVoted(1, boardMember1.address)).to.equal(false)
    await proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
    expect(await proposalsContract.hasVoted(1, boardMember1.address)).to.equal(true)
    expect(await proposalsContract.hasVoted(1, boardMember2.address)).to.equal(false)

    await expect(
      proposalsContract.hasVoted(999, boardMember1.address)
    ).to.be.revertedWithCustomError(proposalsContract, 'ProposalNotFound')
  })

  it('tallyResults can be called manually by a board member and reverts for non-member', async function () {
    const { proposalsContract, boardMember1, boardMember2, nonMember } =
      await loadFixture(deployContracts)
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Manual Tally', 'Description', 'Budget', now + 1, now + ONE_DAY_IN_SECS + 1)

    await time.increase(2)

    await proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
    await proposalsContract.connect(boardMember2).castVote(1, VoteOption.No)

    // Non-member cannot tally
    await expect(
      proposalsContract.connect(nonMember).tallyResults(1)
    ).to.be.revertedWithCustomError(proposalsContract, 'OnlyBoardMember')

    // Board member can tally manually (yes == no -> Expired)
    await expect(proposalsContract.connect(boardMember1).tallyResults(1)).to.emit(
      proposalsContract,
      'ProposalTallyResults'
    )

    const proposal = await proposalsContract.getProposal(1)
    expect(proposal.state).to.equal(ProposalState.Expired)
  })

  it('tallyResults reverts for non-existent proposal', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)

    await expect(
      proposalsContract.connect(boardMember1).tallyResults(999)
    ).to.be.revertedWithCustomError(proposalsContract, 'ProposalNotFound')
  })

  it('tallyResults reverts before voting has started', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()

    await proposalsContract
      .connect(boardMember1)
      .createProposal('Not yet', 'Description', 'Budget', now + 1000, now + ONE_DAY_IN_SECS + 1000)

    await expect(
      proposalsContract.connect(boardMember1).tallyResults(1)
    ).to.be.revertedWithCustomError(proposalsContract, 'ProposalVotingNotStarted')
  })

  it('emits ProposalCreated with the expected arguments', async function () {
    const { proposalsContract, boardMember1 } = await loadFixture(deployContracts)
    const now = await time.latest()
    const startDate = now + 10
    const endDate = now + ONE_DAY_IN_SECS

    await expect(
      proposalsContract
        .connect(boardMember1)
        .createProposal('Created', 'Description', 'Policy', startDate, endDate)
    )
      .to.emit(proposalsContract, 'ProposalCreated')
      .withArgs(1, 'Created', boardMember1.address, startDate, endDate)
  })
})

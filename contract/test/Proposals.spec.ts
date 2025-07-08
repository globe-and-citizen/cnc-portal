import { ethers } from 'hardhat'
import { expect } from 'chai'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { Proposals } from '../typechain-types'

// --- Constants ---
const ONE_DAY_IN_SECS = 24 * 60 * 60

// --- Enums ---
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
  // --- Test Fixture ---
  async function deployContracts() {
    // --- Get Signers ---
    const [owner, boardMember1, boardMember2, boardMember3, nonMember] = await ethers.getSigners()

    // --- Deploy Mocks ---
    const BoardOfDirectorsMockFactory = await ethers.getContractFactory('MockBoardOfDirectors')
    const boardOfDirectorsMock = await BoardOfDirectorsMockFactory.deploy()

    // --- Add Members to Mock ---
    await boardOfDirectorsMock.addMember(boardMember1.address)
    await boardOfDirectorsMock.addMember(boardMember2.address)
    await boardOfDirectorsMock.addMember(boardMember3.address)

    // --- Deploy Proposals Contract ---
    const ProposalsFactory = await ethers.getContractFactory('Proposals')
    const proposalsContract = await (await ProposalsFactory.deploy()).waitForDeployment()
    await proposalsContract.initialize(owner.address)

    // --- Set Board of Directors Address ---
    await proposalsContract.setBoardOfDirectorsContractAddress(
      await boardOfDirectorsMock.getAddress()
    )

    return {
      proposalsContract,
      boardOfDirectorsMock,
      owner,
      boardMember1,
      boardMember2,
      boardMember3,
      nonMember
    }
  }

  describe('Deployment and Initialization', function () {
    it('Should set the right owner', async function () {
      const { proposalsContract, owner } = await deployContracts()
      expect(await proposalsContract.owner()).to.equal(owner.address)
    })

    it('Should start with proposal ID 1', async function () {
      const { proposalsContract, boardMember1 } = await deployContracts()
      const now = await time.latest()
      await proposalsContract
        .connect(boardMember1)
        .createProposal(
          'Test Title',
          'Test Description',
          'Budget',
          now + ONE_DAY_IN_SECS,
          now + 2 * ONE_DAY_IN_SECS
        )
      const proposal = await proposalsContract.getProposal(1)
      expect(proposal.id).to.equal(1)
    })
  })

  describe('Proposal Creation', function () {
    it('Should allow a board member to create a proposal', async function () {
      const { proposalsContract, boardMember1 } = await deployContracts()
      const now = await time.latest()
      const startDate = now + ONE_DAY_IN_SECS
      const endDate = now + 2 * ONE_DAY_IN_SECS

      await expect(
        proposalsContract
          .connect(boardMember1)
          .createProposal('Test Proposal', 'A description', 'Budget', startDate, endDate)
      )
        .to.emit(proposalsContract, 'ProposalCreated')
        .withArgs(1, 'Test Proposal', boardMember1.address, startDate, endDate)
    })

    it('Should revert if a non-board member tries to create a proposal', async function () {
      const { proposalsContract, nonMember } = await deployContracts()
      const now = await time.latest()
      await expect(
        proposalsContract
          .connect(nonMember)
          .createProposal('Invalid Proposal', '...', 'Financial', now + 1, now + 2)
      ).to.be.revertedWithCustomError(proposalsContract, 'OnlyBoardMember')
    })

    it('Should revert if title more than 100 characters', async function () {
      const { proposalsContract, boardMember1 } = await deployContracts()
      const now = await time.latest()
      const longTitle = 'T'.repeat(101) // 101 characters
      await expect(
        proposalsContract
          .connect(boardMember1)
          .createProposal(longTitle, 'Description', 'Technical', now + 1, now + 2)
      ).to.be.revertedWithCustomError(proposalsContract, 'InvalidProposalContent')
    })

    it('Should revert with invalid dates (start >= end)', async function () {
      const { proposalsContract, boardMember1 } = await deployContracts()
      const now = await time.latest()
      await expect(
        proposalsContract
          .connect(boardMember1)
          .createProposal('Title', 'Desc', 'Technical', now + 2, now + 1)
      ).to.be.revertedWithCustomError(proposalsContract, 'InvalidProposalDates')
    })

    it('Should revert with invalid dates (start in the past)', async function () {
      const { proposalsContract, boardMember1 } = await deployContracts()
      const now = await time.latest()
      await expect(
        proposalsContract
          .connect(boardMember1)
          .createProposal('Title', 'Desc', 'Technical', now - 1, now + 1)
      ).to.be.revertedWithCustomError(proposalsContract, 'InvalidProposalDates')
    })

    it('Should revert with invalid content (empty title)', async function () {
      const { proposalsContract, boardMember1 } = await deployContracts()
      const now = await time.latest()
      await expect(
        proposalsContract
          .connect(boardMember1)
          .createProposal('', 'Description', 'Technical', now + 1, now + 2)
      ).to.be.revertedWithCustomError(proposalsContract, 'InvalidProposalContent')
    })
  })

  describe('Voting', function () {
    let proposalsContract: Proposals
    let boardMember1: HardhatEthersSigner,
      boardMember2: HardhatEthersSigner,
      boardMember3: HardhatEthersSigner
    let proposalId: number

    beforeEach(async function () {
      const deployed = await deployContracts()
      proposalsContract = deployed.proposalsContract
      boardMember1 = deployed.boardMember1
      boardMember2 = deployed.boardMember2
      boardMember3 = deployed.boardMember3

      const now = await time.latest()
      await proposalsContract
        .connect(boardMember1)
        .createProposal(
          'Voting Test',
          'Desc',
          'Technical',
          now + ONE_DAY_IN_SECS,
          now + 3 * ONE_DAY_IN_SECS
        )
      proposalId = 1
      await time.increase(ONE_DAY_IN_SECS + 1) // Move time forward to voting period
    })

    it("Should allow a board member to cast a 'Yes' vote", async function () {
      await expect(proposalsContract.connect(boardMember1).castVote(proposalId, VoteOption.Yes))
        .to.emit(proposalsContract, 'ProposalVoted')
        .withArgs(
          proposalId,
          boardMember1.address,
          VoteOption.Yes,
          (value: bigint) => typeof value === 'bigint'
        )

      const proposal = await proposalsContract.getProposal(proposalId)
      expect(proposal.yesCount).to.equal(1)
      expect(proposal.voteCount).to.equal(1)
    })

    it("Should allow a board member to cast a 'No' vote", async function () {
      await proposalsContract.connect(boardMember2).castVote(proposalId, VoteOption.No)
      const proposal = await proposalsContract.getProposal(proposalId)
      expect(proposal.noCount).to.equal(1)
    })

    it('Should allow a board member to cast an "Abstain" vote', async function () {
      await proposalsContract.connect(boardMember3).castVote(proposalId, VoteOption.Abstain)
      const proposal = await proposalsContract.getProposal(proposalId)
      expect(proposal.abstainCount).to.equal(1)
    })

    it("Should revert if trying to vote on a proposal that doesn't exist", async function () {
      await expect(
        proposalsContract.connect(boardMember1).castVote(999, VoteOption.Yes)
      ).to.be.revertedWithCustomError(proposalsContract, 'ProposalNotFound')
    })

    it('Should revert if voting before the start date', async function () {
      const { proposalsContract, boardMember1 } = await deployContracts()
      const now = await time.latest()
      await proposalsContract
        .connect(boardMember1)
        .createProposal(
          'Future Vote',
          'Desc',
          'Technical',
          now + 5 * ONE_DAY_IN_SECS,
          now + 6 * ONE_DAY_IN_SECS
        )
      await expect(
        proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
      ).to.be.revertedWithCustomError(proposalsContract, 'ProposalVotingNotStarted')
    })

    it('Should revert if voting after the end date', async function () {
      await time.increase(3 * ONE_DAY_IN_SECS) // Move time past the end date
      await expect(
        proposalsContract.connect(boardMember1).castVote(proposalId, VoteOption.Yes)
      ).to.be.revertedWithCustomError(proposalsContract, 'ProposalVotingEnded')
    })

    it('Should revert if a member tries to vote twice', async function () {
      await proposalsContract.connect(boardMember1).castVote(proposalId, VoteOption.Yes)
      await expect(
        proposalsContract.connect(boardMember1).castVote(proposalId, VoteOption.Yes)
      ).to.be.revertedWithCustomError(proposalsContract, 'ProposalAlreadyVoted')
    })
  })

  describe('Tallying Results', function () {
    let proposalsContract: Proposals
    let boardMember1: HardhatEthersSigner,
      boardMember2: HardhatEthersSigner,
      boardMember3: HardhatEthersSigner
    let proposalId: number

    beforeEach(async function () {
      const deployed = await deployContracts()
      proposalsContract = deployed.proposalsContract
      boardMember1 = deployed.boardMember1
      boardMember2 = deployed.boardMember2
      boardMember3 = deployed.boardMember3

      const now = await time.latest()
      await proposalsContract
        .connect(boardMember1)
        .createProposal('Tally Test', 'Desc', 'Technical', now + 1, now + ONE_DAY_IN_SECS)
      proposalId = 1
      await time.increase(2) // Move time to active voting period
    })

    it('Should automatically tally and set state to Succeeded', async function () {
      await proposalsContract.connect(boardMember1).castVote(proposalId, VoteOption.Yes)
      await proposalsContract.connect(boardMember2).castVote(proposalId, VoteOption.Yes)
      await proposalsContract.connect(boardMember3).castVote(proposalId, VoteOption.No) // 2 Yes, 1 No

      const proposal = await proposalsContract.getProposal(proposalId)
      expect(proposal.state).to.equal(ProposalState.Succeeded)
    })

    it('Should automatically tally and set state to Defeated', async function () {
      await proposalsContract.connect(boardMember1).castVote(proposalId, VoteOption.No)
      await proposalsContract.connect(boardMember2).castVote(proposalId, VoteOption.No)
      await proposalsContract.connect(boardMember3).castVote(proposalId, VoteOption.Yes) // 1 Yes, 2 No

      const proposal = await proposalsContract.getProposal(proposalId)
      expect(proposal.state).to.equal(ProposalState.Defeated)
    })

    it('Should automatically tally and set state to Expired on a tie', async function () {
      // Need to adjust board members for a tie scenario
      const { proposalsContract, boardMember1, boardMember2, boardOfDirectorsMock } =
        await deployContracts()
      await boardOfDirectorsMock.removeMember((await ethers.getSigners())[3].address) // Remove 3rd member for even count
      await proposalsContract
        .connect(boardMember1)
        .createProposal(
          'Tie Test',
          'Desc',
          'Technical',
          (await time.latest()) + 1,
          (await time.latest()) + ONE_DAY_IN_SECS
        )
      await time.increase(2)

      await proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
      await proposalsContract.connect(boardMember2).castVote(1, VoteOption.No)

      const proposal = await proposalsContract.getProposal(1)
      expect(proposal.state).to.equal(ProposalState.Expired)
    })

    it('Should allow manual tallying by a board member', async function () {
      await proposalsContract.connect(boardMember1).castVote(proposalId, VoteOption.Yes)
      await proposalsContract.connect(boardMember2).castVote(proposalId, VoteOption.Yes)
      // Not all members voted
      await time.increase(ONE_DAY_IN_SECS) // Expire the proposal

      await proposalsContract.connect(boardMember3).tallyResults(proposalId)
      const proposal = await proposalsContract.getProposal(proposalId)
      expect(proposal.state).to.equal(ProposalState.Succeeded)
    })
  })

  describe('View Functions and Modifiers', function () {
    it('getProposal should return correct proposal data', async function () {
      const { proposalsContract, boardMember1 } = await deployContracts()
      const now = await time.latest()
      const startDate = now + 1
      const endDate = now + ONE_DAY_IN_SECS
      await proposalsContract
        .connect(boardMember1)
        .createProposal('Title A', 'Desc B', 'Technical', startDate, endDate)

      const proposal = await proposalsContract.getProposal(1)
      expect(proposal.id).to.equal(1)
      expect(proposal.title).to.equal('Title A')
      expect(proposal.description).to.equal('Desc B')
      expect(proposal.creator).to.equal(boardMember1.address)
    })

    it('hasVoted should return true for a member who has voted', async function () {
      const { proposalsContract, boardMember1 } = await deployContracts()
      const now = await time.latest()
      await proposalsContract
        .connect(boardMember1)
        .createProposal('Vote Test', 'Desc', 'Technical', now + 1, now + 2)

      await proposalsContract.connect(boardMember1).castVote(1, VoteOption.Yes)
      const hasVoted = await proposalsContract.hasVoted(1, boardMember1.address)
      expect(hasVoted).to.be.true
    })

    it('getProposal should revert for a non-existent proposal', async function () {
      const { proposalsContract } = await deployContracts()
      await expect(proposalsContract.getProposal(99)).to.be.revertedWithCustomError(
        proposalsContract,
        'ProposalNotFound'
      )
    })

    it('getBoardOfDirectors should return the list of members', async function () {
      const { proposalsContract, boardMember1, boardMember2, boardMember3 } =
        await deployContracts()
      const members = await proposalsContract.getBoardOfDirectors()
      expect(members).to.have.lengthOf(3)
      expect(members).to.include(boardMember1.address)
      expect(members).to.include(boardMember2.address)
      expect(members).to.include(boardMember3.address)
    })

    it('should revert calls if board of directors address is not set', async function () {
      const ProposalsFactory = await ethers.getContractFactory('Proposals')
      const proposalsContract = await (await ProposalsFactory.deploy()).waitForDeployment()
      await proposalsContract.initialize((await ethers.provider.getSigner(0)).address)
      const now = await time.latest()

      await expect(
        proposalsContract.createProposal('T', 'D', 't', now + 1, now + 2)
      ).to.be.revertedWithCustomError(proposalsContract, 'BoardOfDirectorAddressNotSet')
    })
  })
})

// A mock contract for BoardOfDirectors to isolate testing of Proposals
describe('BoardOfDirectorsMock', function () {
  it('Should allow adding and checking members', async function () {
    const [member1, member2] = await ethers.getSigners()
    const BoardOfDirectorsMockFactory = await ethers.getContractFactory('MockBoardOfDirectors')
    const mock = await BoardOfDirectorsMockFactory.deploy()

    await mock.addMember(member1.address)
    expect(await mock.isMember(member1.address)).to.be.true
    expect(await mock.isMember(member2.address)).to.be.false

    const members = await mock.getBoardOfDirectors()
    expect(members).to.include(member1.address)
  })
})

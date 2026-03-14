import { ethers } from 'hardhat'
import { expect } from 'chai'
import { time } from '@nomicfoundation/hardhat-network-helpers'

const ONE_DAY_IN_SECS = 24 * 60 * 60

enum VoteOption {
  Yes,
  No,
  Abstain
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
    ).to.be.revertedWith('BoardOfDirectors contract not found')
  })
})

import { ethers } from 'hardhat'
import { expect } from 'chai'

describe('Voting Contract', () => {
  async function deployFixture() {
    const [founder, voter1, voter2, voter3, outsider] = await ethers.getSigners()

    const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
    const mockOfficer = await MockOfficerFactory.deploy()

    const BoardOfDirectorsMockFactory = await ethers.getContractFactory('MockBoardOfDirectors')
    const board = await BoardOfDirectorsMockFactory.deploy()
    await board.addMember(founder.address)

    const VotingFactory = await ethers.getContractFactory('Voting')
    const voting = await VotingFactory.deploy()

    await mockOfficer.setDeployedContract('BoardOfDirectors', await board.getAddress())
    await mockOfficer.initializeUpgradeable(await voting.getAddress(), founder.address)

    return { voting, board, founder, voter1, voter2, voter3, outsider }
  }

  it('adds a directive proposal and records a vote', async () => {
    const { voting, voter1, voter2, voter3 } = await deployFixture()

    await expect(
      voting.addProposal(
        'Directive',
        'Description',
        false,
        0,
        [voter1.address, voter2.address, voter3.address],
        []
      )
    )
      .to.emit(voting, 'ProposalAdded')
      .withArgs(0, 'Directive', 'Description')

    await expect(voting.connect(voter1).voteDirective(0, 1))
      .to.emit(voting, 'DirectiveVoted')
      .withArgs(voter1.address, 0, 1)

    const proposal = await voting.proposalsById(0)
    expect(proposal.votes.yes).to.equal(1)
  })

  it('rejects invalid directive votes and duplicate votes', async () => {
    const { voting, voter1 } = await deployFixture()

    await voting.addProposal('Directive', 'Description', false, 0, [voter1.address], [])

    await expect(voting.connect(voter1).voteDirective(0, 4)).to.be.revertedWith('Invalid vote')

    await voting.connect(voter1).voteDirective(0, 1)
    await expect(voting.connect(voter1).voteDirective(0, 1)).to.be.revertedWith(
      'You have already voted'
    )
  })

  it('concludes election proposals and updates board', async () => {
    const { voting, board, founder, voter1, voter2, voter3 } = await deployFixture()

    const candidates = [founder.address, voter1.address]

    await voting.addProposal(
      'Election',
      'Choose board members',
      true,
      2,
      [voter1.address, voter2.address, voter3.address],
      candidates
    )

    await voting.connect(voter1).voteElection(0, founder.address)
    await voting.connect(voter2).voteElection(0, founder.address)
    await voting.connect(voter3).voteElection(0, voter1.address)

    await expect(voting.connect(founder).concludeProposal(0))
      .to.emit(voting, 'BoardOfDirectorsSet')
      .withArgs([founder.address, voter1.address])

    const members = await board.getBoardOfDirectors()
    expect(members).to.deep.equal([founder.address, voter1.address])
  })

  it('blocks outsiders from voting', async () => {
    const { voting, voter1, outsider } = await deployFixture()

    await voting.addProposal('Directive', 'Description', false, 0, [voter1.address], [])

    await expect(voting.connect(outsider).voteDirective(0, 1)).to.be.revertedWith(
      'You are not registered to vote in this proposal'
    )
  })
})

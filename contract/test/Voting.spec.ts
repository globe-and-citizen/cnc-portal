import { ethers } from 'hardhat'
import { expect } from 'chai'

describe('Voting Contract', () => {
  async function deployFixture() {
    const [founder, voter1, voter2, voter3, voter4, outsider] = await ethers.getSigners()

    const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
    const mockOfficer = await MockOfficerFactory.deploy()

    const BoardOfDirectorsMockFactory = await ethers.getContractFactory('MockBoardOfDirectors')
    const board = await BoardOfDirectorsMockFactory.deploy()
    await board.addMember(founder.address)

    // Deploy Voting behind a beacon proxy. The implementation's constructor calls
    // `_disableInitializers()`, so `initialize` can only run in the context of a proxy.
    // Spawning the proxy through MockOfficer ensures the Voting proxy records
    // `officerAddress = mockOfficer` (because msg.sender during the proxy's constructor
    // delegatecall to `initialize` is the MockOfficer that created it).
    const VotingFactory = await ethers.getContractFactory('Voting')
    const votingImpl = await VotingFactory.deploy()
    const BeaconFactory = await ethers.getContractFactory('Beacon')
    const votingBeacon = await BeaconFactory.deploy(await votingImpl.getAddress())
    const initData = votingImpl.interface.encodeFunctionData('initialize', [founder.address])
    const tx = await mockOfficer.deployBeaconProxy(
      await votingBeacon.getAddress(),
      initData,
      'Voting'
    )
    await tx.wait()
    const votingProxyAddress = await mockOfficer.findDeployedContract('Voting')
    const voting = await ethers.getContractAt('Voting', votingProxyAddress)

    await mockOfficer.setDeployedContract('BoardOfDirectors', await board.getAddress())

    return { voting, board, founder, voter1, voter2, voter3, voter4, outsider }
  }

  async function createTiedElection(
    voting: Awaited<ReturnType<typeof deployFixture>>['voting'],
    founder: Awaited<ReturnType<typeof deployFixture>>['founder'],
    voter1: Awaited<ReturnType<typeof deployFixture>>['voter1'],
    voter2: Awaited<ReturnType<typeof deployFixture>>['voter2'],
    voter3: Awaited<ReturnType<typeof deployFixture>>['voter3'],
    voter4: Awaited<ReturnType<typeof deployFixture>>['voter4']
  ) {
    // 3 candidates, winnerCount=2. A gets 2 votes, B gets 1 vote, C gets 1 vote → tie for 2nd place
    await voting
      .connect(founder)
      .addProposal(
        'Tied Election',
        'desc',
        true,
        2,
        [voter1.address, voter2.address, voter3.address, voter4.address],
        [founder.address, voter1.address, voter2.address]
      )

    await voting.connect(voter1).voteElection(0, founder.address)
    await voting.connect(voter2).voteElection(0, founder.address)
    await voting.connect(voter3).voteElection(0, voter1.address)
    await voting.connect(voter4).voteElection(0, voter2.address)

    await expect(voting.connect(founder).concludeProposal(0)).to.emit(voting, 'TieDetected')
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

  it('records no (0) and abstain (2) directive votes', async () => {
    const { voting, voter1, voter2, voter3 } = await deployFixture()

    await voting.addProposal(
      'Directive',
      'Description',
      false,
      0,
      [voter1.address, voter2.address, voter3.address],
      []
    )

    await voting.connect(voter1).voteDirective(0, 0) // no
    await voting.connect(voter2).voteDirective(0, 2) // abstain

    const proposal = await voting.proposalsById(0)
    expect(proposal.votes.no).to.equal(1)
    expect(proposal.votes.abstain).to.equal(1)
  })

  it('rejects invalid directive votes and duplicate votes', async () => {
    const { voting, voter1 } = await deployFixture()

    await voting.addProposal('Directive', 'Description', false, 0, [voter1.address], [])

    await expect(voting.connect(voter1).voteDirective(0, 4))
      .to.be.revertedWithCustomError(voting, 'InvalidVote')
      .withArgs(4)

    await voting.connect(voter1).voteDirective(0, 1)
    await expect(voting.connect(voter1).voteDirective(0, 1)).to.be.revertedWithCustomError(
      voting,
      'VoterAlreadyVoted'
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

  it('concludes a directive (non-election) proposal', async () => {
    const { voting, founder, voter1 } = await deployFixture()

    await voting
      .connect(founder)
      .addProposal('Directive', 'Description', false, 0, [voter1.address], [])
    await voting.connect(voter1).voteDirective(0, 1)

    await expect(voting.connect(founder).concludeProposal(0))
      .to.emit(voting, 'ProposalConcluded')
      .withArgs(0, false)

    const proposal = await voting.proposalsById(0)
    expect(proposal.isActive).to.equal(false)
  })

  it('blocks outsiders from voting', async () => {
    const { voting, voter1, outsider } = await deployFixture()

    await voting.addProposal('Directive', 'Description', false, 0, [voter1.address], [])

    await expect(voting.connect(outsider).voteDirective(0, 1))
      .to.be.revertedWithCustomError(voting, 'VoterNotRegistered')
      .withArgs(outsider.address)
  })

  it('rejects election vote for non-existent candidate', async () => {
    const { voting, founder, voter1, outsider } = await deployFixture()

    await voting
      .connect(founder)
      .addProposal('Election', 'desc', true, 1, [voter1.address], [founder.address])

    await expect(
      voting.connect(voter1).voteElection(0, outsider.address)
    ).to.be.revertedWithCustomError(voting, 'CandidateNotFound')
  })

  it('rejects voteDirective on non-existent proposal', async () => {
    const { voting, voter1 } = await deployFixture()

    await expect(voting.connect(voter1).voteDirective(99, 1))
      .to.be.revertedWithCustomError(voting, 'ProposalNotFound')
      .withArgs(99)
  })

  it('rejects voteElection on non-existent proposal', async () => {
    const { voting, voter1, founder } = await deployFixture()

    await expect(voting.connect(voter1).voteElection(99, founder.address))
      .to.be.revertedWithCustomError(voting, 'ProposalNotFound')
      .withArgs(99)
  })

  it('rejects concludeProposal by non-founder', async () => {
    const { voting, voter1 } = await deployFixture()

    await voting.addProposal('Directive', 'Description', false, 0, [voter1.address], [])

    await expect(voting.connect(voter1).concludeProposal(0)).to.be.revertedWithCustomError(
      voting,
      'OnlyFounder'
    )
  })

  it('rejects addProposal with empty title', async () => {
    const { voting, voter1 } = await deployFixture()

    await expect(
      voting.addProposal('', 'Description', false, 0, [voter1.address], [])
    ).to.be.revertedWithCustomError(voting, 'EmptyTitle')
  })

  it('rejects election proposal with empty candidates', async () => {
    const { voting, voter1 } = await deployFixture()

    await expect(
      voting.addProposal('Election', 'desc', true, 1, [voter1.address], [])
    ).to.be.revertedWithCustomError(voting, 'NoCandidates')
  })

  it('getProposalById returns correct proposal data', async () => {
    const { voting, voter1 } = await deployFixture()

    await voting.addProposal('My Proposal', 'desc', false, 0, [voter1.address], [])

    const proposal = await voting.getProposalById(0)
    expect(proposal.title).to.equal('My Proposal')
    expect(proposal.isElection).to.equal(false)
    expect(proposal.isActive).to.equal(true)
  })

  it('getProposalById reverts for non-existent proposal', async () => {
    const { voting } = await deployFixture()

    await expect(voting.getProposalById(99))
      .to.be.revertedWithCustomError(voting, 'ProposalNotFound')
      .withArgs(99)
  })

  it('setBoardOfDirectors sets board via owner', async () => {
    const { voting, board, founder, voter1 } = await deployFixture()

    await expect(voting.connect(founder).setBoardOfDirectors([voter1.address])).to.not.be.reverted

    const members = await board.getBoardOfDirectors()
    expect(members).to.include(voter1.address)
  })

  it('pause and unpause by owner', async () => {
    const { voting, founder } = await deployFixture()

    await voting.connect(founder).pause()
    expect(await voting.paused()).to.equal(true)

    await voting.connect(founder).unpause()
    expect(await voting.paused()).to.equal(false)
  })

  describe('tie resolution', () => {
    it('resolves tie with RANDOM_SELECTION', async () => {
      const { voting, board, founder, voter1, voter2, voter3, voter4 } = await deployFixture()

      await createTiedElection(voting, founder, voter1, voter2, voter3, voter4)

      // RANDOM_SELECTION = 0
      await expect(voting.connect(founder).resolveTie(0, 0)).to.emit(voting, 'BoardOfDirectorsSet')

      const members = await board.getBoardOfDirectors()
      expect(members.length).to.equal(2)
    })

    it('resolves tie with INCREASE_WINNER_COUNT', async () => {
      const { voting, board, founder, voter1, voter2, voter3, voter4 } = await deployFixture()

      await createTiedElection(voting, founder, voter1, voter2, voter3, voter4)

      // INCREASE_WINNER_COUNT = 3
      await expect(voting.connect(founder).resolveTie(0, 3)).to.emit(voting, 'BoardOfDirectorsSet')

      const members = await board.getBoardOfDirectors()
      expect(members.length).to.equal(3)
    })

    it('resolves tie with FOUNDER_CHOICE then selectWinner', async () => {
      const { voting, board, founder, voter1, voter2, voter3, voter4 } = await deployFixture()

      await createTiedElection(voting, founder, voter1, voter2, voter3, voter4)

      // FOUNDER_CHOICE = 2 - just marks option, doesn't resolve yet
      await expect(voting.connect(founder).resolveTie(0, 2))
        .to.emit(voting, 'TieBreakOptionSelected')
        .withArgs(0, 2)

      // Get the tied candidates to pick one
      const proposal = await voting.getProposalById(0)
      const tiedCandidates = proposal.tiedCandidates
      expect(tiedCandidates.length).to.be.gt(0)

      // selectWinner with a valid tied candidate
      await expect(voting.connect(founder).selectWinner(0, tiedCandidates[0])).to.emit(
        voting,
        'BoardOfDirectorsSet'
      )

      const members = await board.getBoardOfDirectors()
      expect(members).to.include(tiedCandidates[0])
    })

    it('resolves tie with RUNOFF_ELECTION', async () => {
      const { voting, founder, voter1, voter2, voter3, voter4 } = await deployFixture()

      await createTiedElection(voting, founder, voter1, voter2, voter3, voter4)

      // RUNOFF_ELECTION = 1
      await expect(voting.connect(founder).resolveTie(0, 1)).to.emit(
        voting,
        'RunoffElectionStarted'
      )

      // A new proposal should have been created
      expect(await voting.proposalCount()).to.equal(2)
    })

    it('rejects resolveTie by non-founder', async () => {
      const { voting, voter1, voter2, voter3, voter4, founder } = await deployFixture()

      await createTiedElection(voting, founder, voter1, voter2, voter3, voter4)

      await expect(voting.connect(voter1).resolveTie(0, 0)).to.be.revertedWithCustomError(
        voting,
        'OnlyFounder'
      )
    })

    it('rejects resolveTie when no tie exists', async () => {
      const { voting, founder, voter1 } = await deployFixture()

      await voting
        .connect(founder)
        .addProposal('Election', 'desc', true, 1, [voter1.address], [founder.address])
      await voting.connect(voter1).voteElection(0, founder.address)
      await voting.connect(founder).concludeProposal(0)

      await expect(voting.connect(founder).resolveTie(0, 0)).to.be.revertedWithCustomError(
        voting,
        'NoTieToResolve'
      )
    })

    it('rejects selectWinner with invalid candidate', async () => {
      const { voting, founder, voter1, voter2, voter3, voter4, outsider } = await deployFixture()

      await createTiedElection(voting, founder, voter1, voter2, voter3, voter4)

      await voting.connect(founder).resolveTie(0, 2) // FOUNDER_CHOICE

      await expect(
        voting.connect(founder).selectWinner(0, outsider.address)
      ).to.be.revertedWithCustomError(voting, 'InvalidTieWinner')
    })

    it('rejects selectWinner when tie break option is not FOUNDER_CHOICE', async () => {
      const { voting, founder, voter1, voter2, voter3, voter4 } = await deployFixture()

      await createTiedElection(voting, founder, voter1, voter2, voter3, voter4)

      // Resolve with RANDOM_SELECTION (0), not FOUNDER_CHOICE
      await voting.connect(founder).resolveTie(0, 0)

      // resolveTie already resolved the tie, so hasTie=false
      // Try selectWinner anyway
      await expect(
        voting.connect(founder).selectWinner(0, voter1.address)
      ).to.be.revertedWithCustomError(voting, 'NoTieToResolve')
    })
  })
})

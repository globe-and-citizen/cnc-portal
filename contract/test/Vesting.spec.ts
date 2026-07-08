import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe('Vesting', () => {
  const DECIMALS = 6
  const VEST_AMOUNT = BigInt(1_000_000) * BigInt(10) ** BigInt(DECIMALS)
  const CLIFF = 60 * 60 * 24 * 7 // 7 days
  const DURATION = 60 * 60 * 24 * 30 // 30 days

  // Deploy Vesting per-team through a MockOfficer, exactly like SafeDepositRouter:
  // - InvestorV1 is the team share token, registered on the officer
  // - Vesting is a BeaconProxy whose officerAddress is the officer (set from msg.sender)
  // - the team owner owns the Vesting; the Vesting holds MINTER_ROLE on InvestorV1
  async function deployFixture(grantMinter = true) {
    const [teamOwner, member, member2, nonOwner] = await ethers.getSigners()

    const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
    const mockOfficer = await MockOfficerFactory.deploy()
    await mockOfficer.waitForDeployment()

    const InvestorFactory = await ethers.getContractFactory('InvestorV1')
    const investor = await upgrades.deployProxy(
      InvestorFactory,
      ['Share', 'SHARE', teamOwner.address],
      { initializer: 'initialize' }
    )
    await investor.waitForDeployment()
    const investorAddress = await investor.getAddress()
    await mockOfficer.setDeployedContract('InvestorV1', investorAddress)

    const VestingFactory = await ethers.getContractFactory('Vesting')
    const vestingImplementation = await VestingFactory.connect(teamOwner).deploy()
    await vestingImplementation.waitForDeployment()

    const encodedInitialize = vestingImplementation.interface.encodeFunctionData('initialize', [])

    const BeaconFactory = await ethers.getContractFactory('Beacon')
    const beacon = await BeaconFactory.connect(teamOwner).deploy(
      await vestingImplementation.getAddress()
    )
    await beacon.waitForDeployment()

    const vestingAddress = await mockOfficer.deployBeaconProxy.staticCall(
      await beacon.getAddress(),
      encodedInitialize,
      'Vesting'
    )
    await mockOfficer.deployBeaconProxy(await beacon.getAddress(), encodedInitialize, 'Vesting')

    const vesting = await ethers.getContractAt('Vesting', vestingAddress)

    // Officer hands the Ownable controls to the team owner, but stays the officerAddress.
    await mockOfficer.transferContractOwnership(vestingAddress, teamOwner.address)

    if (grantMinter) {
      const minterRole = await investor.MINTER_ROLE()
      await investor.connect(teamOwner).grantRole(minterRole, vestingAddress)
    }

    const start = (await time.latest()) + 10

    return { teamOwner, member, member2, nonOwner, mockOfficer, investor, vesting, start }
  }

  describe('initialization', () => {
    it('wires the officer and transfers ownership to the team owner', async () => {
      const { teamOwner, mockOfficer, vesting } = await deployFixture()

      expect(await vesting.owner()).to.equal(teamOwner.address)
      expect(await vesting.officerAddress()).to.equal(await mockOfficer.getAddress())
    })
  })

  describe('addVesting', () => {
    it('appends a schedule without moving any tokens', async () => {
      const { teamOwner, member, investor, vesting, start } = await deployFixture()

      await expect(
        vesting.connect(teamOwner).addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      )
        .to.emit(vesting, 'VestingCreated')
        .withArgs(member.address, 0, VEST_AMOUNT)

      const v = await vesting.vestings(member.address, 0)
      expect(v.totalAmount).to.equal(VEST_AMOUNT)
      expect(v.released).to.equal(0)
      expect(v.active).to.be.true

      // No pre-mint, no pre-funding: nothing exists until the member releases.
      expect(await investor.totalSupply()).to.equal(0)
      expect(await investor.balanceOf(await vesting.getAddress())).to.equal(0)

      expect(await vesting.getMembers()).to.deep.equal([member.address])
      expect(await vesting.getVestingCount(member.address)).to.equal(1)
    })

    it('allows several concurrent schedules for the same member', async () => {
      const { teamOwner, member, vesting, start } = await deployFixture()

      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await expect(
        vesting
          .connect(teamOwner)
          .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT * BigInt(2))
      )
        .to.emit(vesting, 'VestingCreated')
        .withArgs(member.address, 1, VEST_AMOUNT * BigInt(2))

      expect(await vesting.getVestingCount(member.address)).to.equal(2)
      expect(await vesting.getMembers()).to.deep.equal([member.address]) // tracked once
      const [members, indices] = await vesting.getVestingsWithMembers()
      expect(members).to.deep.equal([member.address, member.address])
      expect(indices).to.deep.equal([0n, 1n])
    })

    it('reverts when called by a non-owner', async () => {
      const { member, vesting, start } = await deployFixture()

      await expect(
        vesting.connect(member).addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      ).to.be.revertedWithCustomError(vesting, 'OwnableUnauthorizedAccount')
    })

    it('reverts when the cliff exceeds the duration', async () => {
      const { teamOwner, member, vesting, start } = await deployFixture()

      await expect(
        vesting.connect(teamOwner).addVesting(member.address, start, CLIFF, DURATION, VEST_AMOUNT)
      ).to.be.revertedWithCustomError(vesting, 'CliffExceedsDuration')
    })

    it('reverts on the zero address member', async () => {
      const { teamOwner, vesting, start } = await deployFixture()

      await expect(
        vesting
          .connect(teamOwner)
          .addVesting(ethers.ZeroAddress, start, DURATION, CLIFF, VEST_AMOUNT)
      ).to.be.revertedWithCustomError(vesting, 'ZeroAddress')
    })
  })

  describe('release', () => {
    it('mints the full amount once fully vested', async () => {
      const { teamOwner, member, investor, vesting, start } = await deployFixture()

      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await time.increaseTo(start + DURATION + 1)

      await expect(vesting.connect(member).release(0))
        .to.emit(vesting, 'TokensReleased')
        .withArgs(member.address, 0, VEST_AMOUNT)

      expect(await investor.balanceOf(member.address)).to.equal(VEST_AMOUNT)
      expect((await vesting.vestings(member.address, 0)).released).to.equal(VEST_AMOUNT)
    })

    it('mints only the vested portion after the cliff', async () => {
      const { teamOwner, member, investor, vesting, start } = await deployFixture()

      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await time.increaseTo(start + CLIFF + 1)

      const expected = await vesting.releasable(member.address, 0)
      await vesting.connect(member).release(0)

      // releasable is read one block before release executes; allow a few seconds of linear drift.
      expect(await investor.balanceOf(member.address)).to.be.closeTo(
        expected,
        (BigInt(5) * VEST_AMOUNT) / BigInt(DURATION)
      )
      expect(await investor.balanceOf(member.address)).to.be.lt(VEST_AMOUNT)
    })

    it('only releases the targeted schedule', async () => {
      const { teamOwner, member, investor, vesting, start } = await deployFixture()

      // index 0 fully vests; index 1 starts much later and is still locked.
      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start + DURATION * 10, DURATION, CLIFF, VEST_AMOUNT)
      await time.increaseTo(start + DURATION + 1)

      await vesting.connect(member).release(0)
      expect(await investor.balanceOf(member.address)).to.equal(VEST_AMOUNT)
      expect((await vesting.vestings(member.address, 1)).released).to.equal(0)
    })

    it('reverts before the cliff (nothing releasable)', async () => {
      const { teamOwner, member, vesting, start } = await deployFixture()

      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await time.increaseTo(start + 1)

      await expect(vesting.connect(member).release(0)).to.be.revertedWithCustomError(
        vesting,
        'NothingToRelease'
      )
    })

    it('guards against a double release', async () => {
      const { teamOwner, member, vesting, start } = await deployFixture()

      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await time.increaseTo(start + DURATION + 1)

      await vesting.connect(member).release(0)
      await expect(vesting.connect(member).release(0)).to.be.revertedWithCustomError(
        vesting,
        'NothingToRelease'
      )
    })

    it('reverts on an out-of-range index', async () => {
      const { member2, vesting } = await deployFixture()

      await expect(vesting.connect(member2).release(0)).to.be.revertedWithCustomError(
        vesting,
        'IndexOutOfBounds'
      )
    })

    it('reverts when the contract lacks MINTER_ROLE', async () => {
      const { teamOwner, member, vesting, start } = await deployFixture(false)

      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await time.increaseTo(start + DURATION + 1)

      await expect(vesting.connect(member).release(0)).to.be.revertedWithCustomError(
        vesting,
        'InsufficientMinterRole'
      )
    })
  })

  describe('stopVesting', () => {
    it('mints what is releasable and keeps the schedule as inactive', async () => {
      const { teamOwner, member, investor, vesting, start } = await deployFixture()

      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await time.increaseTo(start + CLIFF + 1)

      await expect(vesting.connect(teamOwner).stopVesting(member.address, 0))
        .to.emit(vesting, 'VestingStopped')
        .withArgs(member.address, 0)

      const minted = await investor.balanceOf(member.address)
      expect(minted).to.be.gt(0)
      expect(minted).to.be.lt(VEST_AMOUNT) // unvested remainder is never minted

      expect((await vesting.vestings(member.address, 0)).active).to.be.false
      const [members, indices, infos] = await vesting.getAllArchivedVestingsFlat()
      expect(members).to.deep.equal([member.address])
      expect(indices).to.deep.equal([0n])
      expect(infos[0].active).to.be.false
      expect(infos[0].released).to.equal(minted)
    })

    it('mints nothing when stopped before the cliff', async () => {
      const { teamOwner, member, investor, vesting, start } = await deployFixture()

      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)

      await expect(vesting.connect(teamOwner).stopVesting(member.address, 0))
        .to.emit(vesting, 'VestingStopped')
        .withArgs(member.address, 0)

      expect(await investor.balanceOf(member.address)).to.equal(0)
      expect(await investor.totalSupply()).to.equal(0)
    })

    it('reverts when called by a non-owner', async () => {
      const { teamOwner, member, nonOwner, vesting, start } = await deployFixture()

      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)

      await expect(
        vesting.connect(nonOwner).stopVesting(member.address, 0)
      ).to.be.revertedWithCustomError(vesting, 'OwnableUnauthorizedAccount')
    })

    it('reverts on an already-stopped schedule', async () => {
      const { teamOwner, member, vesting, start } = await deployFixture()

      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await vesting.connect(teamOwner).stopVesting(member.address, 0)

      await expect(
        vesting.connect(teamOwner).stopVesting(member.address, 0)
      ).to.be.revertedWithCustomError(vesting, 'VestingNotActive')
    })

    it('reverts on an out-of-range index', async () => {
      const { teamOwner, member, vesting } = await deployFixture()

      await expect(
        vesting.connect(teamOwner).stopVesting(member.address, 0)
      ).to.be.revertedWithCustomError(vesting, 'IndexOutOfBounds')
    })
  })

  describe('views', () => {
    it('separates active and stopped schedules, carrying the index', async () => {
      const { teamOwner, member, member2, vesting, start } = await deployFixture()

      // member: index 0 (stopped) + index 1 (active); member2: index 0 (active)
      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await vesting
        .connect(teamOwner)
        .addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await vesting
        .connect(teamOwner)
        .addVesting(member2.address, start, DURATION, CLIFF, VEST_AMOUNT)
      await vesting.connect(teamOwner).stopVesting(member.address, 0)

      const [activeMembers, activeIndices] = await vesting.getVestingsWithMembers()
      expect(activeMembers).to.deep.equal([member.address, member2.address])
      expect(activeIndices).to.deep.equal([1n, 0n])

      const [stoppedMembers, stoppedIndices] = await vesting.getAllArchivedVestingsFlat()
      expect(stoppedMembers).to.deep.equal([member.address])
      expect(stoppedIndices).to.deep.equal([0n])
    })
  })

  describe('pausing', () => {
    it('blocks operations while paused and resumes after unpause', async () => {
      const { teamOwner, member, vesting, start } = await deployFixture()

      await vesting.connect(teamOwner).pause()

      await expect(
        vesting.connect(teamOwner).addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      ).to.be.revertedWithCustomError(vesting, 'EnforcedPause')

      await vesting.connect(teamOwner).unpause()

      await expect(
        vesting.connect(teamOwner).addVesting(member.address, start, DURATION, CLIFF, VEST_AMOUNT)
      ).to.not.be.reverted
    })
  })
})

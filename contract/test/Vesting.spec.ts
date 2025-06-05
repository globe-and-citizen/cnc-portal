import { ethers, upgrades } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { Vesting, MockERC20 } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('Vesting', () => {
  let vesting: Vesting
  let token: MockERC20
  let teamOwner: SignerWithAddress
  let member: SignerWithAddress
  let member_2: SignerWithAddress

  const teamId = 1
  const decimals = 6
  const vestAmount = BigInt(1_000_000 * 10 ** decimals)
  const cliff = 60 * 60 * 24 * 7
  const duration = 60 * 60 * 24 * 30
  let start: number

  beforeEach(async () => {
    ;[teamOwner, member, member_2] = await ethers.getSigners()

    const Token = await ethers.getContractFactory('MockERC20')
    token = await Token.deploy('Mock Token', 'MTK')
    await token.mint(await teamOwner.getAddress(), BigInt(10_000_000 * 10 ** decimals))

    const VestingFactory = await ethers.getContractFactory('Vesting')
    vesting = (await upgrades.deployProxy(VestingFactory, [], {
      initializer: 'initialize'
    })) as Vesting

    await vesting.createTeam(teamId, await teamOwner.getAddress(), await token.getAddress())
    await token.connect(teamOwner).approve(await vesting.getAddress(), vestAmount)
    start = (await time.latest()) + 10
  })

  it('should allow adding a vesting', async () => {
    await expect(
      vesting
        .connect(teamOwner)
        .addVesting(teamId, await member.getAddress(), start, duration, cliff, vestAmount)
    )
      .to.emit(vesting, 'VestingCreated')
      .withArgs(await member.getAddress(), teamId, vestAmount)

    const v = await vesting.vestings(await member.getAddress(), teamId)
    expect(v.totalAmount).to.equal(vestAmount)
    expect(v.active).to.be.true
  })

  it('should allow releasing after cliff', async () => {
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, await member.getAddress(), start, duration, cliff, vestAmount)

    await time.increaseTo(start + cliff + 1)

    const tx = await vesting.connect(member).release(teamId)
    const receipt = await tx.wait()

    // Parse the logs to get the TokensReleased event
    const event = receipt?.logs
      .map((log) => {
        try {
          return vesting.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((e) => e && e.name === 'TokensReleased')
    expect(event).to.not.be.undefined
    expect(event?.args?.member).to.equal(await member.getAddress())
    expect(event?.args?.teamId).to.equal(teamId)

    const amountReleased = event?.args?.amount
    const actualReleasable = await vesting.vestedAmount(await member.getAddress(), teamId)
    expect(amountReleased).to.be.closeTo(actualReleasable, BigInt(1_000_000)) // marge de 0.1% ou à ajuster

    const after = await token.balanceOf(await member.getAddress())
    expect(after).to.equal(amountReleased)
  })

  it('should stop and withdraw unvested tokens', async () => {
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, await member.getAddress(), start, duration, cliff, vestAmount)

    await expect(vesting.connect(teamOwner).stopVesting(await member.getAddress(), teamId))
      .to.emit(vesting, 'VestingStopped')
      .withArgs(await member.getAddress(), teamId)

    const v = await vesting.vestings(await member.getAddress(), teamId)
    expect(v.active).to.be.false

    const unvested = vestAmount - v.released

    await expect(vesting.connect(teamOwner).withdrawUnvested(await member.getAddress(), teamId))
      .to.emit(vesting, 'UnvestedWithdrawn')
      .withArgs(await member.getAddress(), teamId, unvested)
  })

  it('should return the list of team members', async function () {
    const vestingAmount = 1_000_000
    await token.connect(teamOwner).approve(vesting.target, vestingAmount)
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, member_2.address, start, duration, cliff, vestingAmount)

    const members = await vesting.getTeamMembers(teamId)
    expect(members).to.deep.equal([member_2.address])
  })

  it('should return the list of teams a user is part of', async function () {
    const teamId_2 = 2
    const vestingAmount = 1_000_000

    await vesting.connect(teamOwner).createTeam(teamId_2, teamOwner.address, token.target)
    await token.connect(teamOwner).approve(vesting.target, vestingAmount)
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, member.address, start, duration, cliff, vestingAmount)

    const userTeamIds = await vesting.getUserTeams(member.address)
    expect(userTeamIds).to.deep.equal([BigInt(teamId)])
  })

  it('should prevent action when paused', async () => {
    await vesting.pause()

    await expect(
      vesting
        .connect(teamOwner)
        .addVesting(teamId, await member.getAddress(), start, duration, cliff, vestAmount)
    ).to.be.revertedWithCustomError(vesting, 'EnforcedPause()')

    await vesting.unpause()
    await expect(
      vesting
        .connect(teamOwner)
        .addVesting(teamId, await member.getAddress(), start, duration, cliff, vestAmount)
    ).to.not.be.reverted
  })
})

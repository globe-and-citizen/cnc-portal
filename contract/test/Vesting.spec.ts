import { ethers, upgrades } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { Vesting, MockERC20 } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('Vesting', () => {
  let vesting: Vesting
  let token: MockERC20
  //let deployer: SignerWithAddress
  let teamOwner: SignerWithAddress
  let member: SignerWithAddress
  let member_2: SignerWithAddress

  const teamId = 1
  const decimals = 6
  const vestAmount = BigInt(1_000_000 * 10 ** decimals) // 1M tokens with 6 decimals
  const cliff = 60 * 60 * 24 * 7 // 7 days
  const duration = 60 * 60 * 24 * 30 // 30 days
  let start: number

  beforeEach(async () => {
    ;[teamOwner, member, member_2] = await ethers.getSigners()

    // Deploy MockERC20
    const Token = await ethers.getContractFactory('MockERC20')
    token = await Token.deploy('Mock Token', 'MTK')
    await token.mint(await teamOwner.getAddress(), BigInt(10_000_000 * 10 ** decimals))

    // Deploy Vesting proxy
    const VestingFactory = await ethers.getContractFactory('Vesting')
    vesting = (await upgrades.deployProxy(VestingFactory, [], {
      initializer: 'initialize'
    })) as Vesting

    // Create team
    await vesting.createTeam(teamId, await teamOwner.getAddress(), await token.getAddress())

    // Approve vesting amount
    await token.connect(teamOwner).approve(await vesting.getAddress(), vestAmount)

    start = (await time.latest()) + 10
  })

  it('should allow adding a vesting', async () => {
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, await member.getAddress(), start, duration, cliff, vestAmount)

    const v = await vesting.vestings(await member.getAddress(), teamId)
    expect(v.totalAmount).to.equal(vestAmount)
    expect(v.active).to.be.true
  })

  it('should allow releasing after cliff', async () => {
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, await member.getAddress(), start, duration, cliff, vestAmount)

    await time.increaseTo(start + cliff + 1)

    const before = await token.balanceOf(await member.getAddress())
    await vesting.connect(member).release(teamId)
    const after = await token.balanceOf(await member.getAddress())

    expect(after).to.be.gt(before)
  })

  it('should stop and withdraw unvested tokens', async () => {
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, await member.getAddress(), start, duration, cliff, vestAmount)

    await vesting.connect(teamOwner).stopVesting(await member.getAddress(), teamId)
    const v = await vesting.vestings(await member.getAddress(), teamId)
    expect(v.active).to.be.false

    const balanceBefore = await token.balanceOf(await teamOwner.getAddress())
    await vesting.connect(teamOwner).withdrawUnvested(await member.getAddress(), teamId)
    const balanceAfter = await token.balanceOf(await teamOwner.getAddress())

    expect(balanceAfter).to.be.gt(balanceBefore)
  })

  it('should return the list of team members', async function () {
    const vestingAmount = 1_000_000

    // Set up the team and vesting

    await token.connect(teamOwner).approve(vesting.target, vestingAmount)
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, member_2.address, start, duration, cliff, vestingAmount)

    // Call the getter
    const members = await vesting.getTeamMembers(teamId)

    // Expect the correct member address
    expect(members).to.deep.equal([member_2.address])
  })

  it('should return the list of teams a user is part of', async function () {
    const teamId_2 = 2
    const vestingAmount = 1_000_000

    // Set up the team and vesting
    await vesting.connect(teamOwner).createTeam(teamId_2, teamOwner.address, token.target)
    await token.connect(teamOwner).approve(vesting.target, vestingAmount)
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, member.address, start, duration, cliff, vestingAmount)

    // Call the getter
    const userTeamIds = await vesting.getUserTeams(member.address)

    // Expect the correct team ID
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

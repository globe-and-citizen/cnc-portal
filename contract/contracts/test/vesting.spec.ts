import { ethers, upgrades } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { Vesting, MockERC20 } from '../../typechain-types'
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
        .addVesting(
          teamId,
          await member.getAddress(),
          start,
          duration,
          cliff,
          vestAmount,
          token.target
        )
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
      .addVesting(
        teamId,
        await member.getAddress(),
        start,
        duration,
        cliff,
        vestAmount,
        token.target
      )

    await time.increaseTo(start + cliff + 1)

    const tx = await vesting.connect(member).release(teamId)
    const receipt = await tx.wait()

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
    expect(amountReleased).to.be.closeTo(actualReleasable, BigInt(1_000_000))

    const after = await token.balanceOf(await member.getAddress())
    expect(after).to.equal(amountReleased)
  })

  it('should return the list of team members', async function () {
    const vestingAmount = 1_000_000
    await token.connect(teamOwner).approve(vesting.target, vestingAmount)
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, member_2.address, start, duration, cliff, vestingAmount, token.target)

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
      .addVesting(teamId, member.address, start, duration, cliff, vestingAmount, token.target)

    const userTeamIds = await vesting.getUserTeams(member.address)
    expect(userTeamIds).to.deep.equal([BigInt(teamId)])
  })

  it('should prevent action when paused', async () => {
    await vesting.pause()

    await expect(
      vesting
        .connect(teamOwner)
        .addVesting(
          teamId,
          await member.getAddress(),
          start,
          duration,
          cliff,
          vestAmount,
          token.target
        )
    ).to.be.revertedWithCustomError(vesting, 'EnforcedPause()')

    await vesting.unpause()

    await expect(
      vesting
        .connect(teamOwner)
        .addVesting(
          teamId,
          await member.getAddress(),
          start,
          duration,
          cliff,
          vestAmount,
          token.target
        )
    ).to.not.be.reverted
  })

  it('should create a team on the fly in addVesting if team does not exist yet', async () => {
    const newTeamId = 777
    const vestingAmount = 500_000

    // On approuve d'abord le transfert pour le contrat
    await token.connect(teamOwner).approve(vesting.target, vestingAmount)

    // L'équipe newTeamId n'existe pas encore — elle sera créée automatiquement
    await expect(
      vesting
        .connect(teamOwner)
        .addVesting(newTeamId, member.address, start, duration, cliff, vestingAmount, token.target)
    )
      .to.emit(vesting, 'VestingCreated')
      .withArgs(member.address, newTeamId, vestingAmount)

    // Vérifie que l'équipe a bien été créée avec le bon owner et token
    const teamInfo = await vesting.teams(newTeamId)
    expect(teamInfo.owner).to.equal(teamOwner.address)
    expect(teamInfo.token).to.equal(token.target)

    // Vérifie que le membre a bien un vesting actif
    const vestingInfo = await vesting.vestings(member.address, newTeamId)
    expect(vestingInfo.totalAmount).to.equal(vestingAmount)
    expect(vestingInfo.active).to.be.true
  })

  it('should log default values for an uninitialized teamId', async () => {
    const unknownTeamId = 999

    const team = await vesting.teams(unknownTeamId)

    expect(team.owner).to.equal(ethers.ZeroAddress)
    expect(team.token).to.equal(ethers.ZeroAddress)
  })

  it('should archive the vesting after stopping it', async () => {
    await vesting
      .connect(teamOwner)
      .addVesting(teamId, member.address, start, duration, cliff, vestAmount, token.target)

    await vesting.connect(teamOwner).stopVesting(member.address, teamId)

    const archived = await vesting.getTeamAllArchivedVestingsFlat(teamId)
    expect(archived.members).to.include(member.address)
    expect(archived.archivedInfos[0].active).to.be.false
  })

  it('should return multiple archived vestings per member', async () => {
    const vAmount = BigInt(100_000 * 10 ** decimals)

    for (let i = 0; i < 2; i++) {
      await token.connect(teamOwner).approve(vesting.target, vAmount)
      await vesting
        .connect(teamOwner)
        .addVesting(
          teamId,
          member.address,
          start + i * 1000,
          duration,
          cliff,
          vAmount,
          token.target
        )
      await vesting.connect(teamOwner).stopVesting(member.address, teamId)
    }

    const { members, archivedInfos } = await vesting.getTeamAllArchivedVestingsFlat(teamId)
    expect(members.length).to.equal(2)
    expect(members[0]).to.equal(member.address)
    expect(archivedInfos[0].totalAmount).to.equal(vAmount)
  })
})

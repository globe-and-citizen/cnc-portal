import { expect } from 'chai'
import { ZeroAddress } from 'ethers'
import { ethers, initializeHardhat, loadFixture } from './hardhat-context.js'

before(initializeHardhat)

describe('InvestorV201UpgradeModule', function () {
  async function deployFixture() {
    const [beaconOwner, investorOwner, attacker] = await ethers.getSigners()
    const Investor = await ethers.getContractFactory('Investor')
    const initialImplementation = await Investor.connect(beaconOwner).deploy()
    await initialImplementation.waitForDeployment()

    const Beacon = await ethers.getContractFactory('Beacon')
    const beacon = await Beacon.connect(beaconOwner).deploy(
      await initialImplementation.getAddress()
    )
    await beacon.waitForDeployment()

    const initData = initialImplementation.interface.encodeFunctionData('initialize', [
      'Acme Shares',
      'ACME',
      investorOwner.address
    ])
    const UserBeaconProxy = await ethers.getContractFactory('UserBeaconProxy')
    const proxyContract = await UserBeaconProxy.connect(investorOwner).deploy(
      await beacon.getAddress(),
      initData
    )
    await proxyContract.waitForDeployment()
    const proxy = await ethers.getContractAt('Investor', await proxyContract.getAddress())

    return { beaconOwner, investorOwner, attacker, initialImplementation, beacon, proxy }
  }

  it('upgrades every proxy while preserving ownership, roles, and token metadata', async () => {
    const { beaconOwner, investorOwner, initialImplementation, beacon, proxy } =
      await loadFixture(deployFixture)
    const defaultAdminRole = await proxy.DEFAULT_ADMIN_ROLE()
    const minterRole = await proxy.MINTER_ROLE()

    const Investor = await ethers.getContractFactory('Investor')
    const v201Implementation = await Investor.connect(beaconOwner).deploy()
    await v201Implementation.waitForDeployment()

    await expect(beacon.connect(beaconOwner).upgradeTo(await v201Implementation.getAddress()))
      .to.emit(beacon, 'Upgraded')
      .withArgs(await v201Implementation.getAddress())

    expect(await beacon.implementation()).to.equal(await v201Implementation.getAddress())
    expect(await beacon.implementation()).to.not.equal(await initialImplementation.getAddress())
    expect(await proxy.version()).to.equal('2.0.1')
    expect(await proxy.owner()).to.equal(investorOwner.address)
    expect(await proxy.name()).to.equal('Acme Shares')
    expect(await proxy.symbol()).to.equal('ACME')
    expect(await proxy.hasRole(defaultAdminRole, investorOwner.address)).to.equal(true)
    expect(await proxy.hasRole(minterRole, investorOwner.address)).to.equal(true)
  })

  it('rejects unauthorized or invalid implementation upgrades', async () => {
    const { beaconOwner, attacker, beacon } = await loadFixture(deployFixture)
    const Investor = await ethers.getContractFactory('Investor')
    const v201Implementation = await Investor.connect(beaconOwner).deploy()
    await v201Implementation.waitForDeployment()

    await expect(
      beacon.connect(attacker).upgradeTo(await v201Implementation.getAddress())
    ).to.be.revertedWithCustomError(beacon, 'OwnableUnauthorizedAccount')
    await expect(beacon.connect(beaconOwner).upgradeTo(ZeroAddress)).to.be.revertedWithCustomError(
      beacon,
      'BeaconInvalidImplementation'
    )
  })
})

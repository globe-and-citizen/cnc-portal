import { expect } from 'chai'
import { ZeroAddress } from 'ethers'
import { ethers, initializeHardhat, loadFixture } from './hardhat-context.js'

before(initializeHardhat)

describe('ExpenseAccountV201UpgradeModule', function () {
  async function deployFixture() {
    const [beaconOwner, proxyOwner, attacker] = await ethers.getSigners()
    const MockToken = await ethers.getContractFactory('MockERC20')
    const token = await MockToken.connect(beaconOwner).deploy('USDC', 'USDC')
    await token.waitForDeployment()

    const ExpenseAccount = await ethers.getContractFactory('ExpenseAccountEIP712')
    const initialImplementation = await ExpenseAccount.connect(beaconOwner).deploy()
    await initialImplementation.waitForDeployment()

    const FactoryBeacon = await ethers.getContractFactory('FactoryBeacon')
    const factoryBeacon = await FactoryBeacon.connect(beaconOwner).deploy(
      await initialImplementation.getAddress()
    )
    await factoryBeacon.waitForDeployment()

    const initData = initialImplementation.interface.encodeFunctionData('initialize', [
      proxyOwner.address,
      [await token.getAddress()]
    ])
    const transaction = await factoryBeacon.connect(proxyOwner).createBeaconProxy(initData)
    const receipt = await transaction.wait()
    const creationEvent = receipt!.logs
      .map((log) => {
        try {
          return factoryBeacon.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((event) => event?.name === 'BeaconProxyCreated')
    const proxy = await ethers.getContractAt(
      'ExpenseAccountEIP712',
      creationEvent!.args[0] as string
    )

    return {
      beaconOwner,
      proxyOwner,
      attacker,
      token,
      initialImplementation,
      factoryBeacon,
      proxy
    }
  }

  it('upgrades every proxy while preserving owner and supported-token storage', async () => {
    const { beaconOwner, proxyOwner, token, initialImplementation, factoryBeacon, proxy } =
      await loadFixture(deployFixture)
    const supportedTokensBefore = await proxy.getSupportedTokens()

    const ExpenseAccount = await ethers.getContractFactory('ExpenseAccountEIP712')
    const v201Implementation = await ExpenseAccount.connect(beaconOwner).deploy()
    await v201Implementation.waitForDeployment()

    await expect(
      factoryBeacon.connect(beaconOwner).upgradeTo(await v201Implementation.getAddress())
    )
      .to.emit(factoryBeacon, 'Upgraded')
      .withArgs(await v201Implementation.getAddress())

    expect(await factoryBeacon.implementation()).to.equal(await v201Implementation.getAddress())
    expect(await factoryBeacon.implementation()).to.not.equal(
      await initialImplementation.getAddress()
    )
    expect(await proxy.version()).to.equal('2.0.2')
    expect(await proxy.owner()).to.equal(proxyOwner.address)
    expect(await proxy.isTokenSupported(await token.getAddress())).to.equal(true)
    expect(await proxy.getSupportedTokens()).to.deep.equal(supportedTokensBefore)
  })

  it('rejects unauthorized or invalid implementation upgrades', async () => {
    const { beaconOwner, attacker, factoryBeacon } = await loadFixture(deployFixture)
    const ExpenseAccount = await ethers.getContractFactory('ExpenseAccountEIP712')
    const v201Implementation = await ExpenseAccount.connect(beaconOwner).deploy()
    await v201Implementation.waitForDeployment()

    await expect(
      factoryBeacon.connect(attacker).upgradeTo(await v201Implementation.getAddress())
    ).to.be.revertedWithCustomError(factoryBeacon, 'OwnableUnauthorizedAccount')
    await expect(
      factoryBeacon.connect(beaconOwner).upgradeTo(ZeroAddress)
    ).to.be.revertedWithCustomError(factoryBeacon, 'BeaconInvalidImplementation')
  })
})

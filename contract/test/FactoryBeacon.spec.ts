import { ethers } from 'hardhat'
import { expect } from 'chai'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'

describe('FactoryBeacon', () => {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners()

    const BankFactory = await ethers.getContractFactory('Bank')
    const bankImplementation = await BankFactory.connect(owner).deploy()
    await bankImplementation.waitForDeployment()

    const FactoryBeaconFactory = await ethers.getContractFactory('FactoryBeacon')
    const factoryBeacon = await FactoryBeaconFactory.connect(owner).deploy(
      await bankImplementation.getAddress()
    )
    await factoryBeacon.waitForDeployment()

    return { owner, user1, user2, bankImplementation, factoryBeacon }
  }

  it('deploys with owner and implementation set', async () => {
    const { owner, bankImplementation, factoryBeacon } = await loadFixture(deployFixture)

    expect(await factoryBeacon.owner()).to.eq(owner.address)
    expect(await factoryBeacon.implementation()).to.eq(await bankImplementation.getAddress())
  })

  it('creates a beacon proxy and emits the deployed proxy address', async () => {
    const { user1, bankImplementation, factoryBeacon } = await loadFixture(deployFixture)

    const initData = bankImplementation.interface.encodeFunctionData('initialize', [
      [],
      user1.address
    ])

    const tx = await factoryBeacon.connect(user1).createBeaconProxy(initData)
    await expect(tx).to.emit(factoryBeacon, 'BeaconProxyCreated').withArgs(anyValue, user1.address)
  })

  it('initializes proxy storage using constructor data', async () => {
    const { user1, bankImplementation, factoryBeacon } = await loadFixture(deployFixture)

    const initData = bankImplementation.interface.encodeFunctionData('initialize', [
      [],
      user1.address
    ])
    const tx = await factoryBeacon.connect(user1).createBeaconProxy(initData)
    const receipt = await tx.wait()

    const proxyCreatedEvent = receipt?.logs
      .map((log) => {
        try {
          return factoryBeacon.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed?.name === 'BeaconProxyCreated')

    expect(proxyCreatedEvent).to.not.be.undefined

    const proxyAddress = proxyCreatedEvent!.args[0] as string
    const proxiedBank = await ethers.getContractAt('Bank', proxyAddress)

    expect(await proxiedBank.owner()).to.eq(user1.address)
    expect(await proxiedBank.paused()).to.eq(false)
  })

  it('reverts proxy creation when initializer data is invalid', async () => {
    const { user1, factoryBeacon } = await loadFixture(deployFixture)

    await expect(factoryBeacon.connect(user1).createBeaconProxy('0x1234')).to.be.reverted
  })

  it('allows owner upgrade and blocks non-owner upgrades', async () => {
    const { owner, user2, factoryBeacon } = await loadFixture(deployFixture)

    const BankFactory = await ethers.getContractFactory('Bank')
    const newImplementation = await BankFactory.connect(owner).deploy()
    await newImplementation.waitForDeployment()

    await expect(factoryBeacon.connect(owner).upgradeTo(await newImplementation.getAddress()))
      .to.emit(factoryBeacon, 'Upgraded')
      .withArgs(await newImplementation.getAddress())

    expect(await factoryBeacon.implementation()).to.eq(await newImplementation.getAddress())

    await expect(
      factoryBeacon.connect(user2).upgradeTo(await newImplementation.getAddress())
    ).to.be.revertedWithCustomError(factoryBeacon, 'OwnableUnauthorizedAccount')
  })
})

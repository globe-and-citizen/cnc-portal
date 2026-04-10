import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ZeroAddress } from 'ethers'
import type { FeeCollector } from '../typechain-types'

/**
 * Exercises the semantics of ignition/modules/OfficerUpgradeModule.ts:
 *   1. Deploy a new Officer implementation.
 *   2. Point the existing FactoryBeacon at it via upgradeTo.
 *   3. Verify that a proxy deployed against the factory beacon observes the new
 *      code while preserving its storage (owner).
 *   4. Verify access control: only the factory beacon owner can upgrade.
 */
describe('OfficerUpgradeModule', function () {
  async function deployFixture() {
    const [beaconOwner, officerOwner, attacker] = await ethers.getSigners()

    // Officer requires a FeeCollector in its constructor. Deploy through a proxy
    // since the FeeCollector impl now disables initializers in its constructor.
    const FeeCollectorFactory = await ethers.getContractFactory('FeeCollector')
    const feeCollectorImpl = (await upgrades.deployProxy(
      FeeCollectorFactory.connect(beaconOwner),
      [beaconOwner.address, [], []],
      { initializer: 'initialize' }
    )) as unknown as FeeCollector
    await feeCollectorImpl.waitForDeployment()

    // Deploy the initial Officer implementation (module uses m.contract('Officer', [])
    // in practice this is pointed at a deployed implementation — we mimic with a real one).
    const OfficerFactory = await ethers.getContractFactory('Officer')
    const officerImplV1 = await OfficerFactory.connect(beaconOwner).deploy(
      await feeCollectorImpl.getAddress()
    )
    await officerImplV1.waitForDeployment()

    // Deploy the FactoryBeacon that the upgrade module will later upgrade.
    const FactoryBeaconFactory = await ethers.getContractFactory('FactoryBeacon')
    const factoryBeacon = await FactoryBeaconFactory.connect(beaconOwner).deploy(
      await officerImplV1.getAddress()
    )
    await factoryBeacon.waitForDeployment()

    // Create an Officer proxy via the factory beacon and initialize it.
    const initData = officerImplV1.interface.encodeFunctionData('initialize', [
      officerOwner.address,
      [],
      [],
      false
    ])
    const tx = await factoryBeacon.connect(officerOwner).createBeaconProxy(initData)
    const receipt = await tx.wait()

    const parsed = receipt!.logs
      .map((log) => {
        try {
          return factoryBeacon.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((p) => p?.name === 'BeaconProxyCreated')
    const proxyAddress = parsed!.args[0] as string
    const officerProxy = await ethers.getContractAt('Officer', proxyAddress)

    return {
      beaconOwner,
      officerOwner,
      attacker,
      feeCollectorImpl,
      officerImplV1,
      factoryBeacon,
      officerProxy
    }
  }

  it('deploys a new Officer implementation via the upgrade module flow', async () => {
    const { beaconOwner, feeCollectorImpl, officerImplV1 } = await loadFixture(deployFixture)

    const OfficerFactory = await ethers.getContractFactory('Officer')
    const officerImplV2 = await OfficerFactory.connect(beaconOwner).deploy(
      await feeCollectorImpl.getAddress()
    )
    await officerImplV2.waitForDeployment()

    expect(await officerImplV2.getAddress()).to.properAddress
    expect(await officerImplV2.getAddress()).to.not.eq(await officerImplV1.getAddress())
  })

  it('upgrades the factory beacon to point at the new implementation', async () => {
    const { beaconOwner, feeCollectorImpl, factoryBeacon, officerImplV1 } =
      await loadFixture(deployFixture)

    const OfficerFactory = await ethers.getContractFactory('Officer')
    const officerImplV2 = await OfficerFactory.connect(beaconOwner).deploy(
      await feeCollectorImpl.getAddress()
    )
    await officerImplV2.waitForDeployment()

    expect(await factoryBeacon.implementation()).to.eq(await officerImplV1.getAddress())

    await expect(factoryBeacon.connect(beaconOwner).upgradeTo(await officerImplV2.getAddress()))
      .to.emit(factoryBeacon, 'Upgraded')
      .withArgs(await officerImplV2.getAddress())

    expect(await factoryBeacon.implementation()).to.eq(await officerImplV2.getAddress())
  })

  it('preserves proxy storage (owner) after the upgrade', async () => {
    const { beaconOwner, officerOwner, feeCollectorImpl, factoryBeacon, officerProxy } =
      await loadFixture(deployFixture)

    expect(await officerProxy.owner()).to.eq(officerOwner.address)
    expect(await officerProxy.getFeeCollector()).to.eq(await feeCollectorImpl.getAddress())

    const OfficerFactory = await ethers.getContractFactory('Officer')
    const officerImplV2 = await OfficerFactory.connect(beaconOwner).deploy(
      await feeCollectorImpl.getAddress()
    )
    await officerImplV2.waitForDeployment()
    await factoryBeacon.connect(beaconOwner).upgradeTo(await officerImplV2.getAddress())

    // State still intact after upgrade.
    expect(await officerProxy.owner()).to.eq(officerOwner.address)
    expect(await officerProxy.getFeeCollector()).to.eq(await feeCollectorImpl.getAddress())
  })

  it('reverts when a non-owner attempts the upgrade', async () => {
    const { beaconOwner, attacker, feeCollectorImpl, factoryBeacon } =
      await loadFixture(deployFixture)

    const OfficerFactory = await ethers.getContractFactory('Officer')
    const officerImplV2 = await OfficerFactory.connect(beaconOwner).deploy(
      await feeCollectorImpl.getAddress()
    )
    await officerImplV2.waitForDeployment()

    await expect(
      factoryBeacon.connect(attacker).upgradeTo(await officerImplV2.getAddress())
    ).to.be.revertedWithCustomError(factoryBeacon, 'OwnableUnauthorizedAccount')
  })

  it('rejects upgrading to the zero address', async () => {
    const { beaconOwner, factoryBeacon } = await loadFixture(deployFixture)

    await expect(
      factoryBeacon.connect(beaconOwner).upgradeTo(ZeroAddress)
    ).to.be.revertedWithCustomError(factoryBeacon, 'BeaconInvalidImplementation')
  })
})

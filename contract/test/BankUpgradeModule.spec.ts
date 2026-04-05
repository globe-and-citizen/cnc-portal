import { ethers } from 'hardhat'
import { expect } from 'chai'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'

/**
 * Exercises the semantics of ignition/modules/BankUpgradeModule.ts:
 *   1. Deploy a new Bank implementation.
 *   2. Point the existing Beacon at the new implementation via upgradeTo.
 *   3. Verify that proxies already deployed against the beacon observe the new code
 *      while preserving their storage (owner, paused flag, supported tokens).
 *   4. Verify access control: only the beacon owner can upgrade.
 */
describe('BankUpgradeModule', function () {
  async function deployFixture() {
    const [beaconOwner, user1, attacker] = await ethers.getSigners()

    // Deploy the initial Bank implementation (as the module does via m.contract('Bank', [])).
    const BankFactory = await ethers.getContractFactory('Bank')
    const bankImplV1 = await BankFactory.connect(beaconOwner).deploy()
    await bankImplV1.waitForDeployment()

    // Deploy the Beacon that the upgrade module will later upgrade.
    const BeaconFactory = await ethers.getContractFactory('Beacon')
    const beacon = await BeaconFactory.connect(beaconOwner).deploy(await bankImplV1.getAddress())
    await beacon.waitForDeployment()

    // Deploy a proxy so we can assert storage is preserved through the upgrade.
    const initData = bankImplV1.interface.encodeFunctionData('initialize', [[], user1.address])
    const UserBeaconProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
    const proxy = await UserBeaconProxyFactory.connect(user1).deploy(
      await beacon.getAddress(),
      initData
    )
    await proxy.waitForDeployment()

    const bankProxy = await ethers.getContractAt('Bank', await proxy.getAddress())

    return { beaconOwner, user1, attacker, bankImplV1, beacon, bankProxy }
  }

  it('deploys a new Bank implementation via the upgrade module flow', async () => {
    const { beaconOwner, bankImplV1 } = await loadFixture(deployFixture)

    const BankFactory = await ethers.getContractFactory('Bank')
    const bankImplV2 = await BankFactory.connect(beaconOwner).deploy()
    await bankImplV2.waitForDeployment()

    expect(await bankImplV2.getAddress()).to.properAddress
    expect(await bankImplV2.getAddress()).to.not.eq(await bankImplV1.getAddress())
  })

  it('upgrades the beacon to point at the newly deployed implementation', async () => {
    const { beaconOwner, beacon, bankImplV1 } = await loadFixture(deployFixture)

    const BankFactory = await ethers.getContractFactory('Bank')
    const bankImplV2 = await BankFactory.connect(beaconOwner).deploy()
    await bankImplV2.waitForDeployment()

    expect(await beacon.implementation()).to.eq(await bankImplV1.getAddress())

    await expect(beacon.connect(beaconOwner).upgradeTo(await bankImplV2.getAddress()))
      .to.emit(beacon, 'Upgraded')
      .withArgs(await bankImplV2.getAddress())

    expect(await beacon.implementation()).to.eq(await bankImplV2.getAddress())
  })

  it('preserves proxy storage (owner, paused flag) after the upgrade', async () => {
    const { beaconOwner, user1, beacon, bankProxy } = await loadFixture(deployFixture)

    // Mutate proxy state under the old implementation.
    await bankProxy.connect(user1).pause()
    expect(await bankProxy.paused()).to.eq(true)
    expect(await bankProxy.owner()).to.eq(user1.address)

    // Upgrade to a freshly-deployed Bank implementation.
    const BankFactory = await ethers.getContractFactory('Bank')
    const bankImplV2 = await BankFactory.connect(beaconOwner).deploy()
    await bankImplV2.waitForDeployment()
    await beacon.connect(beaconOwner).upgradeTo(await bankImplV2.getAddress())

    // State is read through the new implementation but remains intact.
    expect(await bankProxy.owner()).to.eq(user1.address)
    expect(await bankProxy.paused()).to.eq(true)

    // And proxy functions are still callable through the new code.
    await bankProxy.connect(user1).unpause()
    expect(await bankProxy.paused()).to.eq(false)
  })

  it('reverts when a non-owner attempts the upgrade', async () => {
    const { beaconOwner, attacker, beacon } = await loadFixture(deployFixture)

    const BankFactory = await ethers.getContractFactory('Bank')
    const bankImplV2 = await BankFactory.connect(beaconOwner).deploy()
    await bankImplV2.waitForDeployment()

    await expect(
      beacon.connect(attacker).upgradeTo(await bankImplV2.getAddress())
    ).to.be.revertedWithCustomError(beacon, 'OwnableUnauthorizedAccount')
  })

  it('rejects upgrading to a non-contract implementation address', async () => {
    const { beaconOwner, user1, beacon } = await loadFixture(deployFixture)

    await expect(beacon.connect(beaconOwner).upgradeTo(user1.address)).to.be.revertedWithCustomError(
      beacon,
      'BeaconInvalidImplementation'
    )
  })
})

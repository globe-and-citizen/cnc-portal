import { ethers } from 'hardhat'
import { expect } from 'chai'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'

/**
 * Exercises the semantics of ignition/modules/BoardOfDirectorsUpgradeModule.ts:
 *   1. Deploy a new BoardOfDirectors implementation.
 *   2. Point the existing Beacon at it via upgradeTo.
 *   3. Verify state (owners list) is preserved through the upgrade.
 *   4. Verify access control: only the beacon owner can upgrade.
 */
describe('BoardOfDirectorsUpgradeModule', function () {
  async function deployFixture() {
    const [beaconOwner, boardMember1, boardMember2, attacker] = await ethers.getSigners()

    const BodFactory = await ethers.getContractFactory('BoardOfDirectors')
    const bodImplV1 = await BodFactory.connect(beaconOwner).deploy()
    await bodImplV1.waitForDeployment()

    const BeaconFactory = await ethers.getContractFactory('Beacon')
    const beacon = await BeaconFactory.connect(beaconOwner).deploy(await bodImplV1.getAddress())
    await beacon.waitForDeployment()

    // Deploy a proxy so we can assert storage is preserved through the upgrade.
    const initData = bodImplV1.interface.encodeFunctionData('initialize', [
      [boardMember1.address, boardMember2.address]
    ])
    const UserBeaconProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
    const proxy = await UserBeaconProxyFactory.connect(beaconOwner).deploy(
      await beacon.getAddress(),
      initData
    )
    await proxy.waitForDeployment()

    const bodProxy = await ethers.getContractAt('BoardOfDirectors', await proxy.getAddress())

    return { beaconOwner, boardMember1, boardMember2, attacker, bodImplV1, beacon, bodProxy }
  }

  it('deploys a new BoardOfDirectors implementation via the upgrade module flow', async () => {
    const { beaconOwner, bodImplV1 } = await loadFixture(deployFixture)

    const BodFactory = await ethers.getContractFactory('BoardOfDirectors')
    const bodImplV2 = await BodFactory.connect(beaconOwner).deploy()
    await bodImplV2.waitForDeployment()

    expect(await bodImplV2.getAddress()).to.properAddress
    expect(await bodImplV2.getAddress()).to.not.eq(await bodImplV1.getAddress())
  })

  it('upgrades the beacon to point at the new implementation', async () => {
    const { beaconOwner, beacon, bodImplV1 } = await loadFixture(deployFixture)

    const BodFactory = await ethers.getContractFactory('BoardOfDirectors')
    const bodImplV2 = await BodFactory.connect(beaconOwner).deploy()
    await bodImplV2.waitForDeployment()

    expect(await beacon.implementation()).to.eq(await bodImplV1.getAddress())

    await expect(beacon.connect(beaconOwner).upgradeTo(await bodImplV2.getAddress()))
      .to.emit(beacon, 'Upgraded')
      .withArgs(await bodImplV2.getAddress())

    expect(await beacon.implementation()).to.eq(await bodImplV2.getAddress())
  })

  it('preserves proxy storage (board members) after upgrade', async () => {
    const { beaconOwner, boardMember1, boardMember2, beacon, bodProxy } =
      await loadFixture(deployFixture)

    // State under the original implementation.
    const ownersBefore = await bodProxy.getOwners()
    expect(ownersBefore).to.include(boardMember1.address)
    expect(ownersBefore).to.include(boardMember2.address)

    // Upgrade to a freshly deployed implementation.
    const BodFactory = await ethers.getContractFactory('BoardOfDirectors')
    const bodImplV2 = await BodFactory.connect(beaconOwner).deploy()
    await bodImplV2.waitForDeployment()
    await beacon.connect(beaconOwner).upgradeTo(await bodImplV2.getAddress())

    // State remains after upgrade.
    const ownersAfter = await bodProxy.getOwners()
    expect(ownersAfter).to.have.lengthOf(ownersBefore.length)
    expect(ownersAfter).to.include(boardMember1.address)
    expect(ownersAfter).to.include(boardMember2.address)
  })

  it('reverts when a non-owner attempts the upgrade', async () => {
    const { beaconOwner, attacker, beacon } = await loadFixture(deployFixture)

    const BodFactory = await ethers.getContractFactory('BoardOfDirectors')
    const bodImplV2 = await BodFactory.connect(beaconOwner).deploy()
    await bodImplV2.waitForDeployment()

    await expect(
      beacon.connect(attacker).upgradeTo(await bodImplV2.getAddress())
    ).to.be.revertedWithCustomError(beacon, 'OwnableUnauthorizedAccount')
  })

  it('rejects upgrading to a non-contract implementation address', async () => {
    const { beaconOwner, attacker, beacon } = await loadFixture(deployFixture)

    await expect(
      beacon.connect(beaconOwner).upgradeTo(attacker.address)
    ).to.be.revertedWithCustomError(beacon, 'BeaconInvalidImplementation')
  })
})

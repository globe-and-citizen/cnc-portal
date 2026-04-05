import { ethers } from 'hardhat'
import { expect } from 'chai'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ZeroAddress } from 'ethers'

/**
 * Exercises the semantics of ignition/modules/CashRemunerationUpgradeModule.ts:
 *   1. Deploy a new CashRemunerationEIP712 implementation.
 *   2. Point the existing FactoryBeacon at it via upgradeTo.
 *   3. Verify that a proxy deployed against the factory beacon observes the new
 *      code while preserving its storage (owner, supported tokens).
 *   4. Verify access control: only the factory beacon owner can upgrade.
 */
describe('CashRemunerationEIP712UpgradeModule', function () {
  async function deployFixture() {
    const [beaconOwner, proxyOwner, attacker] = await ethers.getSigners()

    const MockToken = await ethers.getContractFactory('MockERC20')
    const usdc = await MockToken.connect(beaconOwner).deploy('USDC', 'USDC')
    await usdc.waitForDeployment()

    // Deploy the initial CashRemunerationEIP712 implementation.
    const CashRemunerationFactory = await ethers.getContractFactory('CashRemunerationEIP712')
    const implV1 = await CashRemunerationFactory.connect(beaconOwner).deploy()
    await implV1.waitForDeployment()

    // Deploy the FactoryBeacon that the upgrade module will later upgrade.
    const FactoryBeaconFactory = await ethers.getContractFactory('FactoryBeacon')
    const factoryBeacon = await FactoryBeaconFactory.connect(beaconOwner).deploy(
      await implV1.getAddress()
    )
    await factoryBeacon.waitForDeployment()

    // Create a CashRemuneration proxy via the factory beacon and initialize it.
    const initData = implV1.interface.encodeFunctionData('initialize', [
      proxyOwner.address,
      [await usdc.getAddress()]
    ])
    const tx = await factoryBeacon.connect(proxyOwner).createBeaconProxy(initData)
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
    const cashRemunerationProxy = await ethers.getContractAt(
      'CashRemunerationEIP712',
      proxyAddress
    )

    return {
      beaconOwner,
      proxyOwner,
      attacker,
      usdc,
      implV1,
      factoryBeacon,
      cashRemunerationProxy
    }
  }

  it('deploys a new CashRemunerationEIP712 implementation via the upgrade module flow', async () => {
    const { beaconOwner, implV1 } = await loadFixture(deployFixture)

    const CashRemunerationFactory = await ethers.getContractFactory('CashRemunerationEIP712')
    const implV2 = await CashRemunerationFactory.connect(beaconOwner).deploy()
    await implV2.waitForDeployment()

    expect(await implV2.getAddress()).to.properAddress
    expect(await implV2.getAddress()).to.not.eq(await implV1.getAddress())
  })

  it('upgrades the factory beacon to point at the new implementation', async () => {
    const { beaconOwner, factoryBeacon, implV1 } = await loadFixture(deployFixture)

    const CashRemunerationFactory = await ethers.getContractFactory('CashRemunerationEIP712')
    const implV2 = await CashRemunerationFactory.connect(beaconOwner).deploy()
    await implV2.waitForDeployment()

    expect(await factoryBeacon.implementation()).to.eq(await implV1.getAddress())

    await expect(factoryBeacon.connect(beaconOwner).upgradeTo(await implV2.getAddress()))
      .to.emit(factoryBeacon, 'Upgraded')
      .withArgs(await implV2.getAddress())

    expect(await factoryBeacon.implementation()).to.eq(await implV2.getAddress())
  })

  it('preserves proxy storage (owner, supported tokens) after the upgrade', async () => {
    const { beaconOwner, proxyOwner, usdc, factoryBeacon, cashRemunerationProxy } =
      await loadFixture(deployFixture)

    // Pre-upgrade state.
    expect(await cashRemunerationProxy.owner()).to.eq(proxyOwner.address)
    expect(await cashRemunerationProxy.isTokenSupported(await usdc.getAddress())).to.eq(true)
    const supportedBefore = await cashRemunerationProxy.getSupportedTokens()

    // Upgrade to a freshly-deployed implementation.
    const CashRemunerationFactory = await ethers.getContractFactory('CashRemunerationEIP712')
    const implV2 = await CashRemunerationFactory.connect(beaconOwner).deploy()
    await implV2.waitForDeployment()
    await factoryBeacon.connect(beaconOwner).upgradeTo(await implV2.getAddress())

    // State remains after upgrade.
    expect(await cashRemunerationProxy.owner()).to.eq(proxyOwner.address)
    expect(await cashRemunerationProxy.isTokenSupported(await usdc.getAddress())).to.eq(true)
    const supportedAfter = await cashRemunerationProxy.getSupportedTokens()
    expect(supportedAfter).to.have.lengthOf(supportedBefore.length)
  })

  it('allows owner-only writes to still work after upgrade (storage compatibility)', async () => {
    const { beaconOwner, proxyOwner, factoryBeacon, cashRemunerationProxy } =
      await loadFixture(deployFixture)

    const CashRemunerationFactory = await ethers.getContractFactory('CashRemunerationEIP712')
    const implV2 = await CashRemunerationFactory.connect(beaconOwner).deploy()
    await implV2.waitForDeployment()
    await factoryBeacon.connect(beaconOwner).upgradeTo(await implV2.getAddress())

    // Add a new supported token via the owner — exercises storage writes on the new code.
    const MockToken = await ethers.getContractFactory('MockERC20')
    const dai = await MockToken.connect(beaconOwner).deploy('DAI', 'DAI')
    await dai.waitForDeployment()

    await cashRemunerationProxy.connect(proxyOwner).addTokenSupport(await dai.getAddress())
    expect(await cashRemunerationProxy.isTokenSupported(await dai.getAddress())).to.eq(true)
  })

  it('reverts when a non-owner attempts the upgrade', async () => {
    const { beaconOwner, attacker, factoryBeacon } = await loadFixture(deployFixture)

    const CashRemunerationFactory = await ethers.getContractFactory('CashRemunerationEIP712')
    const implV2 = await CashRemunerationFactory.connect(beaconOwner).deploy()
    await implV2.waitForDeployment()

    await expect(
      factoryBeacon.connect(attacker).upgradeTo(await implV2.getAddress())
    ).to.be.revertedWithCustomError(factoryBeacon, 'OwnableUnauthorizedAccount')
  })

  it('rejects upgrading to the zero address', async () => {
    const { beaconOwner, factoryBeacon } = await loadFixture(deployFixture)

    await expect(
      factoryBeacon.connect(beaconOwner).upgradeTo(ZeroAddress)
    ).to.be.revertedWithCustomError(factoryBeacon, 'BeaconInvalidImplementation')
  })
})

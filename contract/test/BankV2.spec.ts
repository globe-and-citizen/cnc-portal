import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'

describe.only('BankV2', () => {
  async function deployFixture() {
    const [superAdmin, user1, user2, user3] = await ethers.getSigners()

    // deploy tips as superadmin
    const TipsFactory = await ethers.getContractFactory('Tips')
    const tipsProxy = await upgrades.deployProxy(TipsFactory)
    await tipsProxy.waitForDeployment()

    // deploy bank impl
    const BankImplementationFactory = await ethers.getContractFactory('BankV2')
    const bankImplementation = await BankImplementationFactory.connect(superAdmin).deploy()
    await bankImplementation.waitForDeployment()

    const encodedInitialize = bankImplementation.interface.encodeFunctionData('initialize', [
      await tipsProxy.getAddress()
    ])

    // deploy admin beacon as superadmin
    const AdminBeaconFactory = await ethers.getContractFactory('AdminBeacon')
    const adminBeacon = await AdminBeaconFactory.connect(superAdmin).deploy(
      await bankImplementation.getAddress()
    )
    await adminBeacon.waitForDeployment()

    // deploy bank beacon proxy 1
    const BankBeaconProxy = await ethers.getContractFactory('UserBeaconProxy')
    const bankBeaconProxy1 = await BankBeaconProxy.connect(user1).deploy(
      await adminBeacon.getAddress(),
      encodedInitialize
    )
    await bankBeaconProxy1.waitForDeployment()

    // deploy bank beacon proxy 2
    const bankBeaconProxy2 = await BankBeaconProxy.connect(user2).deploy(
      await adminBeacon.getAddress(),
      encodedInitialize
    )
    await bankBeaconProxy2.waitForDeployment()

    return {
      superAdmin,
      user1,
      user2,
      user3,
      tipsProxy,
      bankBeaconProxy1,
      bankBeaconProxy2,
      adminBeacon,
      bankImplementation,
      encodedInitialize
    }
  }

  context('deployment', () => {
    it('should deploy correctly', async () => {
      const { superAdmin, adminBeacon, bankImplementation } = await loadFixture(deployFixture)

      expect(await adminBeacon.owner()).to.eq(superAdmin.address)
      expect(await adminBeacon.implementation()).to.eq(await bankImplementation.getAddress())
    })

    it('should deploy beacon proxy correctly', async () => {
      const { adminBeacon, user3, encodedInitialize, bankImplementation } =
        await loadFixture(deployFixture)

      const BankBeaconProxy = await ethers.getContractFactory('UserBeaconProxy')
      const bankBeaconProxy1 = await BankBeaconProxy.connect(user3).deploy(
        await adminBeacon.getAddress(),
        encodedInitialize
      )
      await bankBeaconProxy1.waitForDeployment()

      expect(await bankBeaconProxy1.getAddress()).to.exist
      const txResult = await user3.call({
        to: await bankBeaconProxy1.getAddress(),
        data: bankImplementation.interface.encodeFunctionData('owner')
      })
      const beaconProxyOwner = bankImplementation.interface.decodeFunctionResult('owner', txResult)
      expect(beaconProxyOwner[0]).to.eq(user3.address)
    })

    it('should set superAdmin correctly', async () => {
      const { superAdmin, adminBeacon } = await loadFixture(deployFixture)
      expect(await adminBeacon.owner()).to.eq(superAdmin.address)
    })
  })

  describe('upgrade', () => {
    it('should upgrade correctly', async () => {
      const { superAdmin, adminBeacon } = await loadFixture(deployFixture)

      // upgrade to new address
      const BankImplementationFactory = await ethers.getContractFactory('BankV2')
      const newImpl = await BankImplementationFactory.connect(superAdmin).deploy()
      await newImpl.waitForDeployment()
      const tx = await adminBeacon.connect(superAdmin).upgradeTo(await newImpl.getAddress())
      await tx.wait()

      expect(await adminBeacon.implementation()).to.eq(await newImpl.getAddress())
    })

    it('shouldnot upgrade if not admin', async () => {
      const { user1, adminBeacon } = await loadFixture(deployFixture)

      const BankImplementationFactory = await ethers.getContractFactory('BankV2')
      const newImpl = await BankImplementationFactory.connect(user1).deploy()
      await newImpl.waitForDeployment()
      await expect(
        adminBeacon.connect(user1).upgradeTo(await newImpl.getAddress())
      ).to.be.revertedWithCustomError(adminBeacon, 'OwnableUnauthorizedAccount')
    })
  })

  describe('bank functions', () => {
    it('should read correctly', async () => {
      const { user1, bankBeaconProxy1, bankImplementation } = await loadFixture(deployFixture)

      const tx = await user1.call({
        to: await bankBeaconProxy1.getAddress(),
        data: bankImplementation.interface.encodeFunctionData('paused')
      })
      const paused = bankImplementation.interface.decodeFunctionResult('paused', tx)
      expect(paused[0]).to.eq(false)
    })

    it('should write correctly', async () => {
      const { user1, bankBeaconProxy1, bankImplementation } = await loadFixture(deployFixture)

      await user1.sendTransaction({
        to: await bankBeaconProxy1.getAddress(),
        data: bankImplementation.interface.encodeFunctionData('pause')
      })

      const tx = await user1.call({
        to: await bankBeaconProxy1.getAddress(),
        data: bankImplementation.interface.encodeFunctionData('paused')
      })
      const paused = bankImplementation.interface.decodeFunctionResult('paused', tx)
      expect(paused[0]).to.eq(true)
    })

    it('shouldnot be able to write if not owner', async () => {
      const { user2, bankBeaconProxy1, bankImplementation } = await loadFixture(deployFixture)

      await expect(
        user2.call({
          to: await bankBeaconProxy1.getAddress(),
          data: bankImplementation.interface.encodeFunctionData('pause')
        })
      ).to.revertedWithCustomError(bankImplementation, 'OwnableUnauthorizedAccount')

      const tx = await user2.call({
        to: await bankBeaconProxy1.getAddress(),
        data: bankImplementation.interface.encodeFunctionData('paused')
      })
      const paused = bankImplementation.interface.decodeFunctionResult('paused', tx)
      expect(paused[0]).to.eq(false)
    })
  })
})

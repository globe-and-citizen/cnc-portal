import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'

describe('BankBeacon', () => {
  async function deployFixture() {
    const [superAdmin, user1, user2, user3] = await ethers.getSigners()

    // deploy bank impl
    const BankImplementationFactory = await ethers.getContractFactory('Bank')
    const bankImplementation = await BankImplementationFactory.connect(superAdmin).deploy()
    await bankImplementation.waitForDeployment()

    // Empty token array for initialization (no initial supported tokens)
    const emptyTokenArray: string[] = []

    const encodedInitializeAdmin = bankImplementation.interface.encodeFunctionData('initialize', [
      emptyTokenArray,
      await superAdmin.getAddress()
    ])

    const encodedInitializeUser1 = bankImplementation.interface.encodeFunctionData('initialize', [
      emptyTokenArray,
      await user1.getAddress()
    ])

    const encodedInitializeUser2 = bankImplementation.interface.encodeFunctionData('initialize', [
      emptyTokenArray,
      await user2.getAddress()
    ])

    const encodedInitializeUser3 = bankImplementation.interface.encodeFunctionData('initialize', [
      emptyTokenArray,
      await user3.getAddress()
    ])

    // deploy admin beacon as superadmin
    const BeaconFactory = await ethers.getContractFactory('Beacon')
    const beacon = await BeaconFactory.connect(superAdmin).deploy(
      await bankImplementation.getAddress()
    )
    await beacon.waitForDeployment()

    // deploy bank beacon proxy 1
    const BankBeaconProxy = await ethers.getContractFactory('UserBeaconProxy')
    const bankBeaconProxy1 = await BankBeaconProxy.connect(user1).deploy(
      await beacon.getAddress(),
      encodedInitializeUser1
    )
    await bankBeaconProxy1.waitForDeployment()

    // deploy bank beacon proxy 2
    const bankBeaconProxy2 = await BankBeaconProxy.connect(user2).deploy(
      await beacon.getAddress(),
      encodedInitializeUser2
    )
    await bankBeaconProxy2.waitForDeployment()

    return {
      superAdmin,
      user1,
      user2,
      user3,
      bankBeaconProxy1,
      bankBeaconProxy2,
      beacon,
      bankImplementation,
      encodedInitializeAdmin,
      encodedInitializeUser1,
      encodedInitializeUser2,
      encodedInitializeUser3
    }
  }

  context('deployment', () => {
    it('should deploy correctly', async () => {
      const { superAdmin, beacon, bankImplementation } = await loadFixture(deployFixture)

      expect(await beacon.owner()).to.eq(superAdmin.address)
      expect(await beacon.implementation()).to.eq(await bankImplementation.getAddress())
    })

    it('should deploy beacon proxy correctly', async () => {
      const { beacon, user3, encodedInitializeUser3 } = await loadFixture(deployFixture)

      const BankBeaconProxy = await ethers.getContractFactory('UserBeaconProxy')
      const beaconProxy = await BankBeaconProxy.connect(user3).deploy(
        await beacon.getAddress(),
        encodedInitializeUser3
      )
      await beaconProxy.waitForDeployment()

      const bankBeaconProxy = await ethers.getContractAt('Bank', await beaconProxy.getAddress())

      expect(await bankBeaconProxy.getAddress()).to.exist
      const owner = await bankBeaconProxy.owner()
      expect(owner).to.eq(user3.address)
    })

    it('should set superAdmin correctly', async () => {
      const { superAdmin, beacon } = await loadFixture(deployFixture)
      expect(await beacon.owner()).to.eq(superAdmin.address)
    })
  })

  describe('upgrade', () => {
    it('should upgrade correctly', async () => {
      const { superAdmin, beacon } = await loadFixture(deployFixture)

      // upgrade to new address
      const BankImplementationFactory = await ethers.getContractFactory('Bank')
      const newImpl = await BankImplementationFactory.connect(superAdmin).deploy()
      await newImpl.waitForDeployment()
      const tx = await beacon.connect(superAdmin).upgradeTo(await newImpl.getAddress())
      await tx.wait()

      expect(await beacon.implementation()).to.eq(await newImpl.getAddress())
    })

    it('should not upgrade if not admin', async () => {
      const { user1, beacon } = await loadFixture(deployFixture)

      const BankImplementationFactory = await ethers.getContractFactory('Bank')
      const newImpl = await BankImplementationFactory.connect(user1).deploy()
      await newImpl.waitForDeployment()
      await expect(
        beacon.connect(user1).upgradeTo(await newImpl.getAddress())
      ).to.be.revertedWithCustomError(beacon, 'OwnableUnauthorizedAccount')
    })
  })

  describe('bank functions', () => {
    it('should read correctly', async () => {
      const { bankBeaconProxy1 } = await loadFixture(deployFixture)

      const bankBeacon = await ethers.getContractAt('Bank', await bankBeaconProxy1.getAddress())
      const paused = await bankBeacon.paused()
      expect(paused).to.be.false
    })

    it('should write correctly', async () => {
      const { user1, bankBeaconProxy1 } = await loadFixture(deployFixture)
      const bankBeaconProxy = await ethers.getContractAt(
        'Bank',
        await bankBeaconProxy1.getAddress()
      )
      // Pause - Write to the blockhcain
      await bankBeaconProxy.connect(user1).pause()

      const paused = await bankBeaconProxy.paused()
      expect(paused).to.be.true
    })

    it('should not be able to write if not owner', async () => {
      const { user2, bankBeaconProxy1, bankImplementation } = await loadFixture(deployFixture)

      const bankBeaconProxy = await ethers.getContractAt(
        'Bank',
        await bankBeaconProxy1.getAddress()
      )
      await expect(bankBeaconProxy.connect(user2).pause()).to.be.revertedWithCustomError(
        bankImplementation,
        'OwnableUnauthorizedAccount'
      )

      const paused = await bankBeaconProxy.connect(user2).paused()
      expect(paused).to.be.false
    })
  })
})

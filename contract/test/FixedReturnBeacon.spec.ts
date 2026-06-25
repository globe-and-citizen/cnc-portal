import { ethers } from 'hardhat'
import { expect } from 'chai'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'

describe('FixedReturnBeacon', () => {
  async function deployFixture() {
    const [superAdmin, user1, user2, user3] = await ethers.getSigners()

    // deploy FixedReturn impl
    const FixedReturnImplementationFactory = await ethers.getContractFactory('FixedReturn')
    const fixedReturnImplementation =
      await FixedReturnImplementationFactory.connect(superAdmin).deploy()
    await fixedReturnImplementation.waitForDeployment()

    const encodedInitializeAdmin = fixedReturnImplementation.interface.encodeFunctionData(
      'initialize',
      [await superAdmin.getAddress()]
    )

    const encodedInitializeUser1 = fixedReturnImplementation.interface.encodeFunctionData(
      'initialize',
      [await user1.getAddress()]
    )

    const encodedInitializeUser2 = fixedReturnImplementation.interface.encodeFunctionData(
      'initialize',
      [await user2.getAddress()]
    )

    const encodedInitializeUser3 = fixedReturnImplementation.interface.encodeFunctionData(
      'initialize',
      [await user3.getAddress()]
    )

    // deploy admin beacon as superadmin
    const BeaconFactory = await ethers.getContractFactory('Beacon')
    const beacon = await BeaconFactory.connect(superAdmin).deploy(
      await fixedReturnImplementation.getAddress()
    )
    await beacon.waitForDeployment()

    // deploy FixedReturn beacon proxy 1
    const FixedReturnBeaconProxy = await ethers.getContractFactory('UserBeaconProxy')
    const fixedReturnBeaconProxy1 = await FixedReturnBeaconProxy.connect(user1).deploy(
      await beacon.getAddress(),
      encodedInitializeUser1
    )
    await fixedReturnBeaconProxy1.waitForDeployment()

    // deploy FixedReturn beacon proxy 2
    const fixedReturnBeaconProxy2 = await FixedReturnBeaconProxy.connect(user2).deploy(
      await beacon.getAddress(),
      encodedInitializeUser2
    )
    await fixedReturnBeaconProxy2.waitForDeployment()

    return {
      superAdmin,
      user1,
      user2,
      user3,
      fixedReturnBeaconProxy1,
      fixedReturnBeaconProxy2,
      beacon,
      fixedReturnImplementation,
      encodedInitializeAdmin,
      encodedInitializeUser1,
      encodedInitializeUser2,
      encodedInitializeUser3
    }
  }

  context('deployment', () => {
    it('should deploy correctly', async () => {
      const { superAdmin, beacon, fixedReturnImplementation } = await loadFixture(deployFixture)

      expect(await beacon.owner()).to.eq(superAdmin.address)
      expect(await beacon.implementation()).to.eq(await fixedReturnImplementation.getAddress())
    })

    it('should deploy beacon proxy correctly', async () => {
      const { beacon, user3, encodedInitializeUser3 } = await loadFixture(deployFixture)

      const FixedReturnBeaconProxy = await ethers.getContractFactory('UserBeaconProxy')
      const beaconProxy = await FixedReturnBeaconProxy.connect(user3).deploy(
        await beacon.getAddress(),
        encodedInitializeUser3
      )
      await beaconProxy.waitForDeployment()

      const fixedReturnBeaconProxy = await ethers.getContractAt(
        'FixedReturn',
        await beaconProxy.getAddress()
      )

      expect(await fixedReturnBeaconProxy.getAddress()).to.exist
      const owner = await fixedReturnBeaconProxy.owner()
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
      const FixedReturnImplementationFactory = await ethers.getContractFactory('FixedReturn')
      const newImpl = await FixedReturnImplementationFactory.connect(superAdmin).deploy()
      await newImpl.waitForDeployment()
      const tx = await beacon.connect(superAdmin).upgradeTo(await newImpl.getAddress())
      await tx.wait()

      expect(await beacon.implementation()).to.eq(await newImpl.getAddress())
    })

    it('should not upgrade if not admin', async () => {
      const { user1, beacon } = await loadFixture(deployFixture)

      const FixedReturnImplementationFactory = await ethers.getContractFactory('FixedReturn')
      const newImpl = await FixedReturnImplementationFactory.connect(user1).deploy()
      await newImpl.waitForDeployment()
      await expect(
        beacon.connect(user1).upgradeTo(await newImpl.getAddress())
      ).to.be.revertedWithCustomError(beacon, 'OwnableUnauthorizedAccount')
    })
  })

  describe('fixedReturn functions', () => {
    it('should read correctly', async () => {
      const { fixedReturnBeaconProxy1 } = await loadFixture(deployFixture)

      const fixedReturnBeacon = await ethers.getContractAt(
        'FixedReturn',
        await fixedReturnBeaconProxy1.getAddress()
      )
      expect(await fixedReturnBeacon.totalOfferings()).to.eq(0)
    })

    it('should write correctly', async () => {
      const { user1, fixedReturnBeaconProxy1 } = await loadFixture(deployFixture)
      const fixedReturnBeaconProxy = await ethers.getContractAt(
        'FixedReturn',
        await fixedReturnBeaconProxy1.getAddress()
      )

      const MockToken = await ethers.getContractFactory('MockERC20')
      const token = await MockToken.deploy('Mock USDC', 'mUSDC')
      await token.waitForDeployment()

      // addTokenSupport - write to the blockchain
      await fixedReturnBeaconProxy.connect(user1).addTokenSupport(await token.getAddress())

      expect(await fixedReturnBeaconProxy.isTokenSupported(await token.getAddress())).to.be.true
    })

    it('should not be able to write if not owner', async () => {
      const { user2, fixedReturnBeaconProxy1, fixedReturnImplementation } =
        await loadFixture(deployFixture)

      const fixedReturnBeaconProxy = await ethers.getContractAt(
        'FixedReturn',
        await fixedReturnBeaconProxy1.getAddress()
      )

      const MockToken = await ethers.getContractFactory('MockERC20')
      const token = await MockToken.deploy('Mock USDC', 'mUSDC')
      await token.waitForDeployment()

      await expect(
        fixedReturnBeaconProxy.connect(user2).addTokenSupport(await token.getAddress())
      ).to.be.revertedWithCustomError(fixedReturnImplementation, 'OwnableUnauthorizedAccount')

      expect(await fixedReturnBeaconProxy.isTokenSupported(await token.getAddress())).to.be.false
    })
  })
})

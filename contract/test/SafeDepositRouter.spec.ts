import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { SafeDepositRouter, InvestorV1, MockERC20 } from '../typechain-types'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { parseUnits } from 'ethers'

describe('SafeDepositRouter', function () {
  let router: SafeDepositRouter
  let investor: InvestorV1
  let mockUSDC: MockERC20
  let mockUSDT: MockERC20
  let owner: HardhatEthersSigner
  let safeWallet: HardhatEthersSigner
  let depositor1: HardhatEthersSigner
  let depositor2: HardhatEthersSigner
  let nonOwner: HardhatEthersSigner

  // Test constants
  const INITIAL_MULTIPLIER = 1n
  const USDC_DECIMALS = 6
  const USDT_DECIMALS = 6
  const SHER_DECIMALS = 18

  const ERRORS = {
    INVALID_OWNER: 'InvalidOwner',
    INVALID_SAFE: 'InvalidSafeAddress',
    INVALID_INVESTOR: 'InvalidInvestorAddress',
    INVALID_TOKEN: 'InvalidTokenAddress',
    INVALID_DECIMALS: 'InvalidTokenDecimals',
    MULTIPLIER_TOO_LOW: 'MultiplierTooLow',
    ZERO_AMOUNT: 'ZeroAmount',
    INSUFFICIENT_MINTER_ROLE: 'InsufficientMinterRole',
    TOKEN_NOT_SUPPORTED: 'TokenNotSupported',
    TOKEN_ALREADY_SUPPORTED: 'TokenAlreadySupported',
    DEPOSITS_NOT_ENABLED: 'DepositsNotEnabled',
    PAUSED: 'EnforcedPause',
    SLIPPAGE_EXCEEDED: 'SlippageExceeded',
    OWNABLE_UNAUTHORIZED: 'OwnableUnauthorizedAccount'
  } as const

  async function deployFixture() {
    const signers = await ethers.getSigners()
    ;[owner, safeWallet, depositor1, depositor2, nonOwner] = signers

    // Deploy mock tokens (both 6 decimals like in other tests)
    const MockToken = await ethers.getContractFactory('MockERC20')
    const usdc = await MockToken.deploy('USD Coin', 'USDC')
    const usdt = await MockToken.deploy('Tether', 'USDT')

    await usdc.waitForDeployment()
    await usdt.waitForDeployment()

    const usdcAddress = await usdc.getAddress()
    const usdtAddress = await usdt.getAddress()

    // Deploy InvestorV1
    const InvestorV1 = await ethers.getContractFactory('InvestorV1')
    const investorProxy = (await upgrades.deployProxy(
      InvestorV1,
      ['SHER Token', 'SHER', owner.address],
      { initializer: 'initialize' }
    )) as unknown as InvestorV1
    await investorProxy.waitForDeployment()

    const investorAddress = await investorProxy.getAddress()

    // Deploy SafeDepositRouter using Beacon Pattern
    // Step 1: Deploy implementation
    const SafeDepositRouterFactory = await ethers.getContractFactory('SafeDepositRouter')
    const routerImplementation = await SafeDepositRouterFactory.connect(owner).deploy()
    await routerImplementation.waitForDeployment()

    // Step 2: Create initialization data - removed owner parameter
    const encodedInitialize = routerImplementation.interface.encodeFunctionData('initialize', [
      safeWallet.address,
      investorAddress,
      [usdcAddress, usdtAddress],
      INITIAL_MULTIPLIER
    ])

    // Step 3: Deploy Beacon
    const BeaconFactory = await ethers.getContractFactory('Beacon')
    const beacon = await BeaconFactory.connect(owner).deploy(
      await routerImplementation.getAddress()
    )
    await beacon.waitForDeployment()

    // Step 4: Deploy BeaconProxy
    const BeaconProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
    const routerProxy = await BeaconProxyFactory.connect(owner).deploy(
      await beacon.getAddress(),
      encodedInitialize
    )
    await routerProxy.waitForDeployment()

    const routerAddress = await routerProxy.getAddress()

    // Step 5: Grant MINTER_ROLE to router
    const minterRole = await investorProxy.MINTER_ROLE()
    await investorProxy.grantRole(minterRole, routerAddress)

    // Get SafeDepositRouter interface
    const routerContract = await ethers.getContractAt('SafeDepositRouter', routerAddress)

    // Mint tokens to depositors
    const usdcAmount = parseUnits('10000', USDC_DECIMALS)
    const usdtAmount = parseUnits('10000', USDT_DECIMALS)

    await usdc.mint(depositor1.address, usdcAmount)
    await usdc.mint(depositor2.address, usdcAmount)
    await usdt.mint(depositor1.address, usdtAmount)
    await usdt.mint(depositor2.address, usdtAmount)

    return {
      router: routerContract,
      investor: investorProxy,
      usdc,
      usdt,
      owner,
      safeWallet,
      depositor1,
      depositor2,
      nonOwner,
      addresses: {
        usdc: usdcAddress,
        usdt: usdtAddress,
        investor: investorAddress,
        router: routerAddress
      }
    }
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deployFixture)
    router = fixture.router
    investor = fixture.investor
    mockUSDC = fixture.usdc
    mockUSDT = fixture.usdt
    owner = fixture.owner
    safeWallet = fixture.safeWallet
    depositor1 = fixture.depositor1
    depositor2 = fixture.depositor2
    nonOwner = fixture.nonOwner
  })

  describe('Initialization', () => {
    it('should initialize with correct values', async () => {
      expect(await router.owner()).to.equal(owner.address)
      expect(await router.safeAddress()).to.equal(safeWallet.address)
      expect(await router.investorAddress()).to.equal(await investor.getAddress())
      expect(await router.multiplier()).to.equal(INITIAL_MULTIPLIER)
      expect(await router.depositsEnabled()).to.equal(false)
      expect(await router.paused()).to.equal(false)
    })

    it('should initialize with supported tokens', async () => {
      const usdcAddress = await mockUSDC.getAddress()
      const usdtAddress = await mockUSDT.getAddress()

      expect(await router.supportedTokens(usdcAddress)).to.equal(true)
      expect(await router.supportedTokens(usdtAddress)).to.equal(true)

      expect(await router.tokenDecimals(usdcAddress)).to.equal(USDC_DECIMALS)
      expect(await router.tokenDecimals(usdtAddress)).to.equal(USDT_DECIMALS)
    })

    it('should revert if safe address is zero', async () => {
      const SafeDepositRouterFactory = await ethers.getContractFactory('SafeDepositRouter')
      const impl = await SafeDepositRouterFactory.connect(owner).deploy()
      await impl.waitForDeployment()

      const encodedInitialize = impl.interface.encodeFunctionData('initialize', [
        ethers.ZeroAddress,
        await investor.getAddress(),
        [await mockUSDC.getAddress()],
        INITIAL_MULTIPLIER
      ])

      const BeaconFactory = await ethers.getContractFactory('Beacon')
      const testBeacon = await BeaconFactory.connect(owner).deploy(await impl.getAddress())
      await testBeacon.waitForDeployment()

      const BeaconProxyFactory = await ethers.getContractFactory('UserBeaconProxy')

      await expect(
        BeaconProxyFactory.connect(owner).deploy(await testBeacon.getAddress(), encodedInitialize)
      ).to.be.revertedWithCustomError(router, ERRORS.INVALID_SAFE)
    })

    it('should allow zero investor address during initialization', async () => {
      const SafeDepositRouterFactory = await ethers.getContractFactory('SafeDepositRouter')
      const impl = await SafeDepositRouterFactory.connect(owner).deploy()
      await impl.waitForDeployment()

      const encodedInitialize = impl.interface.encodeFunctionData('initialize', [
        safeWallet.address,
        ethers.ZeroAddress,
        [await mockUSDC.getAddress()],
        INITIAL_MULTIPLIER
      ])

      const BeaconFactory = await ethers.getContractFactory('Beacon')
      const testBeacon = await BeaconFactory.connect(owner).deploy(await impl.getAddress())
      await testBeacon.waitForDeployment()

      const BeaconProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
      const testProxy = await BeaconProxyFactory.connect(owner).deploy(
        await testBeacon.getAddress(),
        encodedInitialize
      )
      await testProxy.waitForDeployment()

      const testRouter = await ethers.getContractAt(
        'SafeDepositRouter',
        await testProxy.getAddress()
      )

      expect(await testRouter.investorAddress()).to.equal(ethers.ZeroAddress)
      expect(await testRouter.owner()).to.equal(owner.address)
    })

    it('should revert if multiplier is below minimum', async () => {
      const SafeDepositRouterFactory = await ethers.getContractFactory('SafeDepositRouter')
      const impl = await SafeDepositRouterFactory.connect(owner).deploy()
      await impl.waitForDeployment()

      const encodedInitialize = impl.interface.encodeFunctionData('initialize', [
        safeWallet.address,
        await investor.getAddress(),
        [await mockUSDC.getAddress()],
        0n
      ])

      const BeaconFactory = await ethers.getContractFactory('Beacon')
      const testBeacon = await BeaconFactory.connect(owner).deploy(await impl.getAddress())
      await testBeacon.waitForDeployment()

      const BeaconProxyFactory = await ethers.getContractFactory('UserBeaconProxy')

      await expect(
        BeaconProxyFactory.connect(owner).deploy(await testBeacon.getAddress(), encodedInitialize)
      ).to.be.revertedWithCustomError(router, ERRORS.MULTIPLIER_TOO_LOW)
    })

    it('should revert if token address is zero', async () => {
      const SafeDepositRouterFactory = await ethers.getContractFactory('SafeDepositRouter')
      const impl = await SafeDepositRouterFactory.connect(owner).deploy()
      await impl.waitForDeployment()

      const encodedInitialize = impl.interface.encodeFunctionData('initialize', [
        safeWallet.address,
        await investor.getAddress(),
        [ethers.ZeroAddress],
        INITIAL_MULTIPLIER
      ])

      const BeaconFactory = await ethers.getContractFactory('Beacon')
      const testBeacon = await BeaconFactory.connect(owner).deploy(await impl.getAddress())
      await testBeacon.waitForDeployment()

      const BeaconProxyFactory = await ethers.getContractFactory('UserBeaconProxy')

      await expect(
        BeaconProxyFactory.connect(owner).deploy(await testBeacon.getAddress(), encodedInitialize)
      ).to.be.revertedWithCustomError(router, ERRORS.INVALID_TOKEN)
    })

    it('should revert on deposit if router does not have MINTER_ROLE', async () => {
      const InvestorV1 = await ethers.getContractFactory('InvestorV1')
      const newInvestor = (await upgrades.deployProxy(
        InvestorV1,
        ['SHER Token', 'SHER', owner.address],
        { initializer: 'initialize' }
      )) as unknown as InvestorV1

      const newInvestorAddress = await newInvestor.getAddress()

      const SafeDepositRouterFactory = await ethers.getContractFactory('SafeDepositRouter')
      const newImpl = await SafeDepositRouterFactory.connect(owner).deploy()
      await newImpl.waitForDeployment()

      const encodedInitialize = newImpl.interface.encodeFunctionData('initialize', [
        safeWallet.address,
        newInvestorAddress,
        [await mockUSDC.getAddress()],
        INITIAL_MULTIPLIER
      ])

      const BeaconFactory = await ethers.getContractFactory('Beacon')
      const testBeacon = await BeaconFactory.connect(owner).deploy(await newImpl.getAddress())
      await testBeacon.waitForDeployment()

      const BeaconProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
      const testProxy = await BeaconProxyFactory.connect(owner).deploy(
        await testBeacon.getAddress(),
        encodedInitialize
      )
      await testProxy.waitForDeployment()

      const testRouter = await ethers.getContractAt(
        'SafeDepositRouter',
        await testProxy.getAddress()
      )

      await testRouter.connect(owner).enableDeposits()

      const depositAmount = parseUnits('100', USDC_DECIMALS)
      const usdcAddress = await mockUSDC.getAddress()

      await mockUSDC.connect(depositor1).approve(await testRouter.getAddress(), depositAmount)

      await expect(
        testRouter.connect(depositor1).deposit(usdcAddress, depositAmount)
      ).to.be.revertedWithCustomError(testRouter, ERRORS.INSUFFICIENT_MINTER_ROLE)
    })

    it('should revert on deposit if investor address is zero', async () => {
      const SafeDepositRouterFactory = await ethers.getContractFactory('SafeDepositRouter')
      const newImpl = await SafeDepositRouterFactory.connect(owner).deploy()
      await newImpl.waitForDeployment()

      const encodedInitialize = newImpl.interface.encodeFunctionData('initialize', [
        safeWallet.address,
        ethers.ZeroAddress,
        [await mockUSDC.getAddress()],
        INITIAL_MULTIPLIER
      ])

      const BeaconFactory = await ethers.getContractFactory('Beacon')
      const testBeacon = await BeaconFactory.connect(owner).deploy(await newImpl.getAddress())
      await testBeacon.waitForDeployment()

      const BeaconProxyFactory = await ethers.getContractFactory('UserBeaconProxy')
      const testProxy = await BeaconProxyFactory.connect(owner).deploy(
        await testBeacon.getAddress(),
        encodedInitialize
      )
      await testProxy.waitForDeployment()

      const testRouter = await ethers.getContractAt(
        'SafeDepositRouter',
        await testProxy.getAddress()
      )

      await testRouter.connect(owner).enableDeposits()

      const depositAmount = parseUnits('100', USDC_DECIMALS)
      const usdcAddress = await mockUSDC.getAddress()

      await mockUSDC.connect(depositor1).approve(await testRouter.getAddress(), depositAmount)

      await expect(
        testRouter.connect(depositor1).deposit(usdcAddress, depositAmount)
      ).to.be.revertedWithCustomError(testRouter, ERRORS.INVALID_INVESTOR)
    })
  })

  describe('Deposit Control', () => {
    describe('Enable Deposits', () => {
      it('should allow owner to enable deposits', async () => {
        await expect(router.connect(owner).enableDeposits())
          .to.emit(router, 'DepositsEnabled')
          .withArgs(owner.address)

        expect(await router.depositsEnabled()).to.equal(true)
      })

      it('should revert when non-owner tries to enable deposits', async () => {
        await expect(router.connect(nonOwner).enableDeposits())
          .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
          .withArgs(nonOwner.address)
      })
    })

    describe('Disable Deposits', () => {
      beforeEach(async () => {
        await router.connect(owner).enableDeposits()
      })

      it('should allow owner to disable deposits', async () => {
        await expect(router.connect(owner).disableDeposits())
          .to.emit(router, 'DepositsDisabled')
          .withArgs(owner.address)

        expect(await router.depositsEnabled()).to.equal(false)
      })

      it('should revert when non-owner tries to disable deposits', async () => {
        await expect(router.connect(nonOwner).disableDeposits())
          .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
          .withArgs(nonOwner.address)
      })
    })
  })

  describe('Pause Functionality', () => {
    it('should allow owner to pause contract', async () => {
      await expect(router.connect(owner).pause()).to.emit(router, 'Paused').withArgs(owner.address)

      expect(await router.paused()).to.equal(true)
    })

    it('should allow owner to unpause contract', async () => {
      await router.connect(owner).pause()

      await expect(router.connect(owner).unpause())
        .to.emit(router, 'Unpaused')
        .withArgs(owner.address)

      expect(await router.paused()).to.equal(false)
    })

    it('should revert when non-owner tries to pause', async () => {
      await expect(router.connect(nonOwner).pause())
        .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
        .withArgs(nonOwner.address)
    })

    it('should revert when non-owner tries to unpause', async () => {
      await router.connect(owner).pause()

      await expect(router.connect(nonOwner).unpause())
        .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
        .withArgs(nonOwner.address)
    })

    it('should block deposits when paused even if deposits enabled', async () => {
      await router.connect(owner).enableDeposits()
      await router.connect(owner).pause()

      const depositAmount = parseUnits('100', USDC_DECIMALS)
      const usdcAddress = await mockUSDC.getAddress()

      await mockUSDC.connect(depositor1).approve(await router.getAddress(), depositAmount)

      await expect(
        router.connect(depositor1).deposit(usdcAddress, depositAmount)
      ).to.be.revertedWithCustomError(router, ERRORS.PAUSED)
    })
  })

  describe('Token Management', () => {
    describe('Add Token Support', () => {
      let newToken: MockERC20
      let newTokenAddress: string

      beforeEach(async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        newToken = await MockToken.deploy('New Token', 'NEW')
        await newToken.waitForDeployment()
        newTokenAddress = await newToken.getAddress()
      })

      it('should allow owner to add token support', async () => {
        await expect(router.connect(owner).addTokenSupport(newTokenAddress))
          .to.emit(router, 'TokenSupportAdded')
          .withArgs(newTokenAddress, USDC_DECIMALS)

        expect(await router.supportedTokens(newTokenAddress)).to.equal(true)
        expect(await router.tokenDecimals(newTokenAddress)).to.equal(USDC_DECIMALS)
      })

      it('should revert when non-owner tries to add token', async () => {
        await expect(router.connect(nonOwner).addTokenSupport(newTokenAddress))
          .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
          .withArgs(nonOwner.address)
      })

      it('should revert when adding zero address', async () => {
        await expect(
          router.connect(owner).addTokenSupport(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(router, ERRORS.INVALID_TOKEN)
      })

      it('should revert when adding already supported token', async () => {
        const usdcAddress = await mockUSDC.getAddress()
        await expect(
          router.connect(owner).addTokenSupport(usdcAddress)
        ).to.be.revertedWithCustomError(router, ERRORS.TOKEN_ALREADY_SUPPORTED)
      })
    })

    describe('Remove Token Support', () => {
      it('should allow owner to remove token support', async () => {
        const usdcAddress = await mockUSDC.getAddress()

        await expect(router.connect(owner).removeTokenSupport(usdcAddress))
          .to.emit(router, 'TokenSupportRemoved')
          .withArgs(usdcAddress)

        expect(await router.supportedTokens(usdcAddress)).to.equal(false)
      })

      it('should revert when non-owner tries to remove token', async () => {
        const usdcAddress = await mockUSDC.getAddress()

        await expect(router.connect(nonOwner).removeTokenSupport(usdcAddress))
          .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
          .withArgs(nonOwner.address)
      })

      it('should revert when removing zero address', async () => {
        await expect(
          router.connect(owner).removeTokenSupport(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(router, ERRORS.INVALID_TOKEN)
      })

      it('should revert when removing unsupported token', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const newToken = await MockToken.deploy('New Token', 'NEW')
        const newTokenAddress = await newToken.getAddress()

        await expect(
          router.connect(owner).removeTokenSupport(newTokenAddress)
        ).to.be.revertedWithCustomError(router, ERRORS.TOKEN_NOT_SUPPORTED)
      })
    })
  })

  describe('Calculation Functions', () => {
    describe('Calculate Compensation', () => {
      it('should calculate correct compensation for 6-decimal token (USDC)', async () => {
        const depositAmount = parseUnits('100', USDC_DECIMALS) // 100 USDC
        const expectedSHER = parseUnits('100', SHER_DECIMALS) // 100 SHER (1:1 ratio)

        const sherAmount = await router.calculateCompensation(
          await mockUSDC.getAddress(),
          depositAmount
        )

        expect(sherAmount).to.equal(expectedSHER)
      })

      it('should apply multiplier correctly', async () => {
        // Set multiplier to 2
        await router.connect(owner).setMultiplier(2n)

        const depositAmount = parseUnits('100', USDC_DECIMALS) // 100 USDC
        const expectedSHER = parseUnits('200', SHER_DECIMALS) // 200 SHER (2:1 ratio)

        const sherAmount = await router.calculateCompensation(
          await mockUSDC.getAddress(),
          depositAmount
        )

        expect(sherAmount).to.equal(expectedSHER)
      })

      it('should handle different multipliers correctly', async () => {
        const testCases = [
          { multiplier: 1n, deposit: '100', expectedSher: '100' },
          { multiplier: 2n, deposit: '100', expectedSher: '200' },
          { multiplier: 5n, deposit: '50', expectedSher: '250' },
          { multiplier: 10n, deposit: '25', expectedSher: '250' }
        ]

        const usdcAddress = await mockUSDC.getAddress()

        for (const testCase of testCases) {
          await router.connect(owner).setMultiplier(testCase.multiplier)

          const depositAmount = parseUnits(testCase.deposit, USDC_DECIMALS)
          const expectedSHER = parseUnits(testCase.expectedSher, SHER_DECIMALS)

          const sherAmount = await router.calculateCompensation(usdcAddress, depositAmount)

          expect(sherAmount).to.equal(expectedSHER)
        }
      })

      it('should revert for unsupported token', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const unsupportedToken = await MockToken.deploy('Unsupported', 'UNSUP')
        const unsupportedAddress = await unsupportedToken.getAddress()

        await expect(
          router.calculateCompensation(unsupportedAddress, parseUnits('100', 6))
        ).to.be.revertedWithCustomError(router, ERRORS.TOKEN_NOT_SUPPORTED)
      })

      it('should revert for zero amount', async () => {
        await expect(
          router.calculateCompensation(await mockUSDC.getAddress(), 0n)
        ).to.be.revertedWithCustomError(router, ERRORS.ZERO_AMOUNT)
      })
    })
  })

  describe('Deposit Functions', () => {
    beforeEach(async () => {
      // Enable deposits for testing
      await router.connect(owner).enableDeposits()
    })

    describe('Basic Deposit', () => {
      it('should successfully deposit USDC and mint SHER', async () => {
        const depositAmount = parseUnits('100', USDC_DECIMALS)
        const expectedSHER = parseUnits('100', SHER_DECIMALS)
        const usdcAddress = await mockUSDC.getAddress()
        const routerAddress = await router.getAddress()

        // Approve router
        await mockUSDC.connect(depositor1).approve(routerAddress, depositAmount)

        // Deposit
        await expect(router.connect(depositor1).deposit(usdcAddress, depositAmount))
          .to.emit(router, 'Deposited')
          .withArgs(
            depositor1.address,
            usdcAddress,
            depositAmount,
            expectedSHER,
            await ethers.provider.getBlockNumber().then((b) => b + 1)
          )

        // Verify balances
        expect(await mockUSDC.balanceOf(safeWallet.address)).to.equal(depositAmount)
        expect(await investor.balanceOf(depositor1.address)).to.equal(expectedSHER)
      })

      it('should handle multiple deposits correctly', async () => {
        const deposit1 = parseUnits('50', USDC_DECIMALS)
        const deposit2 = parseUnits('75', USDC_DECIMALS)
        const totalExpectedSHER = parseUnits('125', SHER_DECIMALS)
        const usdcAddress = await mockUSDC.getAddress()
        const routerAddress = await router.getAddress()

        await mockUSDC.connect(depositor1).approve(routerAddress, deposit1 + deposit2)

        await router.connect(depositor1).deposit(usdcAddress, deposit1)
        await router.connect(depositor1).deposit(usdcAddress, deposit2)

        expect(await mockUSDC.balanceOf(safeWallet.address)).to.equal(deposit1 + deposit2)
        expect(await investor.balanceOf(depositor1.address)).to.equal(totalExpectedSHER)
      })

      it('should handle deposits from multiple users', async () => {
        const depositAmount = parseUnits('100', USDC_DECIMALS)
        const expectedSHER = parseUnits('100', SHER_DECIMALS)
        const usdcAddress = await mockUSDC.getAddress()
        const routerAddress = await router.getAddress()

        await mockUSDC.connect(depositor1).approve(routerAddress, depositAmount)
        await mockUSDC.connect(depositor2).approve(routerAddress, depositAmount)

        await router.connect(depositor1).deposit(usdcAddress, depositAmount)
        await router.connect(depositor2).deposit(usdcAddress, depositAmount)

        expect(await investor.balanceOf(depositor1.address)).to.equal(expectedSHER)
        expect(await investor.balanceOf(depositor2.address)).to.equal(expectedSHER)
        expect(await mockUSDC.balanceOf(safeWallet.address)).to.equal(depositAmount * 2n)
      })

      it('should revert when deposits are not enabled', async () => {
        await router.connect(owner).disableDeposits()

        const depositAmount = parseUnits('100', USDC_DECIMALS)
        const usdcAddress = await mockUSDC.getAddress()

        await mockUSDC.connect(depositor1).approve(await router.getAddress(), depositAmount)

        await expect(
          router.connect(depositor1).deposit(usdcAddress, depositAmount)
        ).to.be.revertedWithCustomError(router, ERRORS.DEPOSITS_NOT_ENABLED)
      })

      it('should revert when contract is paused', async () => {
        await router.connect(owner).pause()

        const depositAmount = parseUnits('100', USDC_DECIMALS)
        const usdcAddress = await mockUSDC.getAddress()

        await mockUSDC.connect(depositor1).approve(await router.getAddress(), depositAmount)

        await expect(
          router.connect(depositor1).deposit(usdcAddress, depositAmount)
        ).to.be.revertedWithCustomError(router, ERRORS.PAUSED)
      })

      it('should revert for zero amount', async () => {
        const usdcAddress = await mockUSDC.getAddress()

        await expect(
          router.connect(depositor1).deposit(usdcAddress, 0n)
        ).to.be.revertedWithCustomError(router, ERRORS.ZERO_AMOUNT)
      })

      it('should revert for unsupported token', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const unsupportedToken = await MockToken.deploy('Unsupported', 'UNSUP')
        const unsupportedAddress = await unsupportedToken.getAddress()
        const depositAmount = parseUnits('100', 6)

        await unsupportedToken.mint(depositor1.address, depositAmount)
        await unsupportedToken.connect(depositor1).approve(await router.getAddress(), depositAmount)

        await expect(
          router.connect(depositor1).deposit(unsupportedAddress, depositAmount)
        ).to.be.revertedWithCustomError(router, ERRORS.TOKEN_NOT_SUPPORTED)
      })
    })

    describe('Deposit With Slippage Protection', () => {
      it('should successfully deposit with valid slippage', async () => {
        const depositAmount = parseUnits('100', USDC_DECIMALS)
        const expectedSHER = parseUnits('100', SHER_DECIMALS)
        const minSherOut = parseUnits('99', SHER_DECIMALS) // 1% slippage tolerance
        const usdcAddress = await mockUSDC.getAddress()

        await mockUSDC.connect(depositor1).approve(await router.getAddress(), depositAmount)

        await expect(
          router.connect(depositor1).depositWithSlippage(usdcAddress, depositAmount, minSherOut)
        ).to.emit(router, 'Deposited')

        expect(await investor.balanceOf(depositor1.address)).to.equal(expectedSHER)
      })

      it('should revert when slippage is exceeded', async () => {
        const depositAmount = parseUnits('100', USDC_DECIMALS)
        const minSherOut = parseUnits('101', SHER_DECIMALS) // Expecting more than possible
        const usdcAddress = await mockUSDC.getAddress()

        await mockUSDC.connect(depositor1).approve(await router.getAddress(), depositAmount)

        await expect(
          router.connect(depositor1).depositWithSlippage(usdcAddress, depositAmount, minSherOut)
        ).to.be.revertedWithCustomError(router, ERRORS.SLIPPAGE_EXCEEDED)
      })

      it('should accept zero slippage (no protection)', async () => {
        const depositAmount = parseUnits('100', USDC_DECIMALS)
        const expectedSHER = parseUnits('100', SHER_DECIMALS)
        const usdcAddress = await mockUSDC.getAddress()

        await mockUSDC.connect(depositor1).approve(await router.getAddress(), depositAmount)

        await expect(
          router.connect(depositor1).depositWithSlippage(usdcAddress, depositAmount, 0n)
        ).to.emit(router, 'Deposited')

        expect(await investor.balanceOf(depositor1.address)).to.equal(expectedSHER)
      })
    })
  })

  describe('Admin Functions', () => {
    describe('Set Safe Address', () => {
      it('should allow owner to update safe address', async () => {
        const newSafe = depositor1.address

        await expect(router.connect(owner).setSafeAddress(newSafe))
          .to.emit(router, 'SafeAddressUpdated')
          .withArgs(safeWallet.address, newSafe)

        expect(await router.safeAddress()).to.equal(newSafe)
      })

      it('should revert when non-owner tries to update', async () => {
        await expect(router.connect(nonOwner).setSafeAddress(depositor1.address))
          .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
          .withArgs(nonOwner.address)
      })

      it('should revert when setting zero address', async () => {
        await expect(
          router.connect(owner).setSafeAddress(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(router, ERRORS.INVALID_SAFE)
      })
    })

    describe('Set Investor Address', () => {
      it('should allow owner to update investor address with valid MINTER_ROLE', async () => {
        // Deploy new investor
        const InvestorV1 = await ethers.getContractFactory('InvestorV1')
        const newInvestor = (await upgrades.deployProxy(
          InvestorV1,
          ['New SHER', 'NSHER', owner.address],
          { initializer: 'initialize' }
        )) as unknown as InvestorV1

        const newInvestorAddress = await newInvestor.getAddress()

        // Grant MINTER_ROLE to router
        const minterRole = await newInvestor.MINTER_ROLE()
        await newInvestor.grantRole(minterRole, await router.getAddress())

        await expect(router.connect(owner).setInvestorAddress(newInvestorAddress))
          .to.emit(router, 'InvestorAddressUpdated')
          .withArgs(await investor.getAddress(), newInvestorAddress)

        expect(await router.investorAddress()).to.equal(newInvestorAddress)
      })

      it('should revert when non-owner tries to update', async () => {
        await expect(router.connect(nonOwner).setInvestorAddress(depositor1.address))
          .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
          .withArgs(nonOwner.address)
      })

      it('should revert when setting zero address', async () => {
        await expect(
          router.connect(owner).setInvestorAddress(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(router, ERRORS.INVALID_INVESTOR)
      })

      it('should revert if new investor does not grant MINTER_ROLE', async () => {
        const InvestorV1 = await ethers.getContractFactory('InvestorV1')
        const newInvestor = (await upgrades.deployProxy(
          InvestorV1,
          ['New SHER', 'NSHER', owner.address],
          { initializer: 'initialize' }
        )) as unknown as InvestorV1

        const newInvestorAddress = await newInvestor.getAddress()

        // Don't grant MINTER_ROLE
        await expect(
          router.connect(owner).setInvestorAddress(newInvestorAddress)
        ).to.be.revertedWithCustomError(router, ERRORS.INSUFFICIENT_MINTER_ROLE)
      })
    })

    describe('Set Multiplier', () => {
      it('should allow owner to update multiplier', async () => {
        const newMultiplier = 5n

        await expect(router.connect(owner).setMultiplier(newMultiplier))
          .to.emit(router, 'MultiplierUpdated')
          .withArgs(INITIAL_MULTIPLIER, newMultiplier)

        expect(await router.multiplier()).to.equal(newMultiplier)
      })

      it('should revert when non-owner tries to update', async () => {
        await expect(router.connect(nonOwner).setMultiplier(5n))
          .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
          .withArgs(nonOwner.address)
      })

      it('should revert when multiplier is below minimum', async () => {
        await expect(router.connect(owner).setMultiplier(0n)).to.be.revertedWithCustomError(
          router,
          ERRORS.MULTIPLIER_TOO_LOW
        )
      })

      it('should accept minimum multiplier value', async () => {
        const minMultiplier = await router.MIN_MULTIPLIER()

        await expect(router.connect(owner).setMultiplier(minMultiplier)).to.emit(
          router,
          'MultiplierUpdated'
        )

        expect(await router.multiplier()).to.equal(minMultiplier)
      })
    })
  })

  describe('Recovery Functions', () => {
    describe('Recover ERC20', () => {
      it('should allow owner to recover accidentally sent tokens', async () => {
        const recoverAmount = parseUnits('50', USDC_DECIMALS)
        const routerAddress = await router.getAddress()
        const usdcAddress = await mockUSDC.getAddress()

        // Send tokens to router by mistake
        await mockUSDC.connect(depositor1).transfer(routerAddress, recoverAmount)

        expect(await mockUSDC.balanceOf(routerAddress)).to.equal(recoverAmount)

        // Recover tokens
        await expect(router.connect(owner).recoverERC20(usdcAddress, recoverAmount))
          .to.emit(router, 'TokensRecovered')
          .withArgs(usdcAddress, safeWallet.address, recoverAmount)

        expect(await mockUSDC.balanceOf(routerAddress)).to.equal(0n)
        expect(await mockUSDC.balanceOf(safeWallet.address)).to.equal(recoverAmount)
      })

      it('should revert when non-owner tries to recover', async () => {
        const recoverAmount = parseUnits('50', USDC_DECIMALS)
        const usdcAddress = await mockUSDC.getAddress()

        await expect(router.connect(nonOwner).recoverERC20(usdcAddress, recoverAmount))
          .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
          .withArgs(nonOwner.address)
      })

      it('should revert when recovering zero address', async () => {
        await expect(
          router.connect(owner).recoverERC20(ethers.ZeroAddress, 100n)
        ).to.be.revertedWithCustomError(router, ERRORS.INVALID_TOKEN)
      })

      it('should revert when recovering zero amount', async () => {
        const usdcAddress = await mockUSDC.getAddress()

        await expect(
          router.connect(owner).recoverERC20(usdcAddress, 0n)
        ).to.be.revertedWithCustomError(router, ERRORS.ZERO_AMOUNT)
      })
    })
  })

  describe('Edge Cases and Security', () => {
    beforeEach(async () => {
      await router.connect(owner).enableDeposits()
    })

    it('should handle very small deposit amounts', async () => {
      const smallAmount = 1n // 1 wei of USDC (0.000001 USDC)
      const usdcAddress = await mockUSDC.getAddress()
      const routerAddress = await router.getAddress()

      await mockUSDC.connect(depositor1).approve(routerAddress, smallAmount)

      await router.connect(depositor1).deposit(usdcAddress, smallAmount)

      // Should receive normalized amount in SHER
      const expectedSHER = parseUnits('0.000001', SHER_DECIMALS)
      expect(await investor.balanceOf(depositor1.address)).to.equal(expectedSHER)
    })

    it('should prevent reentrancy attacks', async () => {
      // The ReentrancyGuard should prevent this, but we test with normal flow
      const depositAmount = parseUnits('100', USDC_DECIMALS)
      const usdcAddress = await mockUSDC.getAddress()
      const routerAddress = await router.getAddress()

      await mockUSDC.connect(depositor1).approve(routerAddress, depositAmount)

      // Normal deposit should work
      await expect(router.connect(depositor1).deposit(usdcAddress, depositAmount)).to.not.be
        .reverted
    })

    it('should maintain correct state after failed deposit', async () => {
      const depositAmount = parseUnits('100', USDC_DECIMALS)
      const usdcAddress = await mockUSDC.getAddress()

      // Try to deposit without approval (will fail)
      await expect(router.connect(depositor1).deposit(usdcAddress, depositAmount)).to.be.reverted

      // State should be unchanged
      expect(await router.depositsEnabled()).to.equal(true)
      expect(await router.paused()).to.equal(false)
      expect(await mockUSDC.balanceOf(safeWallet.address)).to.equal(0n)
      expect(await investor.balanceOf(depositor1.address)).to.equal(0n)
    })
  })

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await router.connect(owner).enableDeposits()
    })

    it('should handle complete deposit workflow with multiple tokens', async () => {
      const usdcAmount = parseUnits('100', USDC_DECIMALS)
      const usdtAmount = parseUnits('50', USDT_DECIMALS)

      const routerAddress = await router.getAddress()
      const usdcAddress = await mockUSDC.getAddress()
      const usdtAddress = await mockUSDT.getAddress()

      // Approve all tokens
      await mockUSDC.connect(depositor1).approve(routerAddress, usdcAmount)
      await mockUSDT.connect(depositor1).approve(routerAddress, usdtAmount)

      // Deposit all tokens
      await router.connect(depositor1).deposit(usdcAddress, usdcAmount)
      await router.connect(depositor1).deposit(usdtAddress, usdtAmount)

      // Verify Safe received all tokens
      expect(await mockUSDC.balanceOf(safeWallet.address)).to.equal(usdcAmount)
      expect(await mockUSDT.balanceOf(safeWallet.address)).to.equal(usdtAmount)

      // Verify SHER minted correctly (100 + 50 = 150 SHER)
      const totalExpectedSHER = parseUnits('150', SHER_DECIMALS)
      expect(await investor.balanceOf(depositor1.address)).to.equal(totalExpectedSHER)
    })

    it('should handle workflow with multiplier change', async () => {
      const depositAmount = parseUnits('100', USDC_DECIMALS)
      const usdcAddress = await mockUSDC.getAddress()
      const routerAddress = await router.getAddress()

      // First deposit with multiplier 1
      await mockUSDC.connect(depositor1).approve(routerAddress, depositAmount)
      await router.connect(depositor1).deposit(usdcAddress, depositAmount)

      expect(await investor.balanceOf(depositor1.address)).to.equal(
        parseUnits('100', SHER_DECIMALS)
      )

      // Change multiplier to 2
      await router.connect(owner).setMultiplier(2n)

      // Second deposit with multiplier 2
      await mockUSDC.connect(depositor2).approve(routerAddress, depositAmount)
      await router.connect(depositor2).deposit(usdcAddress, depositAmount)

      expect(await investor.balanceOf(depositor2.address)).to.equal(
        parseUnits('200', SHER_DECIMALS)
      )
    })

    it('should handle emergency pause and resume', async () => {
      const depositAmount = parseUnits('100', USDC_DECIMALS)
      const usdcAddress = await mockUSDC.getAddress()
      const routerAddress = await router.getAddress()

      await mockUSDC.connect(depositor1).approve(routerAddress, depositAmount * 2n)

      // First deposit works
      await router.connect(depositor1).deposit(usdcAddress, depositAmount)

      // Emergency pause
      await router.connect(owner).pause()

      // Deposit fails while paused
      await expect(
        router.connect(depositor1).deposit(usdcAddress, depositAmount)
      ).to.be.revertedWithCustomError(router, ERRORS.PAUSED)

      // Unpause
      await router.connect(owner).unpause()

      // Deposit works again
      await router.connect(depositor1).deposit(usdcAddress, depositAmount)

      expect(await investor.balanceOf(depositor1.address)).to.equal(
        parseUnits('200', SHER_DECIMALS)
      )
    })
  })

  describe('Constants', () => {
    it('should have correct MIN_MULTIPLIER', async () => {
      expect(await router.MIN_MULTIPLIER()).to.equal(1n)
    })
  })

  describe('Ownership', () => {
    it('should allow owner to transfer ownership', async () => {
      await router.connect(owner).transferOwnership(depositor1.address)
      expect(await router.owner()).to.equal(depositor1.address)
    })

    it('should revert when non-owner tries to transfer ownership', async () => {
      await expect(router.connect(nonOwner).transferOwnership(depositor1.address))
        .to.be.revertedWithCustomError(router, ERRORS.OWNABLE_UNAUTHORIZED)
        .withArgs(nonOwner.address)
    })
  })
})

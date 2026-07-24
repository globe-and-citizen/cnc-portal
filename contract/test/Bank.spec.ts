import {
  ethers,
  impersonateAccount,
  initializeHardhat,
  setBalance,
  upgrades
} from './hardhat-context.js'
import { expect } from 'chai'
import type {
  Bank,
  FeeCollector,
  MockERC20,
  MockFixedReturn,
  MockOfficer,
  Officer
} from '../typechain-types/index.js'
import type { HardhatEthersSigner, SignerWithAddress } from './hardhat-context.js'

before(initializeHardhat)

describe('Bank', () => {
  let bankProxy: Bank
  let mockUSDT: MockERC20
  let mockUSDC: MockERC20
  let owner: SignerWithAddress
  let contractor: SignerWithAddress
  let member1: SignerWithAddress
  let bank: Bank
  let feeCollector: FeeCollector
  let officer: Officer
  let officerSigner: HardhatEthersSigner

  const BANK_FEE_BPS = 50n

  const ERRORS = {
    INSUFFICIENT_BALANCE: 'Bank__InsufficientBalance',
    PAUSED: 'EnforcedPause',
    UNSUPPORTED_TOKEN: 'Bank__UnsupportedToken',
    TOKEN_SUPPORT_ALREADY_ADDED: 'TokenSupport__AlreadyAdded',
    TOKEN_SUPPORT_NOT_FOUND: 'TokenSupport__NotFound',
    TOKEN_SUPPORT_ZERO_ADDRESS: 'TokenSupport__ZeroAddress',
    ZERO_ADDRESS: 'Bank__ZeroAddress',
    ZERO_AMOUNT: 'Bank__ZeroAmount'
  } as const

  async function deployContracts() {
    const BankImplementation = await ethers.getContractFactory('Bank')
    const FeeCollectorFactory = await ethers.getContractFactory('FeeCollector')
    const OfficerFactory = await ethers.getContractFactory('Officer')

    const supportedTokens = [await mockUSDT.getAddress(), await mockUSDC.getAddress()]

    feeCollector = (await upgrades.deployProxy(
      FeeCollectorFactory,
      [
        await owner.getAddress(),
        [{ contractType: 'BANK', feeBps: Number(BANK_FEE_BPS) }],
        supportedTokens
      ],
      { initializer: 'initialize', unsafeAllow: ['constructor'] }
    )) as unknown as FeeCollector

    // Deploy Officer through a proxy; the implementation's constructor now calls
    // `_disableInitializers()`, so `initialize` can only be invoked on a proxy.
    officer = (await upgrades.deployProxy(
      OfficerFactory,
      [await owner.getAddress(), [], [], false],
      {
        initializer: 'initialize',
        constructorArgs: [await feeCollector.getAddress()],
        unsafeAllow: ['constructor', 'state-variable-immutable']
      }
    )) as unknown as Officer
    await officer.waitForDeployment()

    const officerAddress = await officer.getAddress()
    await impersonateAccount(officerAddress)
    officerSigner = await ethers.getSigner(officerAddress)
    await setBalance(officerAddress, ethers.parseEther('1000'))

    bankProxy = (await upgrades.deployProxy(
      BankImplementation.connect(officerSigner),
      [supportedTokens, await owner.getAddress()],
      {
        initializer: 'initialize',
        initialOwner: await owner.getAddress(),
        unsafeAllow: ['constructor']
      }
    )) as unknown as Bank

    bank = bankProxy.connect(owner)
  }

  beforeEach(async () => {
    ;[owner, contractor, member1] = await ethers.getSigners()

    const MockToken = await ethers.getContractFactory('MockERC20')
    mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
    mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20

    await deployContracts()

    await mockUSDT.mint(owner.address, ethers.parseUnits('1000', 6))
    await mockUSDC.mint(owner.address, ethers.parseUnits('1000', 6))
  })

  describe('Initial Setup', () => {
    it('should set the correct owner and initial values', async () => {
      const officerAddress = await officer.getAddress()
      expect(await bankProxy.owner()).to.eq(owner.address)
      expect(await bankProxy.getOfficerAddress()).to.eq(officerAddress)
      expect(await bankProxy.isTokenSupported(await mockUSDT.getAddress())).to.be.true
      expect(await bankProxy.isTokenSupported(await mockUSDC.getAddress())).to.be.true
    })

    it('should not allow to initialize the contract again', async () => {
      await expect(bankProxy.initialize([], await officer.getAddress())).to.be.revert(ethers)
    })

    it('should reject zero address in initialization', async () => {
      const BankImplementation = await ethers.getContractFactory('Bank')
      await expect(
        upgrades.deployProxy(BankImplementation, [[], ethers.ZeroAddress], {
          initializer: 'initialize',
          unsafeAllow: ['constructor']
        })
      ).to.be.revertedWithCustomError(BankImplementation, ERRORS.ZERO_ADDRESS)
    })

    it('should reject zero token address in initialization', async () => {
      const BankImplementation = await ethers.getContractFactory('Bank')
      await expect(
        upgrades.deployProxy(BankImplementation, [[ethers.ZeroAddress], owner.address], {
          initializer: 'initialize',
          unsafeAllow: ['constructor']
        })
      ).to.be.revertedWithCustomError(BankImplementation, ERRORS.ZERO_ADDRESS)
    })
  })

  describe('Token Support Management', () => {
    it('should allow owner to add token support', async () => {
      const MockToken = await ethers.getContractFactory('MockERC20')
      const newToken = (await MockToken.deploy('DAI', 'DAI')) as unknown as MockERC20

      await expect(bank.addTokenSupport(await newToken.getAddress()))
        .to.emit(bankProxy, 'TokenSupportAdded')
        .withArgs(await newToken.getAddress())

      expect(await bankProxy.isTokenSupported(await newToken.getAddress())).to.be.true
    })

    it('should not allow adding already supported token', async () => {
      await expect(bank.addTokenSupport(await mockUSDT.getAddress()))
        .to.be.revertedWithCustomError(bankProxy, ERRORS.TOKEN_SUPPORT_ALREADY_ADDED)
        .withArgs(await mockUSDT.getAddress())
    })

    it('should not allow adding zero address token', async () => {
      await expect(bank.addTokenSupport(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        bankProxy,
        ERRORS.TOKEN_SUPPORT_ZERO_ADDRESS
      )
    })

    it('should allow owner to remove token support', async () => {
      await expect(bank.removeTokenSupport(await mockUSDT.getAddress()))
        .to.emit(bankProxy, 'TokenSupportRemoved')
        .withArgs(await mockUSDT.getAddress())

      expect(await bankProxy.isTokenSupported(await mockUSDT.getAddress())).to.be.false
    })

    it('should not allow removing unsupported token', async () => {
      const MockToken = await ethers.getContractFactory('MockERC20')
      const newToken = (await MockToken.deploy('DAI', 'DAI')) as unknown as MockERC20

      await expect(bank.removeTokenSupport(await newToken.getAddress()))
        .to.be.revertedWithCustomError(bankProxy, ERRORS.TOKEN_SUPPORT_NOT_FOUND)
        .withArgs(await newToken.getAddress())
    })

    it('should not allow non-owner to add/remove token support', async () => {
      const MockToken = await ethers.getContractFactory('MockERC20')
      const newToken = (await MockToken.deploy('DAI', 'DAI')) as unknown as MockERC20

      await expect(bankProxy.connect(member1).addTokenSupport(await newToken.getAddress()))
        .to.be.revertedWithCustomError(bankProxy, 'OwnableUnauthorizedAccount')
        .withArgs(member1.address)
      await expect(bankProxy.connect(member1).removeTokenSupport(await mockUSDT.getAddress()))
        .to.be.revertedWithCustomError(bankProxy, 'OwnableUnauthorizedAccount')
        .withArgs(member1.address)
    })
  })

  describe('Core Functions', () => {
    describe('Deposits and Transfers', () => {
      it('should allow the owner to deposit and transfer ETH with fee', async () => {
        const depositAmount = ethers.parseEther('10')
        const transferAmount = ethers.parseEther('1')
        const fee = (transferAmount * BANK_FEE_BPS) / 10_000n
        const netAmount = transferAmount - fee
        const feeCollectorAddress = await feeCollector.getAddress()

        await expect(async () =>
          owner.sendTransaction({ to: await bankProxy.getAddress(), value: depositAmount })
        ).to.changeEtherBalance(ethers, bankProxy, depositAmount)

        const tx = bank.transfer(contractor.address, transferAmount)
        await expect(tx).to.changeEtherBalances(
          ethers,
          [bankProxy, contractor, feeCollectorAddress],
          [-transferAmount, netAmount, fee]
        )
        await expect(tx)
          .to.emit(bankProxy, 'Transfer')
          .withArgs(owner.address, contractor.address, netAmount)
        await expect(tx)
          .to.emit(feeCollector, 'FeePaid')
          .withArgs('BANK', await bankProxy.getAddress(), ethers.ZeroAddress, fee)
      })

      it('should fail for invalid transfer params and insufficient balance', async () => {
        const transferAmount = ethers.parseEther('1')
        await owner.sendTransaction({
          to: await bankProxy.getAddress(),
          value: ethers.parseEther('2')
        })

        await expect(
          bank.transfer(ethers.ZeroAddress, transferAmount)
        ).to.be.revertedWithCustomError(bankProxy, ERRORS.ZERO_ADDRESS)

        await expect(bank.transfer(contractor.address, 0)).to.be.revertedWithCustomError(
          bankProxy,
          ERRORS.ZERO_AMOUNT
        )

        await expect(bank.transfer(contractor.address, ethers.parseEther('100')))
          .to.be.revertedWithCustomError(bankProxy, ERRORS.INSUFFICIENT_BALANCE)
          .withArgs(ethers.parseEther('100'), ethers.parseEther('2'))
      })

      it('should allow any address to deposit but not transfer funds', async () => {
        const depositAmount = ethers.parseEther('5')
        const transferAmount = ethers.parseEther('1')

        await expect(async () =>
          member1.sendTransaction({ to: await bankProxy.getAddress(), value: depositAmount })
        ).to.changeEtherBalance(ethers, bankProxy, depositAmount)

        await expect(bankProxy.connect(member1).transfer(contractor.address, transferAmount))
          .to.be.revertedWithCustomError(bankProxy, 'OwnableUnauthorizedAccount')
          .withArgs(member1.address)
      })
    })

    describe('Pause Management', () => {
      beforeEach(async () => {
        await owner.sendTransaction({
          to: await bankProxy.getAddress(),
          value: ethers.parseEther('10')
        })
      })

      it('should allow owner to pause and unpause', async () => {
        await bank.pause()
        expect(await bankProxy.paused()).to.be.true
        await expect(bank.transfer(contractor.address, ethers.parseEther('1'))).to.be.revert(ethers)

        await bank.unpause()
        expect(await bankProxy.paused()).to.be.false
        await expect(bank.transfer(contractor.address, ethers.parseEther('1'))).to.not.be.revert(
          ethers
        )
      })

      it('should not allow non-owner to pause or unpause', async () => {
        await expect(bankProxy.connect(member1).pause())
          .to.be.revertedWithCustomError(bankProxy, 'OwnableUnauthorizedAccount')
          .withArgs(member1.address)

        await bank.pause()

        await expect(bankProxy.connect(member1).unpause())
          .to.be.revertedWithCustomError(bankProxy, 'OwnableUnauthorizedAccount')
          .withArgs(member1.address)
      })

      it('should reject transfers while paused', async () => {
        await bank.pause()
        await expect(
          bank.transfer(contractor.address, ethers.parseEther('1'))
        ).to.be.revertedWithCustomError(bankProxy, ERRORS.PAUSED)
      })
    })
  })

  describe('Token Operations', () => {
    it('should allow depositing supported tokens', async () => {
      const amount = ethers.parseUnits('100', 6)
      await mockUSDT.approve(await bankProxy.getAddress(), amount)

      await expect(bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), amount))
        .to.emit(bankProxy, 'TokenDeposited')
        .withArgs(owner.address, await mockUSDT.getAddress(), amount)
    })

    it('should not allow depositing unsupported tokens', async () => {
      const MockToken = await ethers.getContractFactory('MockERC20')
      const unsupportedToken = (await MockToken.deploy(
        'UNSUPPORTED',
        'UNS'
      )) as unknown as MockERC20

      await expect(bankProxy.connect(owner).depositToken(await unsupportedToken.getAddress(), 100))
        .to.be.revertedWithCustomError(bankProxy, ERRORS.UNSUPPORTED_TOKEN)
        .withArgs(await unsupportedToken.getAddress())
    })

    it('should not allow depositing zero amount', async () => {
      await expect(
        bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), 0)
      ).to.be.revertedWithCustomError(bankProxy, ERRORS.ZERO_AMOUNT)
    })

    it('should allow owner to transfer tokens with fee', async () => {
      const amount = ethers.parseUnits('10', 6)
      await mockUSDT.approve(await bankProxy.getAddress(), amount)
      await bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), amount)

      const fee = (amount * BANK_FEE_BPS) / 10_000n
      const netAmount = amount - fee
      const feeCollectorAddress = await feeCollector.getAddress()

      const tx = bank.transferToken(await mockUSDT.getAddress(), contractor.address, amount)

      await expect(tx).to.changeTokenBalances(
        ethers,
        mockUSDT,
        [bankProxy, contractor, feeCollectorAddress],
        [-amount, netAmount, fee]
      )

      await expect(tx)
        .to.emit(bankProxy, 'TokenTransfer')
        .withArgs(owner.address, contractor.address, await mockUSDT.getAddress(), netAmount)
      await expect(tx)
        .to.emit(feeCollector, 'FeePaid')
        .withArgs('BANK', await bankProxy.getAddress(), await mockUSDT.getAddress(), fee)
    })

    it('should reject invalid token transfer requests', async () => {
      const MockToken = await ethers.getContractFactory('MockERC20')
      const unsupportedToken = (await MockToken.deploy(
        'UNSUPPORTED',
        'UNS'
      )) as unknown as MockERC20

      await expect(bank.transferToken(await unsupportedToken.getAddress(), contractor.address, 100))
        .to.be.revertedWithCustomError(bankProxy, ERRORS.UNSUPPORTED_TOKEN)
        .withArgs(await unsupportedToken.getAddress())

      await expect(
        bank.transferToken(await mockUSDT.getAddress(), ethers.ZeroAddress, 100)
      ).to.be.revertedWithCustomError(bankProxy, ERRORS.ZERO_ADDRESS)

      await expect(
        bank.transferToken(await mockUSDT.getAddress(), contractor.address, 0)
      ).to.be.revertedWithCustomError(bankProxy, ERRORS.ZERO_AMOUNT)
    })

    it('should not allow transferring more than token balance', async () => {
      const amount = ethers.parseUnits('10', 6)
      await mockUSDT.approve(await bankProxy.getAddress(), amount)
      await bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), amount)

      const excessAmount = ethers.parseUnits('20', 6)
      await expect(
        bank.transferToken(await mockUSDT.getAddress(), contractor.address, excessAmount)
      )
        .to.be.revertedWithCustomError(bankProxy, ERRORS.INSUFFICIENT_BALANCE)
        .withArgs(excessAmount, amount)
    })

    it('should return token balance for supported tokens', async () => {
      const amount = ethers.parseUnits('100', 6)
      await mockUSDT.approve(await bankProxy.getAddress(), amount)
      await bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), amount)

      expect(await bankProxy.getTokenBalance(await mockUSDT.getAddress())).to.equal(amount)
    })

    it('should reject unsupported token in token balance getters', async () => {
      const MockToken = await ethers.getContractFactory('MockERC20')
      const unsupportedToken = (await MockToken.deploy(
        'UNSUPPORTED',
        'UNS'
      )) as unknown as MockERC20

      await expect(bankProxy.getTokenBalance(await unsupportedToken.getAddress()))
        .to.be.revertedWithCustomError(bankProxy, ERRORS.UNSUPPORTED_TOKEN)
        .withArgs(await unsupportedToken.getAddress())
    })
  })

  // fundFixedReturnRepayment resolves FixedReturn via Officer, so — like the old
  // releaseLenderRepayment tests — these use MockOfficer + a MockFixedReturn stand-in
  // (rather than the outer beforeEach's real, unregistered Officer) so a FixedReturn
  // address can be registered without beacon infrastructure or a full offer lifecycle.
  describe('fundFixedReturnRepayment', () => {
    async function deployWithMock() {
      const [owner, lenderAccount] = await ethers.getSigners()
      const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
      const MockFixedReturnFactory = await ethers.getContractFactory('MockFixedReturn')
      const BankFactory = await ethers.getContractFactory('Bank')
      const MockToken = await ethers.getContractFactory('MockERC20')

      const mockOfficer = (await MockOfficerFactory.deploy()) as unknown as MockOfficer
      const mockOfficerAddress = await mockOfficer.getAddress()

      await impersonateAccount(mockOfficerAddress)
      const officerSigner = await ethers.getSigner(mockOfficerAddress)
      await setBalance(mockOfficerAddress, ethers.parseEther('10'))

      const localBank = (await upgrades.deployProxy(
        BankFactory.connect(officerSigner),
        [[], owner.address],
        { initializer: 'initialize', unsafeSkipProxyAdminCheck: true, unsafeAllow: ['constructor'] }
      )) as unknown as Bank

      const mockFixedReturn = (await MockFixedReturnFactory.deploy()) as unknown as MockFixedReturn
      const token = (await MockToken.deploy('Mock USDC', 'mUSDC')) as unknown as MockERC20
      await mockFixedReturn.setToken(await token.getAddress())

      await localBank.connect(owner).addTokenSupport(await token.getAddress())
      // Pre-fund Bank so fundFixedReturnRepayment has tokens to transfer
      await token.mint(await localBank.getAddress(), ethers.parseUnits('1000', 6))

      return { localBank, mockOfficer, mockFixedReturn, owner, lenderAccount, token }
    }

    const OFFER_ID = 1n

    it('transfers the amount to FixedReturn and calls repayLenders', async () => {
      const { localBank, mockOfficer, mockFixedReturn, owner, token } = await deployWithMock()
      await mockOfficer.setDeployedContract('FixedReturn', await mockFixedReturn.getAddress())

      const amount = ethers.parseUnits('100', 6)
      const fixedReturnBefore = await token.balanceOf(await mockFixedReturn.getAddress())

      await expect(localBank.connect(owner).fundFixedReturnRepayment(OFFER_ID, amount))
        .to.emit(localBank, 'FixedReturnRepaymentFunded')
        .withArgs(await mockFixedReturn.getAddress(), OFFER_ID, await token.getAddress(), amount)

      expect(await token.balanceOf(await mockFixedReturn.getAddress())).to.equal(
        fixedReturnBefore + amount
      )
      expect(await mockFixedReturn.repayLendersCallCount()).to.equal(1n)
      expect(await mockFixedReturn.lastOfferId()).to.equal(OFFER_ID)
      expect(await mockFixedReturn.lastAmount()).to.equal(amount)
    })

    it('rejects a call from a non-owner', async () => {
      const { localBank, mockOfficer, mockFixedReturn, lenderAccount } = await deployWithMock()
      await mockOfficer.setDeployedContract('FixedReturn', await mockFixedReturn.getAddress())

      await expect(
        localBank.connect(lenderAccount).fundFixedReturnRepayment(OFFER_ID, 1n)
      ).to.be.revertedWithCustomError(localBank, 'OwnableUnauthorizedAccount')
    })

    it('rejects when no FixedReturn is registered in Officer', async () => {
      const { localBank, owner } = await deployWithMock()
      // No setDeployedContract call — findDeployedContract returns address(0)

      await expect(
        localBank.connect(owner).fundFixedReturnRepayment(OFFER_ID, 1n)
      ).to.be.revertedWithCustomError(localBank, 'Bank__FixedReturnContractNotFound')
    })

    it('rejects when the offer token is not supported by Bank', async () => {
      const { localBank, mockOfficer, mockFixedReturn, owner } = await deployWithMock()
      const MockToken = await ethers.getContractFactory('MockERC20')
      const unsupportedToken = (await MockToken.deploy(
        'UNSUPPORTED',
        'UNS'
      )) as unknown as MockERC20
      await mockFixedReturn.setToken(await unsupportedToken.getAddress())
      await mockOfficer.setDeployedContract('FixedReturn', await mockFixedReturn.getAddress())

      await expect(localBank.connect(owner).fundFixedReturnRepayment(OFFER_ID, 1n))
        .to.be.revertedWithCustomError(localBank, ERRORS.UNSUPPORTED_TOKEN)
        .withArgs(await unsupportedToken.getAddress())
    })

    it('rejects when the contract is paused', async () => {
      const { localBank, mockOfficer, mockFixedReturn, owner } = await deployWithMock()
      await mockOfficer.setDeployedContract('FixedReturn', await mockFixedReturn.getAddress())
      await localBank.connect(owner).pause()

      await expect(
        localBank.connect(owner).fundFixedReturnRepayment(OFFER_ID, 1n)
      ).to.be.revertedWithCustomError(localBank, 'EnforcedPause')
    })

    it('rejects a zero amount', async () => {
      const { localBank, mockOfficer, mockFixedReturn, owner } = await deployWithMock()
      await mockOfficer.setDeployedContract('FixedReturn', await mockFixedReturn.getAddress())

      await expect(
        localBank.connect(owner).fundFixedReturnRepayment(OFFER_ID, 0n)
      ).to.be.revertedWithCustomError(localBank, 'Bank__ZeroAmount')
    })

    it('rejects an amount exceeding the treasury balance', async () => {
      const { localBank, mockOfficer, mockFixedReturn, owner } = await deployWithMock()
      await mockOfficer.setDeployedContract('FixedReturn', await mockFixedReturn.getAddress())

      const excessAmount = ethers.parseUnits('2000', 6)
      await expect(localBank.connect(owner).fundFixedReturnRepayment(OFFER_ID, excessAmount))
        .to.be.revertedWithCustomError(localBank, ERRORS.INSUFFICIENT_BALANCE)
        .withArgs(excessAmount, ethers.parseUnits('1000', 6))
    })

    it('reverts the whole call, including the transfer, if repayLenders reverts', async () => {
      const { localBank, mockOfficer, mockFixedReturn, owner, token } = await deployWithMock()
      await mockOfficer.setDeployedContract('FixedReturn', await mockFixedReturn.getAddress())
      await mockFixedReturn.setShouldRevertOnRepay(true)

      const amount = ethers.parseUnits('100', 6)
      const fixedReturnBefore = await token.balanceOf(await mockFixedReturn.getAddress())

      await expect(
        localBank.connect(owner).fundFixedReturnRepayment(OFFER_ID, amount)
      ).to.be.revert(ethers)

      expect(await token.balanceOf(await mockFixedReturn.getAddress())).to.equal(fixedReturnBefore)
    })
  })
})

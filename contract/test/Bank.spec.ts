import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Bank, FeeCollector, InvestorV1, MockERC20, Officer } from '../typechain-types'
import { HardhatEthersSigner, SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { impersonateAccount, setBalance } from '@nomicfoundation/hardhat-network-helpers'

describe('Bank', () => {
  let bankProxy: Bank
  let mockUSDT: MockERC20
  let mockUSDC: MockERC20
  let owner: SignerWithAddress
  let contractor: SignerWithAddress
  let member1: SignerWithAddress
  let member2: SignerWithAddress
  let investorProxy: InvestorV1
  let bank: Bank
  let feeCollector: FeeCollector
  let officer: Officer
  let officerSigner: HardhatEthersSigner

  const BANK_FEE_BPS = 50n

  const ERRORS = {
    INSUFFICIENT_UNLOCKED: 'Insufficient unlocked balance',
    INVALID_INVESTOR: 'Investor address invalid',
    ZERO_SUPPLY: 'Zero supply',
    NO_HOLDERS: 'No shareholders',
    NOTHING_TO_RELEASE: 'Nothing to release',
    PAUSED: 'EnforcedPause',
    INSUFFICIENT_BANK_BALANCE: 'Insufficient token balance in the bank',
    FAILED_TO_SEND: 'Failed to send dividend',
    UNSUPPORTED_TOKEN: 'Unsupported token',
    TOKEN_ALREADY_SUPPORTED: 'Token already supported',
    TOKEN_NOT_SUPPORTED: 'Token not supported',
    ZERO_ADDRESS: 'Address cannot be zero',
    TOKEN_ADDRESS_ZERO: 'Token address cannot be zero',
    AMOUNT_ZERO: 'Amount must be greater than zero',
    SENDER_ZERO: 'Sender cannot be zero'
  } as const

  async function deployContracts() {
    const InvestorsV1Implementation = await ethers.getContractFactory('InvestorV1')
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
      { initializer: 'initialize' }
    )) as unknown as FeeCollector

    officer = (await OfficerFactory.deploy(await feeCollector.getAddress())) as unknown as Officer
    await officer.waitForDeployment()
    await officer.initialize(await owner.getAddress(), [], [], false)

    const officerAddress = await officer.getAddress()
    await impersonateAccount(officerAddress)
    officerSigner = await ethers.getSigner(officerAddress)
    await setBalance(officerAddress, ethers.parseEther('1000'))

    bankProxy = (await upgrades.deployProxy(
      BankImplementation.connect(officerSigner),
      [supportedTokens, await owner.getAddress()],
      { initializer: 'initialize', initialOwner: await owner.getAddress() }
    )) as unknown as Bank

    bank = bankProxy.connect(owner)

    investorProxy = (await upgrades.deployProxy(
      InvestorsV1Implementation,
      ['SHARED', 'SHER', await owner.getAddress()],
      { initializer: 'initialize' }
    )) as unknown as InvestorV1
  }

  describe('Initial Setup', () => {
    beforeEach(async () => {
      ;[owner, contractor, member1, member2] = await ethers.getSigners()

      const MockToken = await ethers.getContractFactory('MockERC20')
      mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
      mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20

      await deployContracts()

      await mockUSDT.mint(owner.address, ethers.parseUnits('1000', 6))
      await mockUSDC.mint(owner.address, ethers.parseUnits('1000', 6))
    })

    it('should set the correct owner and initial values', async () => {
      const officerAddress = await officer.getAddress()
      expect(await bankProxy.owner()).to.eq(owner.address)
      expect(await bankProxy.officerAddress()).to.eq(officerAddress)
      expect(await bankProxy.supportedTokens(await mockUSDT.getAddress())).to.be.true
      expect(await bankProxy.supportedTokens(await mockUSDC.getAddress())).to.be.true
    })

    it('should not allow to initialize the contract again', async () => {
      await expect(bankProxy.initialize([], await officer.getAddress())).to.be.reverted
    })

    it('should reject zero address in initialization', async () => {
      const BankImplementation = await ethers.getContractFactory('Bank')
      await expect(
        upgrades.deployProxy(BankImplementation, [[], ethers.ZeroAddress], {
          initializer: 'initialize'
        })
      ).to.be.revertedWith(ERRORS.SENDER_ZERO)
    })

    it('should reject zero token address in initialization', async () => {
      const BankImplementation = await ethers.getContractFactory('Bank')
      await expect(
        upgrades.deployProxy(BankImplementation, [[ethers.ZeroAddress], owner.address], {
          initializer: 'initialize'
        })
      ).to.be.revertedWith(ERRORS.TOKEN_ADDRESS_ZERO)
    })
  })

  describe('Token Support Management', () => {
    beforeEach(async () => {
      ;[owner, contractor, member1, member2] = await ethers.getSigners()

      const MockToken = await ethers.getContractFactory('MockERC20')
      mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
      mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20

      await deployContracts()
    })

    it('should allow owner to add token support', async () => {
      const MockToken = await ethers.getContractFactory('MockERC20')
      const newToken = (await MockToken.deploy('DAI', 'DAI')) as unknown as MockERC20

      await expect(bank.addTokenSupport(await newToken.getAddress()))
        .to.emit(bankProxy, 'TokenSupportAdded')
        .withArgs(await newToken.getAddress())

      expect(await bankProxy.supportedTokens(await newToken.getAddress())).to.be.true
    })

    it('should not allow adding already supported token', async () => {
      await expect(bank.addTokenSupport(await mockUSDT.getAddress())).to.be.revertedWith(
        ERRORS.TOKEN_ALREADY_SUPPORTED
      )
    })

    it('should not allow adding zero address token', async () => {
      await expect(bank.addTokenSupport(ethers.ZeroAddress)).to.be.revertedWith(
        ERRORS.TOKEN_ADDRESS_ZERO
      )
    })

    it('should allow owner to remove token support', async () => {
      await expect(bank.removeTokenSupport(await mockUSDT.getAddress()))
        .to.emit(bankProxy, 'TokenSupportRemoved')
        .withArgs(await mockUSDT.getAddress())

      expect(await bankProxy.supportedTokens(await mockUSDT.getAddress())).to.be.false
    })

    it('should not allow removing unsupported token', async () => {
      const MockToken = await ethers.getContractFactory('MockERC20')
      const newToken = (await MockToken.deploy('DAI', 'DAI')) as unknown as MockERC20

      await expect(bank.removeTokenSupport(await newToken.getAddress())).to.be.revertedWith(
        ERRORS.TOKEN_NOT_SUPPORTED
      )
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

  describe('Investor Address Management', () => {
    beforeEach(async () => {
      ;[owner, contractor, member1, member2] = await ethers.getSigners()

      const MockToken = await ethers.getContractFactory('MockERC20')
      mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
      mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20

      await deployContracts()
    })

    it('should allow owner to set investor address', async () => {
      const previousAddress = await bankProxy.investorAddress()

      await expect(bank.setInvestorAddress(await investorProxy.getAddress()))
        .to.emit(bankProxy, 'InvestorAddressUpdated')
        .withArgs(previousAddress, await investorProxy.getAddress())

      expect(await bankProxy.investorAddress()).to.equal(await investorProxy.getAddress())
    })

    it('should not allow setting zero address as investor', async () => {
      await expect(bank.setInvestorAddress(ethers.ZeroAddress)).to.be.revertedWith(
        ERRORS.ZERO_ADDRESS
      )
    })

    it('should not allow non-owner to set investor address', async () => {
      // First set by owner (expected normal flow via Officer)
      await bank.setInvestorAddress(await investorProxy.getAddress())

      // Then ensure non-owner cannot update once set
      const InvestorsV1Implementation = await ethers.getContractFactory('InvestorV1')
      const anotherInvestor = (await upgrades.deployProxy(
        InvestorsV1Implementation,
        ['ALT', 'ALT', await owner.getAddress()],
        { initializer: 'initialize' }
      )) as unknown as InvestorV1

      await expect(
        bankProxy.connect(member1).setInvestorAddress(await anotherInvestor.getAddress())
      ).to.be.revertedWith('Not allowed to set investor contract')
    })
  })

  describe('Core Functions (As A User)', () => {
    beforeEach(async () => {
      ;[owner, contractor, member1, member2] = await ethers.getSigners()

      const MockToken = await ethers.getContractFactory('MockERC20')
      mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
      mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20

      await deployContracts()

      await mockUSDT.mint(owner.address, ethers.parseUnits('1000', 6))
      await mockUSDC.mint(owner.address, ethers.parseUnits('1000', 6))
    })

    context('Deposits and Transfers', () => {
      it('should allow the owner to deposit and transfer funds', async () => {
        const depositAmount = ethers.parseEther('10')
        const transferAmount = ethers.parseEther('1')
        const fee = (transferAmount * BANK_FEE_BPS) / 10_000n
        const netAmount = transferAmount - fee
        const feeCollectorAddress = await feeCollector.getAddress()

        await expect(async () =>
          owner.sendTransaction({ to: await bankProxy.getAddress(), value: depositAmount })
        ).to.changeEtherBalance(bankProxy, depositAmount)

        const tx = bank.transfer(contractor.address, transferAmount)
        await expect(tx).to.changeEtherBalances(
          [bankProxy, contractor, feeCollectorAddress],
          [-transferAmount, netAmount, fee]
        )
        await expect(tx)
          .to.emit(bankProxy, 'Transfer')
          .withArgs(owner.address, contractor.address, netAmount)
        await expect(tx).to.emit(bankProxy, 'FeePaid').withArgs(feeCollectorAddress, fee)
      })

      it("should fail when the to address is zero, the amount is 0 or the sender doesn't have enough funds", async () => {
        const transferAmount = ethers.parseEther('1')
        // First deposit some funds
        const depositAmount = ethers.parseEther('2')
        await owner.sendTransaction({
          to: await bankProxy.getAddress(),
          value: depositAmount
        })
        // Transfer to null address
        const tx = bank.transfer(ethers.ZeroAddress, transferAmount)
        await expect(tx).to.be.revertedWith(ERRORS.ZERO_ADDRESS)

        // Transfer 0 amount
        const tx2 = bank.transfer(contractor.address, 0)
        await expect(tx2).to.be.revertedWith(ERRORS.AMOUNT_ZERO)

        // Transfer more than the sender has
        const tx3 = bank.transfer(contractor.address, ethers.parseEther('100'))
        await expect(tx3).to.be.revertedWith(ERRORS.INSUFFICIENT_UNLOCKED)
      })

      it('should allow any address to deposit but not transfer funds', async () => {
        const depositAmount = ethers.parseEther('5')
        const transferAmount = ethers.parseEther('1')

        await expect(async () =>
          member1.sendTransaction({ to: await bankProxy.getAddress(), value: depositAmount })
        ).to.changeEtherBalance(bankProxy, depositAmount)

        await expect(bankProxy.connect(member1).transfer(contractor.address, transferAmount))
          .to.be.revertedWithCustomError(bankProxy, 'OwnableUnauthorizedAccount')
          .withArgs(member1.address)
      })
    })

    context('Contract Management', () => {
      beforeEach(async () => {
        // Fund the bank contract with ETH
        await owner.sendTransaction({
          to: await bankProxy.getAddress(),
          value: ethers.parseEther('10')
        })
      })

      it('should allow the owner to pause and unpause the contract', async () => {
        await bank.pause()
        expect(await bankProxy.paused()).to.be.true
        await expect(bank.transfer(contractor.address, ethers.parseEther('1'))).to.be.reverted

        await bank.unpause()
        expect(await bankProxy.paused()).to.be.false
        await expect(bank.transfer(contractor.address, ethers.parseEther('1'))).to.not.be.reverted
      })

      it('should not allow other addresses to pause or unpause the contract', async () => {
        await expect(bankProxy.connect(member1).pause())
          .to.be.revertedWithCustomError(bankProxy, 'OwnableUnauthorizedAccount')
          .withArgs(member1.address)
        await bank.pause()
        await expect(bankProxy.connect(member1).unpause())
          .to.be.revertedWithCustomError(bankProxy, 'OwnableUnauthorizedAccount')
          .withArgs(member1.address)
        await bank.unpause()
      })

      it('should only allow function execution when not paused', async () => {
        await bank.pause()
        expect(await bankProxy.paused()).to.be.true

        await expect(bank.transfer(contractor.address, ethers.parseEther('1'))).to.be.reverted

        await bank.unpause()
        expect(await bankProxy.paused()).to.be.false
        await expect(bank.transfer(contractor.address, ethers.parseEther('1'))).to.not.be.reverted
      })
    })
  })

  describe('Token Operations', () => {
    beforeEach(async () => {
      ;[owner, contractor, member1, member2] = await ethers.getSigners()

      // Deploy mock tokens
      const MockToken = await ethers.getContractFactory('MockERC20')
      mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
      mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20

      await deployContracts()

      // Mint tokens to owner
      await mockUSDT.mint(owner.address, ethers.parseUnits('1000', 6))
      await mockUSDC.mint(owner.address, ethers.parseUnits('1000', 6))
    })

    context('Token Deposits and Transfers', () => {
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

        await expect(
          bankProxy.connect(owner).depositToken(await unsupportedToken.getAddress(), 100)
        ).to.be.revertedWith(ERRORS.UNSUPPORTED_TOKEN)
      })

      it('should not allow depositing zero amount', async () => {
        await expect(
          bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), 0)
        ).to.be.revertedWith(ERRORS.AMOUNT_ZERO)
      })

      it('should allow owner to transfer tokens', async () => {
        const amount = ethers.parseUnits('10', 6)
        await mockUSDT.approve(await bankProxy.getAddress(), amount)
        await bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), amount)

        const fee = (amount * BANK_FEE_BPS) / 10_000n
        const netAmount = amount - fee
        const feeCollectorAddress = await feeCollector.getAddress()

        const tx = bank.transferToken(await mockUSDT.getAddress(), contractor.address, amount)

        await expect(tx).to.changeTokenBalances(
          mockUSDT,
          [bankProxy, contractor, feeCollectorAddress],
          [-amount, netAmount, fee]
        )

        await expect(tx)
          .to.emit(bankProxy, 'TokenTransfer')
          .withArgs(owner.address, contractor.address, await mockUSDT.getAddress(), netAmount)
        await expect(tx).to.emit(bankProxy, 'FeePaid').withArgs(feeCollectorAddress, fee)
      })

      it('should not allow transferring unsupported tokens', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const unsupportedToken = (await MockToken.deploy(
          'UNSUPPORTED',
          'UNS'
        )) as unknown as MockERC20

        await expect(
          bank.transferToken(await unsupportedToken.getAddress(), contractor.address, 100)
        ).to.be.revertedWith(ERRORS.UNSUPPORTED_TOKEN)
      })

      it('should not allow transferring to zero address', async () => {
        await expect(
          bank.transferToken(await mockUSDT.getAddress(), ethers.ZeroAddress, 100)
        ).to.be.revertedWith(ERRORS.ZERO_ADDRESS)
      })

      it('should not allow transferring zero amount', async () => {
        await expect(
          bank.transferToken(await mockUSDT.getAddress(), contractor.address, 0)
        ).to.be.revertedWith(ERRORS.AMOUNT_ZERO)
      })

      it('should not allow transferring more than unlocked token balance', async () => {
        const amount = ethers.parseUnits('10', 6)
        await mockUSDT.approve(await bankProxy.getAddress(), amount)
        await bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), amount)

        const excessAmount = ethers.parseUnits('20', 6)
        await expect(
          bank.transferToken(await mockUSDT.getAddress(), contractor.address, excessAmount)
        ).to.be.revertedWith('Insufficient unlocked token balance')
      })
    })

    context('Balance Queries', () => {
      it('should correctly return unlocked token balance', async () => {
        const amount = ethers.parseUnits('100', 6)
        await mockUSDT.approve(await bankProxy.getAddress(), amount)
        await bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), amount)

        expect(await bankProxy.getUnlockedTokenBalance(await mockUSDT.getAddress())).to.equal(
          amount
        )
      })

      it('should correctly return token dividend balance', async () => {
        expect(
          await bankProxy.getTokenDividendBalance(await mockUSDT.getAddress(), member1.address)
        ).to.equal(0)
      })

      it('should reject unsupported token in getUnlockedTokenBalance', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const unsupportedToken = (await MockToken.deploy(
          'UNSUPPORTED',
          'UNS'
        )) as unknown as MockERC20

        await expect(
          bankProxy.getUnlockedTokenBalance(await unsupportedToken.getAddress())
        ).to.be.revertedWith(ERRORS.UNSUPPORTED_TOKEN)
      })

      it('should reject unsupported token in getTokenDividendBalance', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const unsupportedToken = (await MockToken.deploy(
          'UNSUPPORTED',
          'UNS'
        )) as unknown as MockERC20

        await expect(
          bankProxy.getTokenDividendBalance(await unsupportedToken.getAddress(), member1.address)
        ).to.be.revertedWith(ERRORS.UNSUPPORTED_TOKEN)
      })
    })
  })

  describe('Dividend System', () => {
    const depositAmount = ethers.parseEther('50')

    beforeEach(async () => {
      ;[owner, contractor, member1, member2] = await ethers.getSigners()

      const MockToken = await ethers.getContractFactory('MockERC20')
      mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
      mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20

      await deployContracts()

      // Fund the bank contract
      await owner.sendTransaction({
        to: await bankProxy.getAddress(),
        value: ethers.parseEther('100')
      })

      // Setup InvestorV1 data
      await investorProxy.distributeMint([
        { shareholder: member1.address, amount: ethers.parseEther('60') },
        { shareholder: member2.address, amount: ethers.parseEther('40') }
      ])
    })

    context('ETH Dividend Deposits', () => {
      it('should allow owner to deposit dividends', async () => {
        const tx = await bank.depositDividends(depositAmount, await investorProxy.getAddress())

        await expect(tx)
          .to.emit(bankProxy, 'DividendDeposited')
          .withArgs(owner.address, depositAmount, await investorProxy.getAddress())

        // Check dividend allocation
        expect(await bankProxy.dividendBalances(member1.address)).to.equal(
          ethers.parseEther('30') // 60% of 50 ETH
        )
        expect(await bankProxy.dividendBalances(member2.address)).to.equal(
          ethers.parseEther('20') // 40% of 50 ETH
        )
        expect(await bankProxy.totalDividends()).to.equal(depositAmount)
      })

      it('should not allow depositing more than unlocked balance', async () => {
        const unlockBalance = await bankProxy.getUnlockedBalance()
        await expect(
          bank.depositDividends(unlockBalance + 1n, await investorProxy.getAddress())
        ).to.be.revertedWith(ERRORS.INSUFFICIENT_UNLOCKED)
      })

      it('should not allow non-owner to deposit dividends', async () => {
        await expect(
          bankProxy
            .connect(member1)
            .depositDividends(depositAmount, await investorProxy.getAddress())
        )
          .to.be.revertedWithCustomError(bankProxy, 'OwnableUnauthorizedAccount')
          .withArgs(member1.address)
      })

      it('should not allow deposit with zero investor address', async () => {
        await expect(bank.depositDividends(depositAmount, ethers.ZeroAddress)).to.be.revertedWith(
          ERRORS.INVALID_INVESTOR
        )
      })

      it('should emit DividendCredited events during allocation', async () => {
        const tx = await bank.depositDividends(depositAmount, await investorProxy.getAddress())

        await expect(tx)
          .to.emit(bankProxy, 'DividendCredited')
          .withArgs(member1.address, ethers.parseEther('30'))
        await expect(tx)
          .to.emit(bankProxy, 'DividendCredited')
          .withArgs(member2.address, ethers.parseEther('20'))
      })

      it('should handle rounding with defensive remaining check', async () => {
        // Setup uneven distribution that could cause share > remaining
        await investorProxy.distributeMint([
          { shareholder: member1.address, amount: ethers.parseEther('99') },
          { shareholder: member2.address, amount: ethers.parseEther('1') }
        ])

        // Use a small amount that could cause rounding issues
        const smallAmount = ethers.parseEther('0.000000000000000003')

        await bank.depositDividends(smallAmount, await investorProxy.getAddress())

        // Verify total allocated equals original amount
        expect(await bankProxy.totalDividends()).to.equal(smallAmount)

        // Sum individual balances to verify
        const member1Balance = await bankProxy.dividendBalances(member1.address)
        const member2Balance = await bankProxy.dividendBalances(member2.address)
        expect(member1Balance + member2Balance).to.equal(smallAmount)
      })
    })

    context('ETH Dividend Claims', () => {
      beforeEach(async () => {
        await bank.depositDividends(depositAmount, await investorProxy.getAddress())
      })

      it('should allow shareholders to claim their dividends', async () => {
        const member1Balance = await bankProxy.dividendBalances(member1.address)
        const member2Balance = await bankProxy.dividendBalances(member2.address)

        await expect(() => bankProxy.connect(member1).claimDividend()).to.changeEtherBalance(
          member1,
          member1Balance
        )

        expect(await bankProxy.dividendBalances(member1.address)).to.equal(0)

        await expect(() => bankProxy.connect(member2).claimDividend()).to.changeEtherBalance(
          member2,
          member2Balance
        )

        expect(await bankProxy.dividendBalances(member2.address)).to.equal(0)
        expect(await bankProxy.totalDividends()).to.equal(0)
      })

      it('should not allow claiming with zero balance', async () => {
        await expect(bankProxy.connect(contractor).claimDividend()).to.be.revertedWith(
          ERRORS.NOTHING_TO_RELEASE
        )
      })

      it('should not allow claiming twice', async () => {
        await bankProxy.connect(member1).claimDividend()
        await expect(bankProxy.connect(member1).claimDividend()).to.be.revertedWith(
          ERRORS.NOTHING_TO_RELEASE
        )
      })

      it('should emit DividendClaimed event on successful claim', async () => {
        const member1Balance = await bankProxy.dividendBalances(member1.address)

        await expect(bankProxy.connect(member1).claimDividend())
          .to.emit(bankProxy, 'DividendClaimed')
          .withArgs(member1.address, member1Balance)
      })

      it('should not allow claims when contract is paused', async () => {
        await bank.pause()
        await expect(bankProxy.connect(member1).claimDividend()).to.be.revertedWithCustomError(
          bankProxy,
          ERRORS.PAUSED
        )
      })
    })

    context('Token Dividend Deposits', () => {
      const tokenDepositAmount = ethers.parseUnits('1000', 6)

      beforeEach(async () => {
        // Mint and deposit tokens to bank
        await mockUSDT.mint(owner.address, tokenDepositAmount)
        await mockUSDT.approve(await bankProxy.getAddress(), tokenDepositAmount)
        await bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), tokenDepositAmount)
      })

      it('should allow owner to deposit token dividends', async () => {
        const dividendAmount = ethers.parseUnits('600', 6)

        const tx = await bank.depositTokenDividends(
          await mockUSDT.getAddress(),
          dividendAmount,
          await investorProxy.getAddress()
        )

        await expect(tx)
          .to.emit(bankProxy, 'TokenDividendDeposited')
          .withArgs(
            owner.address,
            await mockUSDT.getAddress(),
            dividendAmount,
            await investorProxy.getAddress()
          )

        // Check token dividend allocation (60/40 split)
        const member1TokenBalance = await bankProxy.getTokenDividendBalance(
          await mockUSDT.getAddress(),
          member1.address
        )
        const member2TokenBalance = await bankProxy.getTokenDividendBalance(
          await mockUSDT.getAddress(),
          member2.address
        )

        expect(member1TokenBalance).to.equal(ethers.parseUnits('360', 6)) // 60%
        expect(member2TokenBalance).to.equal(ethers.parseUnits('240', 6)) // 40%
        expect(await bankProxy.totalTokenDividends(await mockUSDT.getAddress())).to.equal(
          dividendAmount
        )
      })

      it('should not allow depositing unsupported token dividends', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const unsupportedToken = (await MockToken.deploy(
          'UNSUPPORTED',
          'UNS'
        )) as unknown as MockERC20

        await expect(
          bank.depositTokenDividends(
            await unsupportedToken.getAddress(),
            100,
            await investorProxy.getAddress()
          )
        ).to.be.revertedWith(ERRORS.UNSUPPORTED_TOKEN)
      })

      it('should not allow depositing zero amount token dividends', async () => {
        await expect(
          bank.depositTokenDividends(
            await mockUSDT.getAddress(),
            0,
            await investorProxy.getAddress()
          )
        ).to.be.revertedWith(ERRORS.AMOUNT_ZERO)
      })

      it('should not allow depositing more than unlocked token balance', async () => {
        const excessAmount = ethers.parseUnits('2000', 6)
        await expect(
          bank.depositTokenDividends(
            await mockUSDT.getAddress(),
            excessAmount,
            await investorProxy.getAddress()
          )
        ).to.be.revertedWith(ERRORS.INSUFFICIENT_BANK_BALANCE)
      })

      it('should emit TokenDividendCredited events during allocation', async () => {
        const dividendAmount = ethers.parseUnits('600', 6)

        const tx = await bank.depositTokenDividends(
          await mockUSDT.getAddress(),
          dividendAmount,
          await investorProxy.getAddress()
        )

        await expect(tx)
          .to.emit(bankProxy, 'TokenDividendCredited')
          .withArgs(member1.address, await mockUSDT.getAddress(), ethers.parseUnits('360', 6))
        await expect(tx)
          .to.emit(bankProxy, 'TokenDividendCredited')
          .withArgs(member2.address, await mockUSDT.getAddress(), ethers.parseUnits('240', 6))
      })
    })

    context('Token Dividend Claims', () => {
      const tokenDepositAmount = ethers.parseUnits('1000', 6)
      const dividendAmount = ethers.parseUnits('600', 6)

      beforeEach(async () => {
        // Mint and deposit tokens to bank
        await mockUSDT.mint(owner.address, tokenDepositAmount)
        await mockUSDT.approve(await bankProxy.getAddress(), tokenDepositAmount)
        await bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), tokenDepositAmount)

        // Deposit token dividends
        await bank.depositTokenDividends(
          await mockUSDT.getAddress(),
          dividendAmount,
          await investorProxy.getAddress()
        )
      })

      it('should allow shareholders to claim their token dividends', async () => {
        const member1Balance = await bankProxy.getTokenDividendBalance(
          await mockUSDT.getAddress(),
          member1.address
        )
        const member2Balance = await bankProxy.getTokenDividendBalance(
          await mockUSDT.getAddress(),
          member2.address
        )

        await expect(
          bankProxy.connect(member1).claimTokenDividend(await mockUSDT.getAddress())
        ).to.changeTokenBalance(mockUSDT, member1, member1Balance)

        expect(
          await bankProxy.getTokenDividendBalance(await mockUSDT.getAddress(), member1.address)
        ).to.equal(0)

        await expect(
          bankProxy.connect(member2).claimTokenDividend(await mockUSDT.getAddress())
        ).to.changeTokenBalance(mockUSDT, member2, member2Balance)

        expect(
          await bankProxy.getTokenDividendBalance(await mockUSDT.getAddress(), member2.address)
        ).to.equal(0)
        expect(await bankProxy.totalTokenDividends(await mockUSDT.getAddress())).to.equal(0)
      })

      it('should not allow claiming unsupported token dividends', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const unsupportedToken = (await MockToken.deploy(
          'UNSUPPORTED',
          'UNS'
        )) as unknown as MockERC20

        await expect(
          bankProxy.connect(member1).claimTokenDividend(await unsupportedToken.getAddress())
        ).to.be.revertedWith(ERRORS.UNSUPPORTED_TOKEN)
      })

      it('should not allow claiming with zero balance', async () => {
        await expect(
          bankProxy.connect(contractor).claimTokenDividend(await mockUSDT.getAddress())
        ).to.be.revertedWith(ERRORS.NOTHING_TO_RELEASE)
      })

      it('should not allow claiming twice', async () => {
        await bankProxy.connect(member1).claimTokenDividend(await mockUSDT.getAddress())
        await expect(
          bankProxy.connect(member1).claimTokenDividend(await mockUSDT.getAddress())
        ).to.be.revertedWith(ERRORS.NOTHING_TO_RELEASE)
      })

      it('should emit TokenDividendClaimed event on successful claim', async () => {
        const member1Balance = await bankProxy.getTokenDividendBalance(
          await mockUSDT.getAddress(),
          member1.address
        )

        await expect(bankProxy.connect(member1).claimTokenDividend(await mockUSDT.getAddress()))
          .to.emit(bankProxy, 'TokenDividendClaimed')
          .withArgs(member1.address, await mockUSDT.getAddress(), member1Balance)
      })

      it('should not allow claims when contract is paused', async () => {
        await bank.pause()
        await expect(
          bankProxy.connect(member1).claimTokenDividend(await mockUSDT.getAddress())
        ).to.be.revertedWithCustomError(bankProxy, ERRORS.PAUSED)
      })
    })

    context('Balance Management', () => {
      const depositAmount = ethers.parseEther('10')

      it('should correctly track total dividend balance', async () => {
        expect(await bankProxy.totalDividends()).to.equal(0)

        await bank.depositDividends(depositAmount, await investorProxy.getAddress())
        expect(await bankProxy.totalDividends()).to.equal(depositAmount)

        await bankProxy.connect(member1).claimDividend()
        expect(await bankProxy.totalDividends()).to.equal(ethers.parseEther('4'))
      })

      it('should correctly calculate unlocked balance', async () => {
        const initialBalance = await ethers.provider.getBalance(await bankProxy.getAddress())
        await bank.depositDividends(depositAmount, await investorProxy.getAddress())

        const expectedUnlocked = initialBalance - depositAmount
        expect(await bankProxy.getUnlockedBalance()).to.equal(expectedUnlocked)
      })

      it('should correctly track total token dividend balance', async () => {
        const tokenAmount = ethers.parseUnits('1000', 6)
        const dividendAmount = ethers.parseUnits('600', 6)

        // Setup
        await mockUSDT.mint(owner.address, tokenAmount)
        await mockUSDT.approve(await bankProxy.getAddress(), tokenAmount)
        await bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), tokenAmount)

        expect(await bankProxy.totalTokenDividends(await mockUSDT.getAddress())).to.equal(0)

        await bank.depositTokenDividends(
          await mockUSDT.getAddress(),
          dividendAmount,
          await investorProxy.getAddress()
        )
        expect(await bankProxy.totalTokenDividends(await mockUSDT.getAddress())).to.equal(
          dividendAmount
        )

        await bankProxy.connect(member1).claimTokenDividend(await mockUSDT.getAddress())
        expect(await bankProxy.totalTokenDividends(await mockUSDT.getAddress())).to.equal(
          ethers.parseUnits('240', 6) // 40% remaining
        )
      })

      it('should correctly calculate unlocked token balance', async () => {
        const tokenAmount = ethers.parseUnits('1000', 6)
        const dividendAmount = ethers.parseUnits('600', 6)

        await mockUSDT.mint(owner.address, tokenAmount)
        await mockUSDT.approve(await bankProxy.getAddress(), tokenAmount)
        await bankProxy.connect(owner).depositToken(await mockUSDT.getAddress(), tokenAmount)

        expect(await bankProxy.getUnlockedTokenBalance(await mockUSDT.getAddress())).to.equal(
          tokenAmount
        )

        await bank.depositTokenDividends(
          await mockUSDT.getAddress(),
          dividendAmount,
          await investorProxy.getAddress()
        )

        const expectedUnlocked = tokenAmount - dividendAmount
        expect(await bankProxy.getUnlockedTokenBalance(await mockUSDT.getAddress())).to.equal(
          expectedUnlocked
        )
      })
    })
  })

  describe('Edge Cases', () => {
    beforeEach(async () => {
      ;[owner, contractor, member1, member2] = await ethers.getSigners()

      const MockToken = await ethers.getContractFactory('MockERC20')
      mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
      mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20

      await deployContracts()

      await owner.sendTransaction({
        to: await bankProxy.getAddress(),
        value: ethers.parseEther('100')
      })

      await investorProxy.distributeMint([
        { shareholder: member1.address, amount: ethers.parseEther('60') },
        { shareholder: member2.address, amount: ethers.parseEther('40') }
      ])
    })

    it('should handle empty shareholders case', async () => {
      // Deploy a fresh investor contract with no tokens minted
      const InvestorsV1Implementation = await ethers.getContractFactory('InvestorV1')
      const emptyInvestorProxy = (await upgrades.deployProxy(
        InvestorsV1Implementation,
        ['EMPTY', 'EMPT', await owner.getAddress()],
        { initializer: 'initialize' }
      )) as unknown as InvestorV1

      await expect(
        bank.depositDividends(ethers.parseEther('50'), await emptyInvestorProxy.getAddress())
      ).to.be.revertedWith(ERRORS.ZERO_SUPPLY)
    })
  })
})

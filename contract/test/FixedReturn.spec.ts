import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import {
  loadFixture,
  time,
  impersonateAccount,
  setBalance
} from '@nomicfoundation/hardhat-network-helpers'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  Bank,
  FeeCollector,
  FixedReturn,
  MockERC20,
  MockOfficer,
  Officer
} from '../typechain-types'

describe('FixedReturn', () => {
  const TermUnit = { Days: 0, Months: 1, Years: 2 }
  const FundingAccess = { General: 0, Whitelist: 1 }
  const OfferState = { Open: 0, Funded: 1, Refundable: 2, Repaying: 3 }

  const FUNDING_TARGET = ethers.parseUnits('100000', 6)
  const INTEREST_RATE_BPS = 800n // 8%, flat over the whole term
  const TERM_DURATION = 12

  const ERRORS = {
    ZERO_ADDRESS: 'ZeroAddress',
    INVALID_DEADLINE: 'InvalidDeadline',
    INVALID_TERM_DURATION: 'InvalidTermDuration',
    LENDER_CAP_EXCEEDS_TARGET: 'LenderCapExceedsFundingTarget',
    ALLOCATION_SUM_EXCEEDS_TARGET: 'AllocationSumExceedsFundingTarget',
    WHITELIST_LENGTH_MISMATCH: 'WhitelistLengthMismatch',
    OFFER_NOT_OPEN: 'OfferNotOpen',
    OFFER_NOT_FUNDED: 'OfferNotFunded',
    OFFER_NOT_REFUNDABLE: 'OfferNotRefundable',
    DEADLINE_NOT_PASSED: 'DeadlineNotPassed',
    NOT_WHITELISTED: 'NotWhitelisted',
    DEPOSIT_EXCEEDS_ALLOCATION: 'DepositExceedsAllocation',
    DEPOSIT_EXCEEDS_LENDER_CAP: 'DepositExceedsLenderCap',
    FUNDING_TARGET_REACHED: 'FundingTargetReached',
    NOTHING_TO_REFUND: 'NothingToRefund',
    ZERO_AMOUNT: 'ZeroAmount',
    TOKEN_NOT_SUPPORTED: 'TokenSupportNotFound',
    TOKEN_NOT_SUPPORTED_BY_BANK: 'TokenNotSupportedByBank',
    EXCEEDS_REPAYMENT_OBLIGATION: 'ExceedsRepaymentObligation',
    OWNABLE_UNAUTHORIZED: 'OwnableUnauthorizedAccount',
    NOT_BANK: 'NotBank'
  } as const

  // Deploys MockOfficer, then deploys Bank and FixedReturn with MockOfficer impersonated
  // as the caller so each contract's officerAddress points at MockOfficer. Both are
  // registered in MockOfficer so peer-contract lookups (onlyBank, onlyFixedReturn) resolve
  // correctly. Mirrors the deployContracts() phase in Bank.spec.ts.
  async function deployContracts(owner: SignerWithAddress, initialTokens: string[] = []) {
    const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
    const BankFactory = await ethers.getContractFactory('Bank')
    const FixedReturnFactory = await ethers.getContractFactory('FixedReturn')

    const mockOfficer = (await MockOfficerFactory.deploy()) as unknown as MockOfficer
    await mockOfficer.waitForDeployment()
    const mockOfficerAddress = await mockOfficer.getAddress()

    await impersonateAccount(mockOfficerAddress)
    const officerSigner = await ethers.getSigner(mockOfficerAddress)
    await setBalance(mockOfficerAddress, ethers.parseEther('1000'))

    const bank = (await upgrades.deployProxy(
      BankFactory.connect(officerSigner),
      [[], owner.address],
      { initializer: 'initialize', unsafeSkipProxyAdminCheck: true }
    )) as unknown as Bank

    await mockOfficer.setDeployedContract('Bank', await bank.getAddress())

    // repayLenders is onlyBank — impersonate the real Bank address so FixedReturn's
    // own repayment logic (ceiling, cumulative distribution, rounding) can be unit
    // tested directly, mirroring how InvestorV1.spec.ts tests distributeTokenDividends
    // via an impersonated bankSigner rather than the full Bank call chain.
    const bankAddress = await bank.getAddress()
    await impersonateAccount(bankAddress)
    const bankSigner = await ethers.getSigner(bankAddress)
    await setBalance(bankAddress, ethers.parseEther('1000'))

    const fixedReturn = (await upgrades.deployProxy(
      FixedReturnFactory.connect(officerSigner),
      [initialTokens, owner.address],
      { initializer: 'initialize', unsafeSkipProxyAdminCheck: true }
    )) as unknown as FixedReturn

    await mockOfficer.setDeployedContract('FixedReturn', await fixedReturn.getAddress())

    return { mockOfficer, bank, bankSigner, fixedReturn: fixedReturn.connect(owner) }
  }

  async function deployFixture() {
    const [owner, lenderA, lenderB, lenderC, stranger] = await ethers.getSigners()

    const MockToken = await ethers.getContractFactory('MockERC20')
    const token = (await MockToken.deploy('Mock USDC', 'mUSDC')) as unknown as MockERC20
    const otherToken = (await MockToken.deploy('Mock DAI', 'mDAI')) as unknown as MockERC20

    const { bank, bankSigner, fixedReturn } = await deployContracts(owner)

    // Both FixedReturn and Bank must support the token:
    // FixedReturn — for offer creation and lender deposits
    // Bank        — checked during createLendingOffer; required so Bank can send repayments out
    await fixedReturn.connect(owner).addTokenSupport(await token.getAddress())
    await bank.connect(owner).addTokenSupport(await token.getAddress())

    for (const lender of [lenderA, lenderB, lenderC]) {
      await token.mint(lender.address, ethers.parseUnits('100000', 6))
      await token.connect(lender).approve(await fixedReturn.getAddress(), ethers.MaxUint256)
    }
    await token.mint(owner.address, ethers.parseUnits('200000', 6))

    const now = await time.latest()
    const startDate = now + 1000
    const subscriptionDeadline = now + 500 // on/before startDate — valid

    return {
      bank,
      bankSigner,
      fixedReturn,
      token,
      otherToken,
      owner,
      lenderA,
      lenderB,
      lenderC,
      stranger,
      startDate,
      subscriptionDeadline
    }
  }

  function baseParams(
    token: string,
    startDate: number,
    subscriptionDeadline: number,
    overrides: Record<string, unknown> = {}
  ) {
    return {
      token,
      fundingTarget: FUNDING_TARGET,
      interestRateBps: INTEREST_RATE_BPS,
      termDuration: TERM_DURATION,
      termUnit: TermUnit.Months,
      startDate,
      subscriptionDeadline,
      fundingAccess: FundingAccess.General,
      isCapEnabled: false,
      lenderCap: 0n,
      whitelistAddrs: [],
      allocations: [],
      ...overrides
    }
  }

  async function createGeneralOffer(
    fixedReturn: FixedReturn,
    owner: SignerWithAddress,
    token: string,
    startDate: number,
    subscriptionDeadline: number,
    overrides: Record<string, unknown> = {}
  ) {
    const tx = await fixedReturn
      .connect(owner)
      .createLendingOffer(baseParams(token, startDate, subscriptionDeadline, overrides))
    await tx.wait()
    return fixedReturn.totalOfferings()
  }

  async function createWhitelistOffer(
    fixedReturn: FixedReturn,
    owner: SignerWithAddress,
    token: string,
    startDate: number,
    subscriptionDeadline: number,
    lenderA: SignerWithAddress,
    lenderB: SignerWithAddress
  ) {
    return createGeneralOffer(fixedReturn, owner, token, startDate, subscriptionDeadline, {
      fundingAccess: FundingAccess.Whitelist,
      whitelistAddrs: [lenderA.address, lenderB.address],
      allocations: [ethers.parseUnits('60000', 6), ethers.parseUnits('40000', 6)]
    })
  }

  async function fundOffer(
    fixedReturn: FixedReturn,
    offerId: bigint,
    lenderA: SignerWithAddress,
    lenderB: SignerWithAddress
  ) {
    await fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60000', 6))
    await fixedReturn.connect(lenderB).lendFunds(offerId, ethers.parseUnits('40000', 6))
  }

  describe('initialize', () => {
    it('sets the owner', async () => {
      const { fixedReturn, owner } = await loadFixture(deployFixture)
      expect(await fixedReturn.owner()).to.equal(owner.address)
    })

    it('reports its version', async () => {
      const { fixedReturn } = await loadFixture(deployFixture)
      expect(await fixedReturn.version()).to.equal('1.2.0')
    })

    it('rejects a zero-address owner', async () => {
      const FixedReturnFactory = await ethers.getContractFactory('FixedReturn')
      await expect(
        upgrades.deployProxy(FixedReturnFactory, [[], ethers.ZeroAddress], {
          initializer: 'initialize'
        })
      ).to.be.revertedWithCustomError(FixedReturnFactory, ERRORS.ZERO_ADDRESS)
    })

    it('rejects being initialized a second time', async () => {
      const { fixedReturn, owner } = await loadFixture(deployFixture)
      await expect(fixedReturn.initialize([], owner.address)).to.be.reverted
    })

    it('pre-registers an initial set of supported tokens, mirroring Bank', async () => {
      const [owner] = await ethers.getSigners()
      const MockToken = await ethers.getContractFactory('MockERC20')
      const tokenA = (await MockToken.deploy('Mock USDC', 'mUSDC')) as unknown as MockERC20
      const tokenB = (await MockToken.deploy('Mock DAI', 'mDAI')) as unknown as MockERC20

      const { fixedReturn } = await deployContracts(owner, [
        await tokenA.getAddress(),
        await tokenB.getAddress()
      ])

      expect(await fixedReturn.isTokenSupported(await tokenA.getAddress())).to.be.true
      expect(await fixedReturn.isTokenSupported(await tokenB.getAddress())).to.be.true
    })
  })

  describe('token allowlist', () => {
    it('rejects addTokenSupport from a non-owner', async () => {
      const { fixedReturn, otherToken, stranger } = await loadFixture(deployFixture)
      await expect(
        fixedReturn.connect(stranger).addTokenSupport(await otherToken.getAddress())
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.OWNABLE_UNAUTHORIZED)
    })

    it('rejects removeTokenSupport from a non-owner', async () => {
      const { fixedReturn, token, stranger } = await loadFixture(deployFixture)
      await expect(
        fixedReturn.connect(stranger).removeTokenSupport(await token.getAddress())
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.OWNABLE_UNAUTHORIZED)
    })

    it('allows the owner to remove a previously supported token', async () => {
      const { fixedReturn, owner, token } = await loadFixture(deployFixture)
      expect(await fixedReturn.isTokenSupported(await token.getAddress())).to.be.true

      await fixedReturn.connect(owner).removeTokenSupport(await token.getAddress())

      expect(await fixedReturn.isTokenSupported(await token.getAddress())).to.be.false
    })
  })

  describe('createLendingOffer', () => {
    it('creates an offer with the expected fields and Open state', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      expect(offerId).to.equal(1n)

      const offer = await fixedReturn.getLendingOffer(offerId)
      expect(offer.token).to.equal(await token.getAddress())
      expect(offer.fundingTarget).to.equal(FUNDING_TARGET)
      expect(offer.interestRateBps).to.equal(INTEREST_RATE_BPS)
      expect(offer.state).to.equal(OfferState.Open)
    })

    it('emits LendingOfferCreated', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn
          .connect(owner)
          .createLendingOffer(baseParams(await token.getAddress(), startDate, subscriptionDeadline))
      )
        .to.emit(fixedReturn, 'LendingOfferCreated')
        .withArgs(
          1n,
          await token.getAddress(),
          FUNDING_TARGET,
          INTEREST_RATE_BPS,
          startDate,
          subscriptionDeadline,
          FundingAccess.General
        )
    })

    it('rejects a non-owner caller', async () => {
      const { fixedReturn, stranger, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn
          .connect(stranger)
          .createLendingOffer(baseParams(await token.getAddress(), startDate, subscriptionDeadline))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.OWNABLE_UNAUTHORIZED)
    })

    it('rejects a token that is not on the allowlist', async () => {
      const { fixedReturn, owner, otherToken, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn
          .connect(owner)
          .createLendingOffer(
            baseParams(await otherToken.getAddress(), startDate, subscriptionDeadline)
          )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.TOKEN_NOT_SUPPORTED)
    })

    it('rejects a token not supported by Bank', async () => {
      const { fixedReturn, owner, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const MockToken = await ethers.getContractFactory('MockERC20')
      const unsupportedByBank = (await MockToken.deploy(
        'Unsupported',
        'UNS'
      )) as unknown as MockERC20
      // Add to FixedReturn but NOT to Bank
      await fixedReturn.connect(owner).addTokenSupport(await unsupportedByBank.getAddress())
      await expect(
        fixedReturn
          .connect(owner)
          .createLendingOffer(
            baseParams(await unsupportedByBank.getAddress(), startDate, subscriptionDeadline)
          )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.TOKEN_NOT_SUPPORTED_BY_BANK)
    })

    it('rejects a subscriptionDeadline after startDate', async () => {
      const { fixedReturn, owner, token, startDate } = await loadFixture(deployFixture)

      await expect(
        fixedReturn.connect(owner).createLendingOffer(
          baseParams(await token.getAddress(), startDate, startDate + 1) // deadline after start
        )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.INVALID_DEADLINE)
    })

    it('rejects a zero termDuration', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn.connect(owner).createLendingOffer(
          baseParams(await token.getAddress(), startDate, subscriptionDeadline, {
            termDuration: 0
          })
        )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.INVALID_TERM_DURATION)
    })

    it('rejects a zero termDuration in Days', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn.connect(owner).createLendingOffer(
          baseParams(await token.getAddress(), startDate, subscriptionDeadline, {
            termUnit: TermUnit.Days,
            termDuration: 0
          })
        )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.INVALID_TERM_DURATION)
    })

    it('rejects a zero termDuration in Years', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn.connect(owner).createLendingOffer(
          baseParams(await token.getAddress(), startDate, subscriptionDeadline, {
            termUnit: TermUnit.Years,
            termDuration: 0
          })
        )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.INVALID_TERM_DURATION)
    })

    it('rejects a termDuration beyond the max for its unit', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn.connect(owner).createLendingOffer(
          baseParams(await token.getAddress(), startDate, subscriptionDeadline, {
            termUnit: TermUnit.Months,
            termDuration: 121 // max for Months is 120
          })
        )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.INVALID_TERM_DURATION)
    })

    it('rejects a Days termDuration beyond its max', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn.connect(owner).createLendingOffer(
          baseParams(await token.getAddress(), startDate, subscriptionDeadline, {
            termUnit: TermUnit.Days,
            termDuration: 366 // max for Days is 365
          })
        )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.INVALID_TERM_DURATION)
    })

    it('rejects a Years termDuration beyond its max', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn.connect(owner).createLendingOffer(
          baseParams(await token.getAddress(), startDate, subscriptionDeadline, {
            termUnit: TermUnit.Years,
            termDuration: 31 // max for Years is 30
          })
        )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.INVALID_TERM_DURATION)
    })

    it('rejects a lenderCap exceeding the funding target', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn.connect(owner).createLendingOffer(
          baseParams(await token.getAddress(), startDate, subscriptionDeadline, {
            isCapEnabled: true,
            lenderCap: FUNDING_TARGET + 1n
          })
        )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.LENDER_CAP_EXCEEDS_TARGET)
    })

    it('rejects mismatched whitelist/allocation array lengths', async () => {
      const { fixedReturn, owner, token, lenderA, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn.connect(owner).createLendingOffer(
          baseParams(await token.getAddress(), startDate, subscriptionDeadline, {
            fundingAccess: FundingAccess.Whitelist,
            whitelistAddrs: [lenderA.address],
            allocations: []
          })
        )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.WHITELIST_LENGTH_MISMATCH)
    })

    it('rejects whitelist allocations summing above the funding target', async () => {
      const { fixedReturn, owner, token, lenderA, lenderB, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)

      await expect(
        fixedReturn.connect(owner).createLendingOffer(
          baseParams(await token.getAddress(), startDate, subscriptionDeadline, {
            fundingAccess: FundingAccess.Whitelist,
            whitelistAddrs: [lenderA.address, lenderB.address],
            allocations: [ethers.parseUnits('60000', 6), ethers.parseUnits('50000', 6)] // sums to 110k > 100k target
          })
        )
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.ALLOCATION_SUM_EXCEEDS_TARGET)
    })
  })

  describe('lendFunds — General access', () => {
    it('records a deposit', async () => {
      const { fixedReturn, owner, lenderA, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      const amount = ethers.parseUnits('60000', 6)
      await expect(fixedReturn.connect(lenderA).lendFunds(offerId, amount))
        .to.emit(fixedReturn, 'FundsLent')
        .withArgs(offerId, lenderA.address, amount)

      expect(await fixedReturn.lenderDeposits(offerId, lenderA.address)).to.equal(amount)
    })

    it('rejects a zero amount', async () => {
      const { fixedReturn, owner, lenderA, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      await expect(
        fixedReturn.connect(lenderA).lendFunds(offerId, 0)
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.ZERO_AMOUNT)
    })

    it('rejects a deposit after the subscription deadline', async () => {
      const { fixedReturn, owner, lenderA, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      await time.increaseTo(subscriptionDeadline + 1)

      await expect(
        fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('1000', 6))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.OFFER_NOT_OPEN)
    })

    it('rejects a single deposit that would overshoot the remaining room while still Open', async () => {
      // Offer stays Open (60k of 100k raised) — a 50k deposit would overshoot the
      // remaining 40k room. This is distinct from the already-Funded case below:
      // once totalFunded reaches the target the state flips to Funded and any further
      // deposit hits OfferNotOpen first, so this is the only way to reach this branch.
      const { fixedReturn, owner, lenderA, lenderB, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60000', 6))

      await expect(
        fixedReturn.connect(lenderB).lendFunds(offerId, ethers.parseUnits('50000', 6))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.FUNDING_TARGET_REACHED)
    })

    it('rejects any deposit once the offer is already Funded', async () => {
      const {
        fixedReturn,
        owner,
        lenderA,
        lenderB,
        lenderC,
        token,
        startDate,
        subscriptionDeadline
      } = await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fundOffer(fixedReturn, offerId, lenderA, lenderB)

      await expect(
        fixedReturn.connect(lenderC).lendFunds(offerId, ethers.parseUnits('1', 6))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.OFFER_NOT_OPEN)
    })

    it('accepts a deposit that lands exactly on the remaining target', async () => {
      const { fixedReturn, owner, lenderA, lenderB, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      await fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60000', 6))
      // remaining room is exactly 40k — must succeed, not revert
      await expect(fixedReturn.connect(lenderB).lendFunds(offerId, ethers.parseUnits('40000', 6)))
        .to.not.be.reverted

      const offer = await fixedReturn.getLendingOffer(offerId)
      expect(offer.totalFunded).to.equal(FUNDING_TARGET)
      expect(offer.state).to.equal(OfferState.Funded)
    })

    it('enforces the per-lender cap when enabled', async () => {
      const { fixedReturn, owner, lenderA, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline,
        { isCapEnabled: true, lenderCap: ethers.parseUnits('50000', 6) }
      )

      await expect(
        fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60000', 6))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.DEPOSIT_EXCEEDS_LENDER_CAP)
    })

    it('accepts a deposit within an enabled per-lender cap', async () => {
      const { fixedReturn, owner, lenderA, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline,
        { isCapEnabled: true, lenderCap: ethers.parseUnits('50000', 6) }
      )

      const amount = ethers.parseUnits('50000', 6)
      await expect(fixedReturn.connect(lenderA).lendFunds(offerId, amount)).to.not.be.reverted
      expect(await fixedReturn.lenderDeposits(offerId, lenderA.address)).to.equal(amount)
    })

    it('transitions to Funded and emits LendingOfferFunded once the target is reached', async () => {
      const { fixedReturn, owner, lenderA, lenderB, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      await fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60000', 6))
      await expect(
        fixedReturn.connect(lenderB).lendFunds(offerId, ethers.parseUnits('40000', 6))
      ).to.emit(fixedReturn, 'LendingOfferFunded')

      const offer = await fixedReturn.getLendingOffer(offerId)
      expect(offer.state).to.equal(OfferState.Funded)
    })

    it('sweeps the full principal to Bank on the funding deposit', async () => {
      const { fixedReturn, bank, owner, lenderA, lenderB, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      await fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60000', 6))
      // The funding deposit emits FundsSweptToBank with the amount and destination.
      await expect(fixedReturn.connect(lenderB).lendFunds(offerId, ethers.parseUnits('40000', 6)))
        .to.emit(fixedReturn, 'FundsSweptToBank')
        .withArgs(offerId, await bank.getAddress(), await token.getAddress(), FUNDING_TARGET)

      // All principal now sits in Bank, nothing in FixedReturn
      expect(await token.balanceOf(await bank.getAddress())).to.equal(FUNDING_TARGET)
      expect(await token.balanceOf(await fixedReturn.getAddress())).to.equal(0)
    })

    it('emits FundingProgressed and does not sweep on a partial deposit', async () => {
      const { fixedReturn, bank, owner, lenderA, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      const partial = ethers.parseUnits('60000', 6)
      await expect(fixedReturn.connect(lenderA).lendFunds(offerId, partial))
        .to.emit(fixedReturn, 'FundingProgressed')
        .withArgs(offerId, partial, FUNDING_TARGET)

      // Not funded yet: offer stays Open, no sweep — funds held in FixedReturn.
      const offer = await fixedReturn.getLendingOffer(offerId)
      expect(offer.state).to.equal(OfferState.Open)
      expect(await token.balanceOf(await bank.getAddress())).to.equal(0)
      expect(await token.balanceOf(await fixedReturn.getAddress())).to.equal(partial)
    })
  })

  describe('lendFunds — Whitelist access', () => {
    it('records a deposit within the lender allocation', async () => {
      const { fixedReturn, owner, lenderA, lenderB, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createWhitelistOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline,
        lenderA,
        lenderB
      )

      const amount = ethers.parseUnits('60000', 6)
      await fixedReturn.connect(lenderA).lendFunds(offerId, amount)
      expect(await fixedReturn.lenderDeposits(offerId, lenderA.address)).to.equal(amount)
    })

    it('rejects a caller with no allocation', async () => {
      const {
        fixedReturn,
        owner,
        lenderA,
        lenderB,
        stranger,
        token,
        startDate,
        subscriptionDeadline
      } = await loadFixture(deployFixture)
      const offerId = await createWhitelistOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline,
        lenderA,
        lenderB
      )

      await expect(
        fixedReturn.connect(stranger).lendFunds(offerId, ethers.parseUnits('1000', 6))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.NOT_WHITELISTED)
    })

    it('rejects a deposit exceeding the caller allocation', async () => {
      const { fixedReturn, owner, lenderA, lenderB, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createWhitelistOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline,
        lenderA,
        lenderB
      )

      await expect(
        fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60001', 6))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.DEPOSIT_EXCEEDS_ALLOCATION)
    })

    it('ignores lenderCap for whitelisted deposits', async () => {
      // allocation (60k) intentionally exceeds what a General-mode cap would ever allow,
      // proving the cap path is not consulted at all in Whitelist mode.
      const { fixedReturn, owner, lenderA, lenderB, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline,
        {
          fundingAccess: FundingAccess.Whitelist,
          isCapEnabled: true,
          lenderCap: ethers.parseUnits('1000', 6),
          whitelistAddrs: [lenderA.address, lenderB.address],
          allocations: [ethers.parseUnits('60000', 6), ethers.parseUnits('40000', 6)]
        }
      )

      await expect(fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60000', 6)))
        .to.not.be.reverted
    })
  })

  describe('markAsRefundable', () => {
    it('flips an unfunded, deadline-passed offer to Refundable', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      await time.increaseTo(subscriptionDeadline + 1)
      await expect(fixedReturn.connect(owner).markAsRefundable(offerId))
        .to.emit(fixedReturn, 'LendingOfferRefundable')
        .withArgs(offerId)

      const offer = await fixedReturn.getLendingOffer(offerId)
      expect(offer.state).to.equal(OfferState.Refundable)
    })

    it('rejects flipping before the deadline has passed', async () => {
      const { fixedReturn, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      await expect(
        fixedReturn.connect(owner).markAsRefundable(offerId)
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.DEADLINE_NOT_PASSED)
    })

    it('rejects flipping an already-funded offer', async () => {
      const { fixedReturn, owner, lenderA, lenderB, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fundOffer(fixedReturn, offerId, lenderA, lenderB)

      await time.increaseTo(subscriptionDeadline + 1)
      await expect(
        fixedReturn.connect(owner).markAsRefundable(offerId)
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.OFFER_NOT_OPEN)
    })

    it('rejects a non-owner caller', async () => {
      const { fixedReturn, stranger, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      await time.increaseTo(subscriptionDeadline + 1)
      await expect(
        fixedReturn.connect(stranger).markAsRefundable(offerId)
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.OWNABLE_UNAUTHORIZED)
    })
  })

  describe('claimRefund', () => {
    async function setupRefundable() {
      const fixture = await loadFixture(deployFixture)
      const { fixedReturn, owner, lenderA, token, startDate, subscriptionDeadline } = fixture
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60000', 6))
      await time.increaseTo(subscriptionDeadline + 1)
      await fixedReturn.connect(owner).markAsRefundable(offerId)
      return { ...fixture, offerId }
    }

    it('returns the lender principal and zeroes their deposit', async () => {
      const { fixedReturn, lenderA, token, offerId } = await setupRefundable()
      const balanceBefore = await token.balanceOf(lenderA.address)

      await expect(fixedReturn.connect(lenderA).claimRefund(offerId))
        .to.emit(fixedReturn, 'PrincipalRefunded')
        .withArgs(offerId, lenderA.address, ethers.parseUnits('60000', 6))

      expect(await token.balanceOf(lenderA.address)).to.equal(
        balanceBefore + ethers.parseUnits('60000', 6)
      )
      expect(await fixedReturn.lenderDeposits(offerId, lenderA.address)).to.equal(0)
    })

    it('rejects a claim from a lender with nothing deposited', async () => {
      const { fixedReturn, lenderB, offerId } = await setupRefundable()

      await expect(fixedReturn.connect(lenderB).claimRefund(offerId)).to.be.revertedWithCustomError(
        fixedReturn,
        ERRORS.NOTHING_TO_REFUND
      )
    })

    it('rejects a second claim from the same lender', async () => {
      const { fixedReturn, lenderA, offerId } = await setupRefundable()

      await fixedReturn.connect(lenderA).claimRefund(offerId)
      await expect(fixedReturn.connect(lenderA).claimRefund(offerId)).to.be.revertedWithCustomError(
        fixedReturn,
        ERRORS.NOTHING_TO_REFUND
      )
    })

    it('rejects a claim on an offer that is not Refundable', async () => {
      const { fixedReturn, owner, lenderA, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60000', 6))

      await expect(fixedReturn.connect(lenderA).claimRefund(offerId)).to.be.revertedWithCustomError(
        fixedReturn,
        ERRORS.OFFER_NOT_REFUNDABLE
      )
    })
  })

  describe('repayLenders', () => {
    it('distributes a repayment proportionally to each lender principal', async () => {
      const {
        fixedReturn,
        bankSigner,
        owner,
        lenderA,
        lenderB,
        token,
        startDate,
        subscriptionDeadline
      } = await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fundOffer(fixedReturn, offerId, lenderA, lenderB)

      const balanceABefore = await token.balanceOf(lenderA.address)
      const balanceBBefore = await token.balanceOf(lenderB.address)
      const repayAmount = ethers.parseUnits('108000', 6) // 100k principal + 8% interest
      // Bank would transfer this installment in before calling repayLenders.
      await token.mint(await fixedReturn.getAddress(), repayAmount)

      await expect(fixedReturn.connect(bankSigner).repayLenders(offerId, repayAmount))
        .to.emit(fixedReturn, 'RepaymentDistributed')
        .withArgs(offerId, repayAmount)

      // lenderA holds 60% of principal → 60% of the repayment; lenderB holds 40%
      expect(await token.balanceOf(lenderA.address)).to.equal(
        balanceABefore + ethers.parseUnits('64800', 6)
      )
      expect(await token.balanceOf(lenderB.address)).to.equal(
        balanceBBefore + ethers.parseUnits('43200', 6)
      )
    })

    it('accumulates correctly across multiple installments', async () => {
      const {
        fixedReturn,
        bankSigner,
        owner,
        lenderA,
        lenderB,
        token,
        startDate,
        subscriptionDeadline
      } = await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fundOffer(fixedReturn, offerId, lenderA, lenderB)

      const balanceABefore = await token.balanceOf(lenderA.address)
      const installment = ethers.parseUnits('54000', 6)

      // Bank funds each installment individually, right before each call.
      await token.mint(await fixedReturn.getAddress(), installment)
      await fixedReturn.connect(bankSigner).repayLenders(offerId, installment)
      await token.mint(await fixedReturn.getAddress(), installment)
      await fixedReturn.connect(bankSigner).repayLenders(offerId, installment)

      expect(await token.balanceOf(lenderA.address)).to.equal(
        balanceABefore + ethers.parseUnits('64800', 6)
      )

      const offer = await fixedReturn.getLendingOffer(offerId)
      expect(offer.state).to.equal(OfferState.Repaying)
      expect(offer.totalRepaidByIssuer).to.equal(ethers.parseUnits('108000', 6))
    })

    it('rejects repaying an offer that is still Open', async () => {
      const { fixedReturn, bankSigner, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      await expect(
        fixedReturn.connect(bankSigner).repayLenders(offerId, ethers.parseUnits('1000', 6))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.OFFER_NOT_FUNDED)
    })

    it('rejects a zero amount', async () => {
      const {
        fixedReturn,
        bankSigner,
        owner,
        lenderA,
        lenderB,
        token,
        startDate,
        subscriptionDeadline
      } = await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fundOffer(fixedReturn, offerId, lenderA, lenderB)

      await expect(
        fixedReturn.connect(bankSigner).repayLenders(offerId, 0)
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.ZERO_AMOUNT)
    })

    it('rejects a stranger calling repayLenders directly', async () => {
      const {
        fixedReturn,
        stranger,
        lenderA,
        lenderB,
        owner,
        token,
        startDate,
        subscriptionDeadline
      } = await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fundOffer(fixedReturn, offerId, lenderA, lenderB)

      await expect(
        fixedReturn.connect(stranger).repayLenders(offerId, ethers.parseUnits('1000', 6))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.NOT_BANK)
    })

    it('rejects the owner calling repayLenders directly — must go through Bank', async () => {
      const { fixedReturn, lenderA, lenderB, owner, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fundOffer(fixedReturn, offerId, lenderA, lenderB)

      await expect(
        fixedReturn.connect(owner).repayLenders(offerId, ethers.parseUnits('1000', 6))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.NOT_BANK)
    })

    it('rejects a repayment that would exceed the total lender obligation', async () => {
      const {
        fixedReturn,
        bankSigner,
        owner,
        lenderA,
        lenderB,
        token,
        startDate,
        subscriptionDeadline
      } = await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fundOffer(fixedReturn, offerId, lenderA, lenderB)

      // Total obligation: 100k principal + 8% = 108k
      const totalObligation = ethers.parseUnits('108000', 6)
      await token.mint(await fixedReturn.getAddress(), totalObligation)
      await fixedReturn.connect(bankSigner).repayLenders(offerId, totalObligation)

      // A second call — even for 1 wei — must revert (ceiling check runs before
      // any transfer, so FixedReturn doesn't need to hold that extra wei).
      await expect(
        fixedReturn.connect(bankSigner).repayLenders(offerId, 1n)
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.EXCEEDS_REPAYMENT_OBLIGATION)
    })

    it('maintains proportional totals across multiple tiny installments (exploit regression)', async () => {
      // Security regression: without cumulative tracking, an issuer repaying with
      // many small installments could redirect all principal to the final lender
      // (every installment's per-call remainder going to them).
      // With cumulative tracking each lender receives exactly their proportional share
      // across any installment partitioning.
      const {
        fixedReturn,
        bankSigner,
        owner,
        lenderA,
        lenderB,
        token,
        startDate,
        subscriptionDeadline
      } = await loadFixture(deployFixture)
      const fundingTarget = 1_000_000n
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline,
        { fundingTarget, interestRateBps: 0n }
      )

      // lenderA: 999_999 stake (~100%), lenderB: 1 stake (~0%).
      // Any per-installment remainder always going to lenderB would inflate their share.
      await fixedReturn.connect(lenderA).lendFunds(offerId, 999_999n)
      await fixedReturn.connect(lenderB).lendFunds(offerId, 1n)

      const lenderABefore = await token.balanceOf(lenderA.address)
      const lenderBBefore = await token.balanceOf(lenderB.address)

      // 3 installments of 2 wei each.
      // Per-installment naive: floor(2*999_999/1_000_000)=1 for A, remainder=1 for B each time → B gets 3, wrong.
      // Cumulative: after 6 total, A cumEnt=floor(6*999_999/1_000_000)=5, B cumEnt=1.
      await token.mint(await fixedReturn.getAddress(), 2n)
      await fixedReturn.connect(bankSigner).repayLenders(offerId, 2n)
      await token.mint(await fixedReturn.getAddress(), 2n)
      await fixedReturn.connect(bankSigner).repayLenders(offerId, 2n)
      await token.mint(await fixedReturn.getAddress(), 2n)
      await fixedReturn.connect(bankSigner).repayLenders(offerId, 2n)

      expect((await token.balanceOf(lenderA.address)) - lenderABefore).to.equal(5n)
      expect((await token.balanceOf(lenderB.address)) - lenderBBefore).to.equal(1n)
    })

    it('gives the rounding remainder to the final lender so no dust stays behind', async () => {
      // fundingTarget is tiny — integer division floors lenderA's share,
      // the remainder goes to lenderB (the final lender) instead of being lost.
      const {
        fixedReturn,
        bankSigner,
        owner,
        lenderA,
        lenderB,
        token,
        startDate,
        subscriptionDeadline
      } = await loadFixture(deployFixture)
      const fundingTarget = 1_000_000n // 1.0 token at 6 decimals
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline,
        { fundingTarget }
      )

      await fixedReturn.connect(lenderA).lendFunds(offerId, 999_999n)
      await fixedReturn.connect(lenderB).lendFunds(offerId, 1n)

      const lenderABalanceBefore = await token.balanceOf(lenderA.address)
      const lenderBBalanceBefore = await token.balanceOf(lenderB.address)

      await token.mint(await fixedReturn.getAddress(), 500_000n)
      await fixedReturn.connect(bankSigner).repayLenders(offerId, 500_000n)

      // lenderA (index 0): floor(500_000 * 999_999 / 1_000_000) = 499_999
      expect(await token.balanceOf(lenderA.address)).to.equal(lenderABalanceBefore + 499_999n)
      // lenderB (last): receives the remainder 500_000 - 499_999 = 1
      expect(await token.balanceOf(lenderB.address)).to.equal(lenderBBalanceBefore + 1n)
    })

    it('integrates end-to-end through the real Bank.fundFixedReturnRepayment entry point', async () => {
      const { bank, fixedReturn, owner, lenderA, lenderB, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fundOffer(fixedReturn, offerId, lenderA, lenderB)
      // Bank holds 100k from the funding sweep; top up the 8k interest portion
      await token.mint(await bank.getAddress(), ethers.parseUnits('8000', 6))

      const balanceABefore = await token.balanceOf(lenderA.address)
      const balanceBBefore = await token.balanceOf(lenderB.address)
      const repayAmount = ethers.parseUnits('108000', 6)

      await expect(bank.connect(owner).fundFixedReturnRepayment(offerId, repayAmount))
        .to.emit(bank, 'FixedReturnRepaymentFunded')
        .withArgs(await fixedReturn.getAddress(), offerId, await token.getAddress(), repayAmount)

      expect(await token.balanceOf(lenderA.address)).to.equal(
        balanceABefore + ethers.parseUnits('64800', 6)
      )
      expect(await token.balanceOf(lenderB.address)).to.equal(
        balanceBBefore + ethers.parseUnits('43200', 6)
      )
      // Funds only pass through FixedReturn transiently — nothing left stranded.
      expect(await token.balanceOf(await fixedReturn.getAddress())).to.equal(0n)
    })
  })

  describe('views', () => {
    it('totalEntitlementOf returns the proportional share of the global obligation', async () => {
      const { fixedReturn, owner, lenderA, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('60000', 6))

      // Only one depositor — proportional share == total obligation == 60k * 1.08
      expect(await fixedReturn.totalEntitlementOf(offerId, lenderA.address)).to.equal(
        ethers.parseUnits('64800', 6)
      )
    })

    it('totalEntitlementOf matches what repayLenders actually sends to a non-last lender', async () => {
      // Regression: per-lender interest (deposit * rateBps / 10_000) can round
      // differently than the global obligation (totalFunded * rateBps / 10_000),
      // causing the getter to overstate what a non-last lender actually receives.
      // With the global-proportion formula both are consistent.
      //
      // Setup: A deposits 2 units, B deposits 1 unit, 50% interest.
      //   Global obligation: 3 + floor(3 * 5000 / 10_000) = 3 + 1 = 4
      //   Old per-lender formula: A = 2 + floor(2*5000/10_000) = 2+1 = 3  ← would overstate
      //   New global formula: A = floor(4*2/3) = 2  ← matches what A receives
      const [owner, lenderA, lenderB] = await ethers.getSigners()
      const MockToken = await ethers.getContractFactory('MockERC20')
      const token = (await MockToken.deploy('Mock USDC', 'mUSDC')) as unknown as MockERC20

      const { bank, fixedReturn, bankSigner } = await deployContracts(owner)
      await fixedReturn.connect(owner).addTokenSupport(await token.getAddress())
      await bank.connect(owner).addTokenSupport(await token.getAddress())

      for (const lender of [lenderA, lenderB]) {
        await token.mint(lender.address, 100n)
        await token.connect(lender).approve(await fixedReturn.getAddress(), ethers.MaxUint256)
      }

      const now = await time.latest()
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        now + 1000,
        now + 500,
        { fundingTarget: 3n, interestRateBps: 5000n }
      )

      await fixedReturn.connect(lenderA).lendFunds(offerId, 2n) // index 0 (non-last)
      await fixedReturn.connect(lenderB).lendFunds(offerId, 1n) // index 1 (last, triggers sweep: FixedReturn -> Bank gets 3n)

      // totalEntitlementOf for the non-last lender matches their actual receipt
      expect(await fixedReturn.totalEntitlementOf(offerId, lenderA.address)).to.equal(2n)

      // Obligation = 3 + floor(3*5000/10_000) = 4; Bank would fund this installment
      // into FixedReturn before calling repayLenders.
      const aBalanceBefore = await token.balanceOf(lenderA.address)
      await token.mint(await fixedReturn.getAddress(), 4n)
      await fixedReturn.connect(bankSigner).repayLenders(offerId, 4n) // full obligation
      expect(await token.balanceOf(lenderA.address)).to.equal(aBalanceBefore + 2n)
    })

    it('getOfferLenders lists every depositor once, in deposit order', async () => {
      const { fixedReturn, owner, lenderA, lenderB, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )
      await fundOffer(fixedReturn, offerId, lenderA, lenderB)

      expect(await fixedReturn.getOfferLenders(offerId)).to.deep.equal([
        lenderA.address,
        lenderB.address
      ])
    })

    it('does not list the same lender twice across repeated deposits', async () => {
      const { fixedReturn, owner, lenderA, token, startDate, subscriptionDeadline } =
        await loadFixture(deployFixture)
      const offerId = await createGeneralOffer(
        fixedReturn,
        owner,
        await token.getAddress(),
        startDate,
        subscriptionDeadline
      )

      await fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('30000', 6))
      await fixedReturn.connect(lenderA).lendFunds(offerId, ethers.parseUnits('30000', 6))

      expect(await fixedReturn.getOfferLenders(offerId)).to.deep.equal([lenderA.address])
      expect(await fixedReturn.lenderDeposits(offerId, lenderA.address)).to.equal(
        ethers.parseUnits('60000', 6)
      )
    })
  })

  // Integration test: verifies that when FixedReturn is deployed by a real Officer
  // (not MockOfficer), officerAddress is correctly captured from msg.sender.
  // This is the core invariant that peer-contract resolution (_getBankAddress, etc.)
  // depends on — MockOfficer tests do not exercise the real Officer initialisation path.
  describe('integration — real Officer captured as officerAddress', () => {
    it('records the deploying Officer contract address as officerAddress', async () => {
      const [owner] = await ethers.getSigners()

      const FeeCollectorFactory = await ethers.getContractFactory('FeeCollector')
      const OfficerFactory = await ethers.getContractFactory('Officer')
      const FixedReturnFactory = await ethers.getContractFactory('FixedReturn')

      const feeCollector = (await upgrades.deployProxy(
        FeeCollectorFactory,
        [owner.address, [], []],
        { initializer: 'initialize' }
      )) as unknown as FeeCollector

      const officer = (await upgrades.deployProxy(OfficerFactory, [owner.address, [], [], false], {
        initializer: 'initialize',
        constructorArgs: [await feeCollector.getAddress()],
        unsafeAllow: ['constructor', 'state-variable-immutable']
      })) as unknown as Officer
      await officer.waitForDeployment()

      const officerAddress = await officer.getAddress()
      await impersonateAccount(officerAddress)
      const officerSigner = await ethers.getSigner(officerAddress)
      await setBalance(officerAddress, ethers.parseEther('1'))

      const fixedReturn = (await upgrades.deployProxy(
        FixedReturnFactory.connect(officerSigner),
        [[], owner.address],
        { initializer: 'initialize', unsafeSkipProxyAdminCheck: true }
      )) as unknown as FixedReturn

      expect(await fixedReturn.officerAddress()).to.equal(officerAddress)
    })
  })
})

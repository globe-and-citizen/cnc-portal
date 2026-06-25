import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import {
  loadFixture,
  time,
  impersonateAccount,
  setBalance
} from '@nomicfoundation/hardhat-network-helpers'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { FeeCollector, FixedReturn, MockERC20, Officer } from '../typechain-types'

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
    OWNABLE_UNAUTHORIZED: 'OwnableUnauthorizedAccount'
  } as const

  // Deploys FeeCollector + Officer, then deploys FixedReturn the same way it's
  // actually created in production: as a beacon proxy whose `initialize` is called
  // BY Officer (impersonated here), not by an arbitrary signer. Mirrors the
  // deployContracts() phase in Bank.spec.ts.
  async function deployContracts(owner: SignerWithAddress) {
    const FeeCollectorFactory = await ethers.getContractFactory('FeeCollector')
    const OfficerFactory = await ethers.getContractFactory('Officer')
    const FixedReturnFactory = await ethers.getContractFactory('FixedReturn')

    const feeCollector = (await upgrades.deployProxy(FeeCollectorFactory, [owner.address, [], []], {
      initializer: 'initialize'
    })) as unknown as FeeCollector

    // Officer's constructor calls `_disableInitializers()`, so `initialize` can only
    // be invoked on a proxy.
    const officer = (await upgrades.deployProxy(OfficerFactory, [owner.address, [], [], false], {
      initializer: 'initialize',
      constructorArgs: [await feeCollector.getAddress()],
      unsafeAllow: ['constructor', 'state-variable-immutable']
    })) as unknown as Officer
    await officer.waitForDeployment()

    const officerAddress = await officer.getAddress()
    await impersonateAccount(officerAddress)
    const officerSigner = await ethers.getSigner(officerAddress)
    await setBalance(officerAddress, ethers.parseEther('1000'))

    const fixedReturn = (await upgrades.deployProxy(
      FixedReturnFactory.connect(officerSigner),
      [owner.address],
      { initializer: 'initialize', unsafeSkipProxyAdminCheck: true }
    )) as unknown as FixedReturn

    return { officer, feeCollector, fixedReturn: fixedReturn.connect(owner) }
  }

  async function deployFixture() {
    const [owner, lenderA, lenderB, lenderC, stranger] = await ethers.getSigners()

    const MockToken = await ethers.getContractFactory('MockERC20')
    const token = (await MockToken.deploy('Mock USDC', 'mUSDC')) as unknown as MockERC20
    const otherToken = (await MockToken.deploy('Mock DAI', 'mDAI')) as unknown as MockERC20

    const { fixedReturn } = await deployContracts(owner)

    await fixedReturn.connect(owner).addTokenSupport(await token.getAddress())

    for (const lender of [lenderA, lenderB, lenderC]) {
      await token.mint(lender.address, ethers.parseUnits('100000', 6))
      await token.connect(lender).approve(await fixedReturn.getAddress(), ethers.MaxUint256)
    }
    await token.mint(owner.address, ethers.parseUnits('200000', 6))
    await token.connect(owner).approve(await fixedReturn.getAddress(), ethers.MaxUint256)

    const now = await time.latest()
    const startDate = now + 1000
    const subscriptionDeadline = now + 500 // on/before startDate — valid

    return {
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
      expect(await fixedReturn.version()).to.equal('1.0.0')
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

      const balanceABefore = await token.balanceOf(lenderA.address)
      const balanceBBefore = await token.balanceOf(lenderB.address)
      const repayAmount = ethers.parseUnits('108000', 6) // 100k principal + 8% interest

      await expect(fixedReturn.connect(owner).repayLenders(offerId, repayAmount))
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

      const balanceABefore = await token.balanceOf(lenderA.address)

      await fixedReturn.connect(owner).repayLenders(offerId, ethers.parseUnits('54000', 6))
      await fixedReturn.connect(owner).repayLenders(offerId, ethers.parseUnits('54000', 6))

      expect(await token.balanceOf(lenderA.address)).to.equal(
        balanceABefore + ethers.parseUnits('64800', 6)
      )

      const offer = await fixedReturn.getLendingOffer(offerId)
      expect(offer.state).to.equal(OfferState.Repaying)
      expect(offer.totalRepaidByIssuer).to.equal(ethers.parseUnits('108000', 6))
    })

    it('rejects repaying an offer that is still Open', async () => {
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
        fixedReturn.connect(owner).repayLenders(offerId, ethers.parseUnits('1000', 6))
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.OFFER_NOT_FUNDED)
    })

    it('rejects a zero amount', async () => {
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

      await expect(
        fixedReturn.connect(owner).repayLenders(offerId, 0)
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.ZERO_AMOUNT)
    })

    it('rejects a non-owner caller', async () => {
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
      ).to.be.revertedWithCustomError(fixedReturn, ERRORS.OWNABLE_UNAUTHORIZED)
    })
  })

  describe('views', () => {
    it('totalEntitlementOf returns principal plus flat interest', async () => {
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

      expect(await fixedReturn.totalEntitlementOf(offerId, lenderA.address)).to.equal(
        ethers.parseUnits('64800', 6) // 60k * 1.08
      )
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
})

import {
  ethers,
  impersonateAccount,
  initializeHardhat,
  setBalance,
  time,
  upgrades
} from './hardhat-context.js'
import { expect } from 'chai'
import { parseUnits } from 'ethers'
import type { SignerWithAddress } from './hardhat-context.js'
import type { Bank, FixedReturn, MockERC20, MockOfficer } from '../typechain-types/index.js'

before(initializeHardhat)

/**
 * Gas-cost evidence for ADR-0002 (Community Credit lender payout scale, issue #2769).
 * refundLenders and repayLenders both loop over every lender in one transaction — this
 * measures the real gas cost of that loop as lender count grows, so the ADR's decision
 * is backed by actual numbers instead of a guess. Not a correctness test (FixedReturn.spec.ts
 * already covers that); kept in the suite as a lightweight regression check so a future
 * change that makes the per-lender cost worse doesn't silently invalidate the ADR's numbers.
 */
describe('FixedReturn — lender payout gas benchmark (ADR-0002 evidence)', () => {
  const FundingAccess = { General: 0 }
  const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60
  const BLOCK_GAS_LIMIT = 30_000_000n
  const LENDER_COUNTS = [5, 10, 25, 50, 100]
  const DEPOSIT_PER_LENDER = parseUnits('100', 6)

  // Mirrors FixedReturn.spec.ts's deployContracts — kept local since neither file exports
  // its fixture for reuse (same convention Investor.spec.ts follows for its own deploy setup).
  async function deployContracts(owner: SignerWithAddress) {
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
      { initializer: 'initialize', unsafeSkipProxyAdminCheck: true, unsafeAllow: ['constructor'] }
    )) as unknown as Bank
    await mockOfficer.setDeployedContract('Bank', await bank.getAddress())

    const bankAddress = await bank.getAddress()
    await impersonateAccount(bankAddress)
    const bankSigner = await ethers.getSigner(bankAddress)
    await setBalance(bankAddress, ethers.parseEther('1000'))

    const fixedReturn = (await upgrades.deployProxy(
      FixedReturnFactory.connect(officerSigner),
      [[], owner.address],
      { initializer: 'initialize', unsafeSkipProxyAdminCheck: true, unsafeAllow: ['constructor'] }
    )) as unknown as FixedReturn
    await mockOfficer.setDeployedContract('FixedReturn', await fixedReturn.getAddress())

    return { bank, bankSigner, fixedReturn: fixedReturn.connect(owner) }
  }

  // Funds `lenderCount` freshly generated wallets (beyond Hardhat's default signer set,
  // since 100 lenders exceeds it) into a General-access offer. `reachTarget` controls
  // whether the deposits reach fundingTarget exactly (offer ends up Funded, for the
  // repayLenders case) or fall one unit short (offer stays Open/stalled once its
  // deadline passes, for the refundLenders case).
  async function setupOffer(lenderCount: number, reachTarget: boolean) {
    const [owner] = await ethers.getSigners()
    const MockToken = await ethers.getContractFactory('MockERC20')
    const token = (await MockToken.deploy('Mock USDC', 'mUSDC')) as unknown as MockERC20
    const tokenAddress = await token.getAddress()

    const { bank, bankSigner, fixedReturn } = await deployContracts(owner)
    await fixedReturn.connect(owner).addTokenSupport(tokenAddress)
    await bank.connect(owner).addTokenSupport(tokenAddress)

    const totalDeposited = DEPOSIT_PER_LENDER * BigInt(lenderCount)
    // For the refund case, the target must stay just out of reach — one extra unit — so
    // the last lender's deposit doesn't flip totalFunded >= fundingTarget and auto-advance
    // the offer out of Open. For the repay case, the target is met exactly.
    const fundingTarget = reachTarget ? totalDeposited : totalDeposited + 1n
    const now = await time.latest()
    const subscriptionDeadline = now + 500

    const createTx = await fixedReturn.connect(owner).createLendingOffer({
      token: tokenAddress,
      fundingTarget,
      interestRateBps: 800n,
      maturityDate: subscriptionDeadline + ONE_YEAR_SECONDS,
      subscriptionDeadline,
      fundingAccess: FundingAccess.General,
      isCapEnabled: false,
      lenderCap: 0n,
      whitelistAddrs: [],
      allocations: []
    })
    await createTx.wait()
    const offerId = await fixedReturn.getTotalOfferings()

    for (let i = 0; i < lenderCount; i++) {
      const wallet = ethers.Wallet.createRandom().connect(ethers.provider)
      await setBalance(wallet.address, ethers.parseEther('1'))
      await token.mint(wallet.address, DEPOSIT_PER_LENDER)
      await token.connect(wallet).approve(await fixedReturn.getAddress(), ethers.MaxUint256)
      await fixedReturn.connect(wallet).lendFunds(offerId, DEPOSIT_PER_LENDER)
    }

    return { bank, bankSigner, fixedReturn, token, owner, offerId, totalDeposited, subscriptionDeadline }
  }

  describe('refundLenders', () => {
    for (const lenderCount of LENDER_COUNTS) {
      it(`stays within the block gas limit refunding ${lenderCount} lenders`, async () => {
        // Not loadFixture: each iteration needs its own differently-sized setup, so
        // there's no snapshot to reuse across tests — and Hardhat's loadFixture rejects
        // anonymous closures like a per-lenderCount-parameterized call would need anyway.
        const { fixedReturn, owner, offerId, subscriptionDeadline } =
          await setupOffer(lenderCount, false)
        await time.increaseTo(subscriptionDeadline + 1)

        const tx = await fixedReturn.connect(owner).refundLenders(offerId)
        const receipt = await tx.wait()

        // eslint-disable-next-line no-console -- intentional: this is evidence-gathering
        // output for ADR-0002, not incidental debug logging.
        console.log(`refundLenders gasUsed for ${lenderCount} lenders: ${receipt!.gasUsed}`)
        expect(receipt!.gasUsed).to.be.lessThan(BLOCK_GAS_LIMIT)
      })
    }
  })

  describe('repayLenders', () => {
    for (const lenderCount of LENDER_COUNTS) {
      it(`stays within the block gas limit repaying ${lenderCount} lenders`, async () => {
        const { bankSigner, fixedReturn, token, offerId, totalDeposited } = await setupOffer(
          lenderCount,
          true
        )
        // setupOffer's deposits reach fundingTarget exactly, so the offer is already
        // Funded. repayLenders assumes Bank has already transferred `amount` of the
        // token to FixedReturn itself in the same transaction (per its own docstring) —
        // mint straight to FixedReturn here, mirroring how FixedReturn.spec.ts's
        // repayLenders tests fund it via the impersonated bankSigner call.
        const totalObligation = totalDeposited + (totalDeposited * 800n) / 10_000n
        await token.mint(await fixedReturn.getAddress(), totalObligation)

        const tx = await fixedReturn.connect(bankSigner).repayLenders(offerId, totalObligation)
        const receipt = await tx.wait()

        // eslint-disable-next-line no-console -- intentional: this is evidence-gathering
        // output for ADR-0002, not incidental debug logging.
        console.log(`repayLenders gasUsed for ${lenderCount} lenders: ${receipt!.gasUsed}`)
        expect(receipt!.gasUsed).to.be.lessThan(BLOCK_GAS_LIMIT)
      })
    }
  })
})

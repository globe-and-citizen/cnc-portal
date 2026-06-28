import { ethers, upgrades } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import type { FixedReturn, MockERC20 } from '../typechain-types'
import type { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('FixedReturn', () => {
  let fixedReturn: FixedReturn
  let token: MockERC20
  let owner: SignerWithAddress
  let lender: SignerWithAddress

  const units = (amount: string) => ethers.parseUnits(amount, 6)

  async function createGeneralOffer() {
    const now = await time.latest()
    await fixedReturn.createLendingOffer({
      token: await token.getAddress(),
      fundingTarget: units('10'),
      interestRateBps: 100n,
      termDuration: 1,
      termUnit: 1,
      startDate: BigInt(now + 7 * 24 * 60 * 60),
      subscriptionDeadline: BigInt(now + 24 * 60 * 60),
      fundingAccess: 0,
      isCapEnabled: true,
      lenderCap: units('2'),
      whitelistAddrs: [],
      allocations: []
    })
  }

  beforeEach(async () => {
    ;[owner, lender] = await ethers.getSigners()

    const Token = await ethers.getContractFactory('MockERC20')
    token = (await Token.deploy('Mock USDC', 'mUSDC')) as MockERC20

    const FixedReturnFactory = await ethers.getContractFactory('FixedReturn')
    fixedReturn = (await upgrades.deployProxy(
      FixedReturnFactory,
      [[await token.getAddress()], owner.address],
      { initializer: 'initialize' }
    )) as unknown as FixedReturn

    await token.mint(lender.address, units('10'))
    await token.connect(lender).approve(await fixedReturn.getAddress(), units('10'))
    await createGeneralOffer()
  })

  it('allows a lender to add to an existing deposit without duplicating the lender', async () => {
    await fixedReturn.connect(lender).lendFunds(1n, units('1'))

    await expect(fixedReturn.connect(lender).lendFunds(1n, units('0.5')))
      .to.emit(fixedReturn, 'FundsLent')
      .withArgs(1n, lender.address, units('0.5'))

    expect(await fixedReturn.lenderDeposits(1n, lender.address)).to.equal(units('1.5'))
    expect((await fixedReturn.getLendingOffer(1n)).totalFunded).to.equal(units('1.5'))
    expect(await fixedReturn.getOfferLenders(1n)).to.deep.equal([lender.address])
  })

  it('enforces the lender cap cumulatively across repeated deposits', async () => {
    await fixedReturn.connect(lender).lendFunds(1n, units('1'))

    await expect(
      fixedReturn.connect(lender).lendFunds(1n, units('1.1'))
    ).to.be.revertedWithCustomError(fixedReturn, 'DepositExceedsLenderCap')
  })
})

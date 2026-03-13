import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'

describe('SafeDepositRouter', function () {
  async function deployFixture() {
    const [owner, safeWallet, depositor, nonOwner] = await ethers.getSigners()

    const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
    const mockOfficer = await MockOfficerFactory.deploy()

    const MockToken = await ethers.getContractFactory('MockERC20')
    const usdc = await MockToken.deploy('USD Coin', 'USDC')
    await usdc.waitForDeployment()

    const InvestorFactory = await ethers.getContractFactory('InvestorV1')
    const investor = await upgrades.deployProxy(InvestorFactory, ['SHER', 'SHER', owner.address], {
      initializer: 'initialize'
    })

    const investorAddress = await investor.getAddress()
    await mockOfficer.setDeployedContract('InvestorV1', investorAddress)

    const RouterFactory = await ethers.getContractFactory('SafeDepositRouter')
    const routerImplementation = await RouterFactory.connect(owner).deploy()
    await routerImplementation.waitForDeployment()

    const oneXMultiplier = ethers.parseUnits('1', 18)
    const encodedInitialize = routerImplementation.interface.encodeFunctionData('initialize', [
      safeWallet.address,
      [await usdc.getAddress()],
      oneXMultiplier
    ])

    const BeaconFactory = await ethers.getContractFactory('Beacon')
    const beacon = await BeaconFactory.connect(owner).deploy(
      await routerImplementation.getAddress()
    )
    await beacon.waitForDeployment()

    const routerAddress = await mockOfficer.deployBeaconProxy.staticCall(
      await beacon.getAddress(),
      encodedInitialize,
      'SafeDepositRouter'
    )
    await mockOfficer.deployBeaconProxy(
      await beacon.getAddress(),
      encodedInitialize,
      'SafeDepositRouter'
    )

    const router = await ethers.getContractAt('SafeDepositRouter', routerAddress)

    // Keep officerAddress wired to mockOfficer but transfer ownable controls to test owner.
    await mockOfficer.transferContractOwnership(routerAddress, owner.address)

    const minterRole = await investor.MINTER_ROLE()
    await investor.grantRole(minterRole, routerAddress)

    await usdc.mint(depositor.address, ethers.parseUnits('1000', 18))

    return { owner, safeWallet, depositor, nonOwner, mockOfficer, usdc, investor, router }
  }

  it('initializes expected ownership and wiring', async () => {
    const { owner, safeWallet, mockOfficer, router, usdc } = await deployFixture()

    expect(await router.owner()).to.equal(owner.address)
    expect(await router.officerAddress()).to.equal(await mockOfficer.getAddress())
    expect(await router.safeAddress()).to.equal(safeWallet.address)
    expect(await router.isTokenSupported(await usdc.getAddress())).to.equal(true)
    expect(await router.depositsEnabled()).to.equal(false)
  })

  it('allows owner to enable and disable deposits', async () => {
    const { owner, router } = await deployFixture()

    await expect(router.connect(owner).enableDeposits())
      .to.emit(router, 'DepositsEnabled')
      .withArgs(owner.address)

    expect(await router.depositsEnabled()).to.equal(true)

    await expect(router.connect(owner).disableDeposits())
      .to.emit(router, 'DepositsDisabled')
      .withArgs(owner.address)

    expect(await router.depositsEnabled()).to.equal(false)
  })

  it('rejects non-owner deposit control calls', async () => {
    const { nonOwner, router } = await deployFixture()

    await expect(router.connect(nonOwner).enableDeposits()).to.be.revertedWithCustomError(
      router,
      'OwnableUnauthorizedAccount'
    )
  })

  it('reverts deposit when deposits are disabled', async () => {
    const { depositor, router, usdc } = await deployFixture()
    const amount = ethers.parseUnits('10', 18)

    await usdc.connect(depositor).approve(await router.getAddress(), amount)

    await expect(
      router.connect(depositor).deposit(await usdc.getAddress(), amount)
    ).to.be.revertedWithCustomError(router, 'DepositsNotEnabled')
  })

  it('deposits token, forwards funds to safe, and mints SHER', async () => {
    const { owner, depositor, safeWallet, router, usdc, investor } = await deployFixture()
    const amount = ethers.parseUnits('10', 18)

    await router.connect(owner).enableDeposits()

    const initialSafeBalance = await usdc.balanceOf(safeWallet.address)
    const initialSherBalance = await investor.balanceOf(depositor.address)

    await usdc.connect(depositor).approve(await router.getAddress(), amount)

    await expect(router.connect(depositor).deposit(await usdc.getAddress(), amount)).to.emit(
      router,
      'Deposited'
    )

    expect(await usdc.balanceOf(safeWallet.address)).to.equal(initialSafeBalance + amount)
    expect(await investor.balanceOf(depositor.address)).to.be.gt(initialSherBalance)
  })

  it('enforces slippage guard in depositWithSlippage', async () => {
    const { owner, depositor, router, usdc } = await deployFixture()
    const amount = ethers.parseUnits('5', 18)

    await router.connect(owner).enableDeposits()
    await usdc.connect(depositor).approve(await router.getAddress(), amount)

    const expectedOut = await router.calculateCompensation(await usdc.getAddress(), amount)

    await expect(
      router
        .connect(depositor)
        .depositWithSlippage(await usdc.getAddress(), amount, expectedOut + 1n)
    ).to.be.revertedWithCustomError(router, 'SlippageExceeded')
  })
})

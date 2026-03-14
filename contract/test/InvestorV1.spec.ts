import { expect } from 'chai'
import { InvestorV1, InvestorV1__factory } from '../typechain-types'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

async function deployWithOfficerFixture() {
  const [owner, addr1, addr2, addr3, bankSigner] = await ethers.getSigners()

  const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
  const mockOfficer = await MockOfficerFactory.deploy()

  const MockERC20Factory = await ethers.getContractFactory('MockERC20')
  const token = await MockERC20Factory.deploy('USDC', 'USDC')

  const InvestorFactory = await ethers.getContractFactory('InvestorV1')
  const investorImpl = await InvestorFactory.deploy()

  const BeaconFactory = await ethers.getContractFactory('Beacon')
  const beacon = await BeaconFactory.deploy(await investorImpl.getAddress())

  const initData = investorImpl.interface.encodeFunctionData('initialize', [
    'Bitcoin',
    'BTC',
    owner.address
  ])

  const investorAddress = await mockOfficer.deployBeaconProxy.staticCall(
    await beacon.getAddress(),
    initData,
    'InvestorV1'
  )
  await mockOfficer.deployBeaconProxy(await beacon.getAddress(), initData, 'InvestorV1')

  const investor = await ethers.getContractAt('InvestorV1', investorAddress)

  await mockOfficer.setDeployedContract('Bank', bankSigner.address)

  return { investor, mockOfficer, token, owner, addr1, addr2, addr3, bankSigner }
}

describe('InvestorV1', () => {
  let InvestorImplementation: InvestorV1__factory
  let investorProxy: InvestorV1
  let owner: SignerWithAddress
  let addr1: SignerWithAddress
  let addr2: SignerWithAddress
  let addr3: SignerWithAddress

  beforeEach(async () => {
    ;[owner, addr1, addr2, addr3] = await ethers.getSigners()
    InvestorImplementation = await ethers.getContractFactory('InvestorV1')
    investorProxy = await InvestorImplementation.deploy()

    investorProxy = (await upgrades.deployProxy(InvestorImplementation, [
      'Bitcoin',
      'BTC',
      owner.address
    ])) as unknown as InvestorV1
  })

  describe('initialize', () => {
    it('should initialize the contract', async () => {
      expect(await investorProxy.name()).to.equal('Bitcoin')
      expect(await investorProxy.symbol()).to.equal('BTC')
      expect(await investorProxy.owner()).to.equal(owner.address)
      expect(await investorProxy.totalSupply()).to.equal(0)
      expect(await investorProxy.paused()).to.equal(false)
    })
  })

  describe('distributeMint', () => {
    it('should distribute mint', async () => {
      const distributeMints = [
        {
          amount: ethers.parseEther('100'),
          shareholder: addr1.address
        },
        {
          amount: ethers.parseEther('200'),
          shareholder: addr2.address
        },
        {
          amount: ethers.parseEther('300'),
          shareholder: addr3.address
        }
      ]
      await investorProxy.connect(owner).distributeMint(distributeMints)
      distributeMints.forEach(async (distributeMint) => {
        expect(await investorProxy.balanceOf(distributeMint.shareholder)).to.equal(
          distributeMint.amount
        )
      })
      expect(await investorProxy.totalSupply()).to.equal(ethers.parseEther('600'))
    })

    it('should emit Minted event', async () => {
      const distributeMints = [
        {
          amount: ethers.parseEther('100'),
          shareholder: addr1.address
        }
      ]
      await expect(investorProxy.connect(owner).distributeMint(distributeMints))
        .to.emit(investorProxy, 'Minted')
        .withArgs(addr1.address, ethers.parseEther('100'))
    })

    it('should add to shareholders list', async () => {
      const distributeMints = [
        {
          amount: ethers.parseEther('100'),
          shareholder: addr1.address
        }
      ]
      await investorProxy.connect(owner).distributeMint(distributeMints)
      const shareholder = (await investorProxy.getShareholders())[0]

      expect(shareholder.amount).to.equal(ethers.parseEther('100'))
      expect(shareholder.shareholder).to.equal(addr1.address)
    })

    it('should revert if paused', async () => {
      await investorProxy.connect(owner).pause()
      await expect(
        investorProxy.connect(owner).distributeMint([
          {
            amount: ethers.parseEther('100'),
            shareholder: addr1.address
          }
        ])
      ).to.be.reverted
    })

    it('should revert if not owner', async () => {
      await expect(
        investorProxy.connect(addr1).distributeMint([
          {
            amount: ethers.parseEther('100'),
            shareholder: addr1.address
          }
        ])
      ).to.be.reverted
    })
  })

  describe('individualMint', () => {
    it('should mint to individual', async () => {
      await investorProxy.connect(owner).individualMint(addr1.address, ethers.parseEther('100'))

      expect(await investorProxy.balanceOf(addr1.address)).to.equal(ethers.parseEther('100'))
      expect(await investorProxy.totalSupply()).to.equal(ethers.parseEther('100'))
    })

    it('should emit Minted event', async () => {
      await expect(
        investorProxy.connect(owner).individualMint(addr1.address, ethers.parseEther('100'))
      )
        .to.emit(investorProxy, 'Minted')
        .withArgs(addr1.address, ethers.parseEther('100'))
    })

    it('should add to shareholders list', async () => {
      await investorProxy.connect(owner).individualMint(addr1.address, ethers.parseEther('100'))
      const shareholder = (await investorProxy.getShareholders())[0]

      expect(shareholder.amount).to.equal(ethers.parseEther('100'))
      expect(shareholder.shareholder).to.equal(addr1.address)
    })
  })

  describe('getShareholders', () => {
    it('should get shareholders', async () => {
      await investorProxy.connect(owner).distributeMint([
        {
          amount: ethers.parseEther('100'),
          shareholder: addr1.address
        },
        {
          amount: ethers.parseEther('200'),
          shareholder: addr2.address
        },
        {
          amount: ethers.parseEther('300'),
          shareholder: addr3.address
        }
      ])

      const shareholders = await investorProxy.getShareholders()
      expect(shareholders.length).to.equal(3)
      expect(shareholders[0].shareholder).to.equal(addr1.address)
      expect(shareholders[0].amount).to.equal(ethers.parseEther('100'))
      expect(shareholders[1].shareholder).to.equal(addr2.address)
      expect(shareholders[1].amount).to.equal(ethers.parseEther('200'))
      expect(shareholders[2].shareholder).to.equal(addr3.address)
      expect(shareholders[2].amount).to.equal(ethers.parseEther('300'))
    })

    it('should return empty array if no shareholders', async () => {
      const shareholders = await investorProxy.getShareholders()
      expect(shareholders.length).to.equal(0)
    })
  })

  describe('pause', () => {
    it('should pause the contract', async () => {
      await investorProxy.connect(owner).pause()
      expect(await investorProxy.paused()).to.equal(true)
    })

    it('should revert if not owner', async () => {
      await expect(investorProxy.connect(addr1).pause()).to.be.reverted
    })
  })

  describe('unpause', () => {
    it('should unpause the contract', async () => {
      await investorProxy.connect(owner).pause()
      await investorProxy.connect(owner).unpause()
      expect(await investorProxy.paused()).to.equal(false)
    })

    it('should revert if not owner', async () => {
      await investorProxy.connect(owner).pause()
      await expect(investorProxy.connect(addr1).unpause()).to.be.reverted
    })
  })

  describe('distributeDividends', () => {
    it('should distribute dividends', async () => {
      await investorProxy.connect(owner).distributeMint([
        {
          amount: ethers.parseEther('100'),
          shareholder: addr1.address
        },
        {
          amount: ethers.parseEther('200'),
          shareholder: addr2.address
        },
        {
          amount: ethers.parseEther('300'),
          shareholder: addr3.address
        }
      ])

      const dividends = ethers.parseEther('1000')
      await owner.sendTransaction({
        to: await investorProxy.getAddress(),
        value: dividends
      })

      expect(await investorProxy.balanceOf(addr1.address)).to.equal(ethers.parseEther('100'))
      expect(await investorProxy.balanceOf(addr2.address)).to.equal(ethers.parseEther('200'))
      expect(await investorProxy.balanceOf(addr3.address)).to.equal(ethers.parseEther('300'))

      expect(await investorProxy.totalSupply()).to.equal(ethers.parseEther('600'))
    })

    it('should distribute native dividends proportionally', async () => {
      await investorProxy.connect(owner).distributeMint([
        {
          amount: ethers.parseEther('100'),
          shareholder: addr1.address
        }
      ])

      const dividends = ethers.parseEther('1000')
      const investorAddress = await investorProxy.getAddress()

      await expect(() =>
        owner.sendTransaction({
          to: investorAddress,
          value: dividends
        })
      ).to.changeEtherBalance(investorProxy, dividends)
    })
  })

  describe('individualMint when paused', () => {
    it('should revert individualMint when paused', async () => {
      await investorProxy.connect(owner).pause()
      await expect(
        investorProxy.connect(owner).individualMint(addr1.address, ethers.parseEther('100'))
      ).to.be.reverted
    })
  })

  describe('shareholder tracking on transfers', () => {
    it('should remove shareholder when balance goes to zero', async () => {
      await investorProxy
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseEther('100') }])

      expect((await investorProxy.getShareholders()).length).to.equal(1)

      await investorProxy
        .connect(addr1)
        .transfer(addr2.address, ethers.parseEther('100'))

      const shareholders = await investorProxy.getShareholders()
      const addresses = shareholders.map((s: { shareholder: string }) => s.shareholder)
      expect(addresses).to.not.include(addr1.address)
      expect(addresses).to.include(addr2.address)
    })
  })
})

describe('InvestorV1 - dividend distribution (with MockOfficer)', () => {
  describe('distributeNativeDividends', () => {
    it('distributes ETH proportionally to shareholders', async () => {
      const { investor, owner, addr1, addr2, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([
          { shareholder: addr1.address, amount: ethers.parseUnits('100', 6) },
          { shareholder: addr2.address, amount: ethers.parseUnits('300', 6) }
        ])

      const dividendAmount = ethers.parseEther('1')
      const addr1Before = await ethers.provider.getBalance(addr1.address)
      const addr2Before = await ethers.provider.getBalance(addr2.address)

      await investor
        .connect(bankSigner)
        .distributeNativeDividends(dividendAmount, { value: dividendAmount })

      const addr1After = await ethers.provider.getBalance(addr1.address)
      const addr2After = await ethers.provider.getBalance(addr2.address)

      expect(addr1After - addr1Before).to.equal(ethers.parseEther('0.25'))
      expect(addr2After - addr2Before).to.equal(ethers.parseEther('0.75'))
    })

    it('gives all ETH to a single shareholder', async () => {
      const { investor, owner, addr1, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      const dividendAmount = ethers.parseEther('1')
      await expect(
        investor
          .connect(bankSigner)
          .distributeNativeDividends(dividendAmount, { value: dividendAmount })
      ).to.changeEtherBalance(addr1, dividendAmount)
    })

    it('emits DividendDistributed event', async () => {
      const { investor, owner, addr1, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      const dividendAmount = ethers.parseEther('1')
      await expect(
        investor
          .connect(bankSigner)
          .distributeNativeDividends(dividendAmount, { value: dividendAmount })
      ).to.emit(investor, 'DividendDistributed')
    })

    it('reverts if amount is zero', async () => {
      const { investor, bankSigner } = await deployWithOfficerFixture()

      await expect(
        investor.connect(bankSigner).distributeNativeDividends(0, { value: 0 })
      ).to.be.revertedWith('Amount must be greater than zero')
    })

    it('reverts if msg.value does not match amount', async () => {
      const { investor, owner, addr1, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      await expect(
        investor
          .connect(bankSigner)
          .distributeNativeDividends(ethers.parseEther('1'), { value: ethers.parseEther('2') })
      ).to.be.revertedWith('Invalid native dividend funding')
    })

    it('reverts if no tokens minted', async () => {
      const { investor, bankSigner } = await deployWithOfficerFixture()

      await expect(
        investor
          .connect(bankSigner)
          .distributeNativeDividends(ethers.parseEther('1'), { value: ethers.parseEther('1') })
      ).to.be.revertedWith('No tokens minted')
    })

    it('reverts if called by non-bank', async () => {
      const { investor, owner, addr1 } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      await expect(
        investor
          .connect(addr1)
          .distributeNativeDividends(ethers.parseEther('1'), { value: ethers.parseEther('1') })
      ).to.be.revertedWith('Caller is not Bank')
    })

    it('reverts if paused', async () => {
      const { investor, owner, addr1, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      await investor.connect(owner).pause()

      await expect(
        investor
          .connect(bankSigner)
          .distributeNativeDividends(ethers.parseEther('1'), { value: ethers.parseEther('1') })
      ).to.be.reverted
    })
  })

  describe('distributeTokenDividends', () => {
    it('distributes ERC20 tokens proportionally', async () => {
      const { investor, token, owner, addr1, addr2, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([
          { shareholder: addr1.address, amount: ethers.parseUnits('1', 6) },
          { shareholder: addr2.address, amount: ethers.parseUnits('3', 6) }
        ])

      const dividendAmount = ethers.parseUnits('100', 6)
      await token.mint(await investor.getAddress(), dividendAmount)

      await investor
        .connect(bankSigner)
        .distributeTokenDividends(await token.getAddress(), dividendAmount)

      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseUnits('25', 6))
      expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseUnits('75', 6))
    })

    it('emits DividendDistributed and DividendPaid events', async () => {
      const { investor, token, owner, addr1, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      const dividendAmount = ethers.parseUnits('100', 6)
      await token.mint(await investor.getAddress(), dividendAmount)

      await expect(
        investor
          .connect(bankSigner)
          .distributeTokenDividends(await token.getAddress(), dividendAmount)
      )
        .to.emit(investor, 'DividendDistributed')
        .to.emit(investor, 'DividendPaid')
    })

    it('reverts if token address is zero', async () => {
      const { investor, owner, addr1, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      await expect(
        investor
          .connect(bankSigner)
          .distributeTokenDividends(ethers.ZeroAddress, ethers.parseUnits('100', 6))
      ).to.be.revertedWith('Invalid token address')
    })

    it('reverts if amount is zero', async () => {
      const { investor, token, owner, addr1, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      await expect(
        investor.connect(bankSigner).distributeTokenDividends(await token.getAddress(), 0)
      ).to.be.revertedWith('Amount must be greater than zero')
    })

    it('reverts if no supply', async () => {
      const { investor, token, bankSigner } = await deployWithOfficerFixture()

      await expect(
        investor
          .connect(bankSigner)
          .distributeTokenDividends(await token.getAddress(), ethers.parseUnits('100', 6))
      ).to.be.revertedWith('No tokens minted')
    })

    it('reverts if insufficient funded token balance', async () => {
      const { investor, token, owner, addr1, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      // Do not fund the contract - it has 0 balance
      await expect(
        investor
          .connect(bankSigner)
          .distributeTokenDividends(await token.getAddress(), ethers.parseUnits('100', 6))
      ).to.be.revertedWith('Insufficient funded token balance')
    })

    it('reverts if called by non-bank', async () => {
      const { investor, token, owner, addr1 } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      await expect(
        investor
          .connect(addr1)
          .distributeTokenDividends(await token.getAddress(), ethers.parseUnits('100', 6))
      ).to.be.revertedWith('Caller is not Bank')
    })

    it('reverts if paused', async () => {
      const { investor, token, owner, addr1, bankSigner } = await deployWithOfficerFixture()

      await investor
        .connect(owner)
        .distributeMint([{ shareholder: addr1.address, amount: ethers.parseUnits('100', 6) }])

      await investor.connect(owner).pause()

      await expect(
        investor
          .connect(bankSigner)
          .distributeTokenDividends(await token.getAddress(), ethers.parseUnits('100', 6))
      ).to.be.reverted
    })
  })

  describe('decimals', () => {
    it('returns 6 decimals', async () => {
      const { investor } = await deployWithOfficerFixture()
      expect(await investor.decimals()).to.equal(6)
    })
  })
})

import { expect } from 'chai'
import { InvestorV1, InvestorV1__factory } from '../typechain-types'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

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

    it('should emit DividendsDistributed event', async () => {
      await investorProxy.connect(owner).distributeMint([
        {
          amount: ethers.parseEther('100'),
          shareholder: addr1.address
        }
      ])

      const dividends = ethers.parseEther('1000')
      await expect(
        owner.sendTransaction({
          to: await investorProxy.getAddress(),
          value: dividends
        })
      )
        .to.emit(investorProxy, 'DividendDistributed')
        .withArgs(addr1.address, ethers.parseEther('1000'))
    })
  })
})

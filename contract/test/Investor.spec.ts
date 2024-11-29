import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Investor, Investor__factory } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { StockGrantStruct } from '../typechain-types/contracts/Investor/Investor'

describe('Investor Contract', () => {
  let InvestorImplementation: Investor__factory
  let investorProxy: Investor
  let owner: SignerWithAddress
  let shareholder1: SignerWithAddress
  let shareholder2: SignerWithAddress
  let shareholder3: SignerWithAddress
  let initialStockGrants: StockGrantStruct[]
  const name = 'Investor'
  const symbol = 'INV'

  beforeEach(async function () {
    ;[owner, shareholder1, shareholder2, shareholder3] = await ethers.getSigners()
    InvestorImplementation = await ethers.getContractFactory('Investor')
    initialStockGrants = [
      {
        amount: ethers.parseEther('50'),
        shareholder: owner.address,
        isActive: true,
        lastMinted: 0,
        totalMinted: 0
      },
      {
        amount: ethers.parseEther('20'),
        shareholder: shareholder1.address,
        isActive: true,
        lastMinted: 0,
        totalMinted: 0
      },
      {
        amount: ethers.parseEther('15'),
        shareholder: shareholder2.address,
        isActive: true,
        lastMinted: 0,
        totalMinted: 0
      },
      {
        amount: ethers.parseEther('15'),
        shareholder: shareholder3.address,
        isActive: true,
        lastMinted: 0,
        totalMinted: 0
      }
    ]
    investorProxy = (await upgrades.deployProxy(InvestorImplementation, [
      name,
      symbol,
      initialStockGrants
    ])) as unknown as Investor
  })

  const mint = async () => {
    await investorProxy.connect(owner).mint()
  }

  context('Deployment', () => {
    it('should set the correct owner', async () => {
      expect(await investorProxy.owner()).to.eq(await owner.getAddress())
    })

    it('should set the correct name and symbol', async () => {
      expect(await investorProxy.name()).to.eq(name)
      expect(await investorProxy.symbol()).to.eq(symbol)
    })
  })

  context('Minting', () => {
    it('should mint token based on stock grant', async () => {
      const tx = await investorProxy.connect(owner).mint()
      await tx.wait()
      expect(await investorProxy.totalSupply()).to.eq(
        initialStockGrants.reduce((acc, stockGrant) => acc + BigInt(stockGrant.amount), BigInt(0))
      )

      for (const shareholder of [owner, shareholder1, shareholder2, shareholder3]) {
        expect(await investorProxy.balanceOf(shareholder.address)).to.eq(
          initialStockGrants.find((stockGrant) => stockGrant.shareholder === shareholder.address)!
            .amount
        )
      }
    })

    it('should emits Minted event', async () => {
      const tx = await investorProxy.connect(owner).mint()
      await expect(tx)
        .to.emit(investorProxy, 'Minted')
        .withArgs(owner.address, initialStockGrants[0].amount)
        .to.emit(investorProxy, 'Minted')
        .withArgs(shareholder1.address, initialStockGrants[1].amount)
        .to.emit(investorProxy, 'Minted')
        .withArgs(shareholder2.address, initialStockGrants[2].amount)
        .to.emit(investorProxy, 'Minted')
        .withArgs(shareholder3.address, initialStockGrants[3].amount)
    })

    it('should change lastMinted and totalMinted after minting', async () => {
      const tx = await investorProxy.connect(owner).mint()
      await tx.wait()
      const time = (await ethers.provider.getBlock(tx.blockHash!))?.timestamp
      const stockGrants = await investorProxy.getStockGrants()
      stockGrants.forEach((stockGrant, index) => {
        expect(stockGrant.lastMinted).to.eq(time)
        expect(stockGrant.totalMinted).to.eq(initialStockGrants[index].amount)
      })
    })

    it('should not mint or skip minting token to inactive stock grant', async () => {
      await investorProxy
        .connect(owner)
        .updateStockGrant(shareholder1.address, initialStockGrants[1].amount, false)
      await investorProxy.connect(owner).mint()

      expect(await investorProxy.balanceOf(shareholder1.address)).to.eq(0)
    })

    it('should not mint token if not owner', async () => {
      await expect(investorProxy.connect(shareholder1).mint()).to.be.reverted
    })
  })

  context('Individual Minting', () => {
    it('should mint token for individual stock grant', async () => {
      await investorProxy.connect(owner).mint(shareholder1.address, initialStockGrants[1].amount)
      expect(await investorProxy.balanceOf(shareholder1.address)).to.eq(
        initialStockGrants[1].amount
      )
    })

    it('should emit Minted event', async () => {
      const tx = await investorProxy
        .connect(owner)
        .mint(shareholder1.address, initialStockGrants[1].amount)
      await expect(tx)
        .to.emit(investorProxy, 'Minted')
        .withArgs(shareholder1.address, initialStockGrants[1].amount)
    })

    it('should change lastMinted and totalMinted after minting', async () => {
      const tx = await investorProxy
        .connect(owner)
        .mint(shareholder1.address, initialStockGrants[1].amount)
      await tx.wait()
      const time = (await ethers.provider.getBlock(tx.blockHash!))?.timestamp
      const stockGrant = await investorProxy.getStockGrant(shareholder1.address)
      expect(stockGrant.lastMinted).to.eq(time)
      expect(stockGrant.totalMinted).to.eq(initialStockGrants[1].amount)
    })

    it('should not mint token if not owner', async () => {
      await expect(
        investorProxy.connect(shareholder1).mint(shareholder1.address, initialStockGrants[1].amount)
      ).to.be.reverted
    })

    it('should not mint token if shareholder not exist', async () => {
      await expect(
        investorProxy.connect(owner).mint(ethers.ZeroAddress, initialStockGrants[1].amount)
      ).to.be.reverted
    })

    it('should not mint token if stock grant is inactive', async () => {
      await investorProxy
        .connect(owner)
        .updateStockGrant(shareholder1.address, initialStockGrants[1].amount, false)
      await expect(
        investorProxy.connect(owner).mint(shareholder1.address, initialStockGrants[1].amount)
      ).to.be.reverted
    })
  })

  context('Distribute Dividend', () => {
    it('should distribute dividend to all shareholders', async () => {
      // mint token first
      await mint()

      /**
       * owner = 50%
       * shareholder1 = 20%
       * shareholder2 = 15%
       * shareholder3 = 15%
       * totalSupply = 100
       * dividend = 1000
       * expected amount:
       * owner = 500
       * shareholder1 = 200
       * shareholder2 = 150
       * shareholder3 = 150
       * total = 1000
       * */

      const dividend = ethers.parseEther('1000')
      await investorProxy.connect(owner).distributeDividends({
        value: dividend
      })

      const stockGrants = await investorProxy.getStockGrants()
      const expectedAmounts = [
        ethers.parseEther('500'),
        ethers.parseEther('200'),
        ethers.parseEther('150'),
        ethers.parseEther('150')
      ]
      stockGrants.forEach(async (stockGrant, index) => {
        expect(await ethers.provider.getBalance(stockGrant.shareholder)).to.eq(
          expectedAmounts[index]
        )
      })
    })

    it('should emit DividendDistributed event', async () => {
      await mint()
      const dividend = ethers.parseEther('1000')
      const tx = await investorProxy.connect(owner).distributeDividends({
        value: dividend
      })
      await expect(tx)
        .to.emit(investorProxy, 'DividendDistributed')
        .withArgs(owner.address, ethers.parseEther('500'))
      await expect(tx)
        .to.emit(investorProxy, 'DividendDistributed')
        .withArgs(shareholder1.address, ethers.parseEther('200'))
      await expect(tx)
        .to.emit(investorProxy, 'DividendDistributed')
        .withArgs(shareholder2.address, ethers.parseEther('150'))
      await expect(tx)
        .to.emit(investorProxy, 'DividendDistributed')
        .withArgs(shareholder3.address, ethers.parseEther('150'))
    })

    it('should not distribute dividend if no token minted yet', async () => {
      await expect(
        investorProxy.connect(owner).distributeDividends({
          value: ethers.parseEther('100')
        })
      ).to.be.revertedWith('No tokens minted')
    })
  })

  context('Add Stock Grant', () => {
    let newShareholder: SignerWithAddress

    beforeEach(async () => {
      newShareholder = (await ethers.getSigners())[4]
    })

    it('should add stock grant', async () => {
      const newAmount = ethers.parseEther('100')
      await investorProxy.connect(owner).addStockGrant(newShareholder.address, newAmount, true, 0)
      const stockGrant = await investorProxy.getStockGrant(newShareholder.address)
      expect(stockGrant.shareholder).to.eq(newShareholder.address)
      expect(stockGrant.amount).to.eq(newAmount)
      expect(stockGrant.isActive).to.be.true
    })

    it('should add stock grant and sign bonus', async () => {
      const newAmount = ethers.parseEther('100')
      await investorProxy
        .connect(owner)
        .addStockGrant(newShareholder.address, newAmount, true, ethers.parseEther('10'))
      const stockGrant = await investorProxy.getStockGrant(newShareholder.address)
      expect(stockGrant.shareholder).to.eq(newShareholder.address)
      expect(stockGrant.amount).to.eq(newAmount)
      expect(stockGrant.isActive).to.be.true
    })

    it('should emit StockGrantAdded event', async () => {
      const newAmount = ethers.parseEther('100')
      const tx = await investorProxy
        .connect(owner)
        .addStockGrant(newShareholder.address, newAmount, true, 0)
      await expect(tx)
        .to.emit(investorProxy, 'StockGrantAdded')
        .withArgs(newShareholder.address, newAmount, true)
    })

    it('should not add stock grant if not owner', async () => {
      await expect(
        investorProxy
          .connect(shareholder1)
          .addStockGrant(newShareholder.address, ethers.parseEther('100'), true, 0)
      ).to.be.reverted
    })

    it('should not add stock grant if not valid address', async () => {
      await expect(
        investorProxy
          .connect(owner)
          .addStockGrant(ethers.ZeroAddress, ethers.parseEther('100'), true, 0)
      ).to.be.revertedWith('Invalid shareholder address')
    })

    it('should not add stock grant if already exist', async () => {
      await expect(
        investorProxy.connect(owner).addStockGrant(owner.address, ethers.parseEther('100'), true, 0)
      ).to.be.revertedWith('Shareholder already exists')
    })
  })

  context('Update Stock Grant', () => {
    it('should update stock grant', async () => {
      const newAmount = ethers.parseEther('100')
      await investorProxy.connect(owner).updateStockGrant(owner.address, newAmount, false)
      const stockGrant = await investorProxy.getStockGrant(owner.address)
      expect(stockGrant.amount).to.eq(newAmount)
      expect(stockGrant.isActive).to.be.false
    })

    it('should emit StockGrantUpdated event', async () => {
      const newAmount = ethers.parseEther('100')
      const tx = await investorProxy.connect(owner).updateStockGrant(owner.address, newAmount, true)
      await expect(tx)
        .to.emit(investorProxy, 'StockGrantUpdated')
        .withArgs(owner.address, newAmount, true)
    })

    it('should not update stock grant if not owner', async () => {
      await expect(
        investorProxy
          .connect(shareholder1)
          .updateStockGrant(shareholder1.address, ethers.parseEther('100'), true)
      ).to.be.reverted
    })
  })

  context('Remove Stock Grant', () => {
    it('should delete stock grant', async () => {
      await investorProxy.connect(owner).removeStockGrant(shareholder1.address)
      const stockGrant = await investorProxy.getStockGrant(shareholder1.address)
      const investors = await investorProxy.getShareholders()
      expect(stockGrant.shareholder).to.eq(ethers.ZeroAddress)
      expect(stockGrant.amount).to.eq(0)
      expect(stockGrant.isActive).to.be.false
      expect(investors).to.not.include(shareholder1.address)
    })

    it('should emit StockGrantRemoved event', async () => {
      const tx = await investorProxy.connect(owner).removeStockGrant(owner.address)
      await expect(tx).to.emit(investorProxy, 'StockGrantRemoved').withArgs(owner.address)
    })

    it('should not delete stock grant if not owner', async () => {
      await expect(investorProxy.connect(shareholder1).removeStockGrant(shareholder1.address)).to.be
        .reverted
    })

    it('should not delete stock grant if not valid address', async () => {
      await expect(investorProxy.connect(owner).removeStockGrant(ethers.ZeroAddress)).to.be.reverted
    })
  })

  context('Pause and Unpause', () => {
    it('should pause contract', async () => {
      await investorProxy.connect(owner).pause()
      expect(await investorProxy.paused()).to.be.true
    })

    it('should emit Paused event', async () => {
      const tx = await investorProxy.connect(owner).pause()
      await expect(tx).to.emit(investorProxy, 'Paused').withArgs(owner.address)
    })

    it('should not mint token if paused', async () => {
      await investorProxy.connect(owner).pause()
      await expect(investorProxy.connect(owner).mint()).to.be.reverted
    })

    it('should not add stock grant if paused', async () => {
      const newShareholder = (await ethers.getSigners())[4]
      await investorProxy.connect(owner).pause()
      await expect(
        investorProxy
          .connect(owner)
          .addStockGrant(newShareholder.address, ethers.parseEther('100'), true, 0)
      ).to.be.reverted
    })

    it('should not update stock grant if paused', async () => {
      await investorProxy.connect(owner).pause()
      await expect(
        investorProxy.connect(owner).updateStockGrant(owner.address, ethers.parseEther('100'), true)
      ).to.be.reverted
    })

    it('should not remove stock grant if paused', async () => {
      await investorProxy.connect(owner).pause()
      await expect(investorProxy.connect(owner).removeStockGrant(owner.address)).to.be.reverted
    })

    it('should not pause contract if not owner', async () => {
      await expect(investorProxy.connect(shareholder1).pause()).to.be.reverted
    })

    it('should unpause contract', async () => {
      await investorProxy.connect(owner).pause()
      await investorProxy.connect(owner).unpause()
      expect(await investorProxy.paused()).to.be.false
    })

    it('should emit Unpaused event', async () => {
      await investorProxy.connect(owner).pause()
      const tx = await investorProxy.connect(owner).unpause()
      await expect(tx).to.emit(investorProxy, 'Unpaused').withArgs(owner.address)
    })

    it('should not unpause contract if not owner', async () => {
      await expect(investorProxy.connect(shareholder1).unpause()).to.be.reverted
    })
  })
})

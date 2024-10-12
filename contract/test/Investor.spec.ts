import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Investor, Investor__factory } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { MintAgreementStruct } from '../typechain-types/contracts/Investor/Investor'

describe('Investor Contract', () => {
  let InvestorImplementation: Investor__factory
  let investorProxy: Investor
  let owner: SignerWithAddress
  let investor1: SignerWithAddress
  let investor2: SignerWithAddress
  let investor3: SignerWithAddress
  let initialAgreements: MintAgreementStruct[]
  const name = 'Investor'
  const symbol = 'INV'

  beforeEach(async function () {
    ;[owner, investor1, investor2, investor3] = await ethers.getSigners()
    InvestorImplementation = await ethers.getContractFactory('Investor')
    initialAgreements = [
      {
        amount: ethers.parseEther('50'),
        investor: owner.address,
        isActive: true,
        lastMinted: 0,
        totalMinted: 0
      },
      {
        amount: ethers.parseEther('20'),
        investor: investor1.address,
        isActive: true,
        lastMinted: 0,
        totalMinted: 0
      },
      {
        amount: ethers.parseEther('15'),
        investor: investor2.address,
        isActive: true,
        lastMinted: 0,
        totalMinted: 0
      },
      {
        amount: ethers.parseEther('15'),
        investor: investor3.address,
        isActive: true,
        lastMinted: 0,
        totalMinted: 0
      }
    ]
    investorProxy = (await upgrades.deployProxy(InvestorImplementation, [
      name,
      symbol,
      initialAgreements
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
    it('should mint token based on mint agreements', async () => {
      const tx = await investorProxy.connect(owner).mint()
      await tx.wait()
      expect(await investorProxy.totalSupply()).to.eq(
        initialAgreements.reduce((acc, agreement) => acc + BigInt(agreement.amount), BigInt(0))
      )

      Array(owner, investor1, investor2, investor3).forEach(async (investor) => {
        expect(await investorProxy.balanceOf(investor.address)).to.eq(
          initialAgreements.find((agreement) => agreement.investor === investor.address)!.amount
        )
      })
    })

    it('should emits Minted event', async () => {
      const tx = await investorProxy.connect(owner).mint()
      await expect(tx)
        .to.emit(investorProxy, 'Minted')
        .withArgs(owner.address, initialAgreements[0].amount)
        .to.emit(investorProxy, 'Minted')
        .withArgs(investor1.address, initialAgreements[1].amount)
        .to.emit(investorProxy, 'Minted')
        .withArgs(investor2.address, initialAgreements[2].amount)
        .to.emit(investorProxy, 'Minted')
        .withArgs(investor3.address, initialAgreements[3].amount)
    })

    it('should change lastMinted and totalMinted after minting', async () => {
      const tx = await investorProxy.connect(owner).mint()
      await tx.wait()
      const time = (await ethers.provider.getBlock(tx.blockHash!))?.timestamp
      const agreements = await investorProxy.getMintAgreements()
      agreements.forEach((agreement, index) => {
        expect(agreement.lastMinted).to.eq(time)
        expect(agreement.totalMinted).to.eq(initialAgreements[index].amount)
      })
    })

    it('should not mint or skip minting token to inactive agreement', async () => {
      await investorProxy
        .connect(owner)
        .updateMintAgreement(investor1.address, initialAgreements[1].amount, false)
      await investorProxy.connect(owner).mint()

      expect(await investorProxy.balanceOf(investor1.address)).to.eq(0)
    })

    it('should not mint token if not owner', async () => {
      expect(investorProxy.connect(investor1).mint()).to.be.reverted
    })
  })

  context('Distribute Dividend', () => {
    it('should distribute dividend to all investors', async () => {
      // mint token first
      await mint()

      /**
       * owner = 50%
       * investor1 = 20%
       * investor2 = 15%
       * investor3 = 15%
       * totalSupply = 100
       * dividend = 1000
       * expected amount:
       * owner = 500
       * investor1 = 200
       * investor2 = 150
       * investor3 = 150
       * total = 1000
       * */

      const dividend = ethers.parseEther('1000')
      const tx = await investorProxy.connect(owner).distributeDividends({
        value: dividend
      })

      const agreements = await investorProxy.getMintAgreements()
      const expectedAmounts = [
        ethers.parseEther('500'),
        ethers.parseEther('200'),
        ethers.parseEther('150'),
        ethers.parseEther('150')
      ]
      agreements.forEach(async (agreement, index) => {
        expect(await ethers.provider.getBalance(agreement.investor)).to.eq(expectedAmounts[index])
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
        .withArgs(investor1.address, ethers.parseEther('200'))
      await expect(tx)
        .to.emit(investorProxy, 'DividendDistributed')
        .withArgs(investor2.address, ethers.parseEther('150'))
      await expect(tx)
        .to.emit(investorProxy, 'DividendDistributed')
        .withArgs(investor3.address, ethers.parseEther('150'))
    })

    it('should not distribute dividend if not owner', async () => {
      expect(
        investorProxy.connect(investor1).distributeDividends({
          value: ethers.parseEther('1000')
        })
      ).to.be.reverted
    })

    it('should not distribute dividend if no token minted yet', async () => {
      expect(
        investorProxy.connect(owner).distributeDividends({
          value: ethers.parseEther('100')
        })
      ).to.be.revertedWith('No tokens minted')
    })
  })

  context('Add Mint Agreement', () => {
    let newInvestor: SignerWithAddress

    beforeEach(async () => {
      newInvestor = (await ethers.getSigners())[4]
    })

    it('should add mint agreement', async () => {
      const newAmount = ethers.parseEther('100')
      await investorProxy.connect(owner).addMintAgreement(newInvestor.address, newAmount, true)
      const agreement = await investorProxy.getMintAgreement(newInvestor.address)
      expect(agreement.investor).to.eq(newInvestor.address)
      expect(agreement.amount).to.eq(newAmount)
      expect(agreement.isActive).to.be.true
    })

    it('should emit MintAgreementAdded event', async () => {
      const newAmount = ethers.parseEther('100')
      const tx = await investorProxy
        .connect(owner)
        .addMintAgreement(newInvestor.address, newAmount, true)
      await expect(tx)
        .to.emit(investorProxy, 'MintAgreementAdded')
        .withArgs(newInvestor.address, newAmount, true)
    })

    it('should not add mint agreement if not owner', async () => {
      expect(
        investorProxy
          .connect(investor1)
          .addMintAgreement(newInvestor.address, ethers.parseEther('100'), true)
      ).to.be.reverted
    })

    it('should not add mint agreement if not valid address', async () => {
      expect(
        investorProxy
          .connect(owner)
          .addMintAgreement(ethers.ZeroAddress, ethers.parseEther('100'), true)
      ).to.be.revertedWith('Invalid address')
    })

    it('should not add mint agreement if already exist', async () => {
      expect(
        investorProxy
          .connect(owner)
          .addMintAgreement(owner.address, ethers.parseEther('100'), true)
      ).to.be.revertedWith('Agreement already exist')
    })
  })

  context('Update Mint Agreement', () => {
    it('should update mint agreement', async () => {
      const newAmount = ethers.parseEther('100')
      await investorProxy.connect(owner).updateMintAgreement(owner.address, newAmount, false)
      const agreement = await investorProxy.getMintAgreement(owner.address)
      expect(agreement.amount).to.eq(newAmount)
      expect(agreement.isActive).to.be.false
    })

    it('should emit MintAgreementUpdated event', async () => {
      const newAmount = ethers.parseEther('100')
      const tx = await investorProxy
        .connect(owner)
        .updateMintAgreement(owner.address, newAmount, true)
      await expect(tx)
        .to.emit(investorProxy, 'MintAgreementUpdated')
        .withArgs(owner.address, newAmount, true)
    })

    it('should not update mint agreement if not owner', async () => {
      expect(
        investorProxy
          .connect(investor1)
          .updateMintAgreement(investor1.address, ethers.parseEther('100'), true)
      ).to.be.reverted
    })
  })

  context('Remove Mint Agreement', () => {
    it('should delete mint agreement', async () => {
      await investorProxy.connect(owner).removeMintAgreement(investor1.address)
      const agreement = await investorProxy.getMintAgreement(investor1.address)
      const investors = await investorProxy.getInvestors()
      expect(agreement.investor).to.eq(ethers.ZeroAddress)
      expect(agreement.amount).to.eq(0)
      expect(agreement.isActive).to.be.false
      expect(investors).to.not.include(investor1.address)
    })

    it('should emit MintAgreementRemoved event', async () => {
      const tx = await investorProxy.connect(owner).removeMintAgreement(owner.address)
      await expect(tx).to.emit(investorProxy, 'MintAgreementRemoved').withArgs(owner.address)
    })

    it('should not delete mint agreement if not owner', async () => {
      expect(investorProxy.connect(investor1).removeMintAgreement(investor1.address)).to.be.reverted
    })

    it('should not delete mint agreement if not valid address', async () => {
      expect(investorProxy.connect(owner).removeMintAgreement(ethers.ZeroAddress)).to.be.reverted
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
      expect(investorProxy.connect(owner).mint()).to.be.reverted
    })

    it('should not add mint agreement if paused', async () => {
      const newInvestor = (await ethers.getSigners())[4]
      await investorProxy.connect(owner).pause()
      expect(
        investorProxy
          .connect(owner)
          .addMintAgreement(newInvestor.address, ethers.parseEther('100'), true)
      ).to.be.reverted
    })

    it('should not update mint agreement if paused', async () => {
      await investorProxy.connect(owner).pause()
      expect(
        investorProxy
          .connect(owner)
          .updateMintAgreement(owner.address, ethers.parseEther('100'), true)
      ).to.be.reverted
    })

    it('should not remove mint agreement if paused', async () => {
      await investorProxy.connect(owner).pause()
      expect(investorProxy.connect(owner).removeMintAgreement(owner.address)).to.be.reverted
    })

    it('should not pause contract if not owner', async () => {
      expect(investorProxy.connect(investor1).pause()).to.be.reverted
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
      expect(investorProxy.connect(investor1).unpause()).to.be.reverted
    })
  })
})

import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Bank, Tips } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('Bank', () => {
  let bank: Bank
  let tips: Tips
  let owner: SignerWithAddress, other: SignerWithAddress
  beforeEach(async () => {
    ;[owner, other] = await ethers.getSigners()

    const Tips = await ethers.getContractFactory('Tips')
    tips = (await upgrades.deployProxy(Tips, [], {
      initializer: 'initialize'
    })) as unknown as Tips

    const Bank = await ethers.getContractFactory('Bank')
    bank = (await upgrades.deployProxy(Bank, [await tips.getAddress()], {
      initializer: 'initialize'
    })) as unknown as Bank

    expect(await bank.getAddress()).to.be.string
    expect(await tips.getAddress()).to.be.string
    expect(await bank.tipsAddress()).to.eq(await tips.getAddress())
  })

  it('should be owned by the owner', async () => {
    expect(await bank.owner()).to.eq(await owner.getAddress())
  })

  describe('receive', () => {
    it('should be able to receive funds', async () => {
      const amount = ethers.parseEther('1')
      const bankAddress = await bank.getAddress()
      await owner.sendTransaction({ to: bankAddress, value: amount })
      expect(await ethers.provider.getBalance(bankAddress)).to.eq(amount)
    })

    it('should emit an event when funds is received', async () => {
      const amount = ethers.parseEther('1')
      await expect(owner.sendTransaction({ to: await bank.getAddress(), value: amount }))
        .to.emit(bank, 'Deposited')
        .withArgs(owner.address, amount)
    })
  })

  describe('transfer', () => {
    beforeEach(async () => {
      await owner.sendTransaction({ to: await bank.getAddress(), value: ethers.parseEther('1') })
    })

    it('should be able to transfer funds', async () => {
      const amount = ethers.parseEther('1')
      const tx = await bank.connect(owner).transfer(other.address, amount)
      expect(tx).to.changeEtherBalance(other, amount)
      expect(tx).to.changeEtherBalance(bank, -amount)
    })

    it('should emit an event when funds are transferred', async () => {
      const amount = ethers.parseEther('1')
      await expect(bank.connect(owner).transfer(other.address, amount))
        .to.emit(bank, 'Transfer')
        .withArgs(owner.address, other.address, amount)
    })

    it('should not be able to transfer funds if not the owner', async () => {
      const amount = ethers.parseEther('1')
      await expect(bank.connect(other).transfer(owner.address, amount)).to.be.reverted
    })

    it('should not be able to transfer funds if the receiver address is zero', async () => {
      await expect(
        bank.connect(owner).transfer(ethers.ZeroAddress, ethers.parseEther('1'))
      ).to.be.revertedWith('Address cannot be zero')
    })

    it('should not be able to transfer funds if the amount is zero', async () => {
      await expect(bank.connect(owner).transfer(other.address, 0)).to.be.revertedWith(
        'Amount must be greater than zero'
      )
    })
  })

  describe('changeTipsAddress', () => {
    it('should be able to change the tips address', async () => {
      const address = ethers.Wallet.createRandom().address
      await bank.connect(owner).changeTipsAddress(address)
      expect(await bank.tipsAddress()).to.eq(address)
    })

    it('should not be able to change the tips address if not the owner', async () => {
      const address = ethers.Wallet.createRandom().address
      await expect(bank.connect(other).changeTipsAddress(address)).to.be.reverted
    })

    it('should emit an event when the tips address is changed', async () => {
      const oldTipsAddress = await bank.tipsAddress()
      const address = ethers.Wallet.createRandom().address
      await expect(bank.connect(owner).changeTipsAddress(address))
        .to.emit(bank, 'TipsAddressChanged')
        .withArgs(owner.address, oldTipsAddress, address)
    })

    it('should not be able to change the tips address if the new address is zero', async () => {
      await expect(bank.connect(owner).changeTipsAddress(ethers.ZeroAddress)).to.be.reverted
    })
  })

  describe('pushTip', () => {
    let member1: SignerWithAddress, member2: SignerWithAddress
    beforeEach(async () => {
      member1 = (await ethers.getSigners())[2]
      member2 = (await ethers.getSigners())[3]

      await owner.sendTransaction({ to: await bank.getAddress(), value: ethers.parseEther('1') })
    })

    it('should be able to push tips', async () => {
      const amount = ethers.parseEther('1')
      const tx = await bank.connect(owner).pushTip([member1.address, member2.address], amount)
      expect(tx).to.changeEtherBalance(await bank.getAddress(), -amount)
      expect(tx).to.changeEtherBalances(
        [member1, member2],
        [ethers.parseEther('0.5'), ethers.parseEther('0.5')]
      )
    })

    it('should emit an event when tips are pushed', async () => {
      const amount = ethers.parseEther('1')
      await expect(bank.connect(owner).pushTip([member1.address, member2.address], amount))
        .to.emit(bank, 'PushTip')
        .withArgs(owner.address, [member1.address, member2.address], amount)
    })

    it('should not be able to push tips if not the owner', async () => {
      const amount = ethers.parseEther('1')
      await expect(bank.connect(member1).pushTip([member1.address, member2.address], amount)).to.be
        .reverted
    })

    it('should not be able to push tips if the funds insufficient', async () => {
      const amount = ethers.parseEther('2')
      await expect(bank.connect(owner).pushTip([member1.address, member2.address], amount)).to.be
        .reverted
    })
  })

  describe('pushTip', () => {
    let member1: SignerWithAddress, member2: SignerWithAddress
    beforeEach(async () => {
      member1 = (await ethers.getSigners())[2]
      member2 = (await ethers.getSigners())[3]

      await owner.sendTransaction({ to: await bank.getAddress(), value: ethers.parseEther('1') })
    })

    it('should be able to push tips', async () => {
      const amount = ethers.parseEther('1')
      const tx = await bank.connect(owner).sendTip([member1.address, member2.address], amount)
      expect(tx).to.changeEtherBalance(await bank.getAddress(), -amount)
      expect(await tips.getBalance(member1.address)).to.eq(ethers.parseEther('0.5'))
      expect(await tips.getBalance(member2.address)).to.eq(ethers.parseEther('0.5'))
    })

    it('should emit an event when tips are sent', async () => {
      const amount = ethers.parseEther('1')
      await expect(bank.connect(owner).sendTip([member1.address, member2.address], amount))
        .to.emit(bank, 'SendTip')
        .withArgs(owner.address, [member1.address, member2.address], amount)
    })

    it('should not be able to send tips if not the owner', async () => {
      const amount = ethers.parseEther('1')
      await expect(bank.connect(member1).sendTip([member1.address, member2.address], amount)).to.be
        .reverted
    })

    it('should not be able to push tips if the funds insufficient', async () => {
      const amount = ethers.parseEther('2')
      await expect(bank.connect(owner).sendTip([member1.address, member2.address], amount)).to.be
        .reverted
    })
  })
})

import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Tips } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('Tips', function () {
  let tips: Tips
  let sender: SignerWithAddress, member1: SignerWithAddress, member2: SignerWithAddress
  let recipientAddress: Array<string>
  const TIP_AMOUNT = ethers.parseEther('20')

  beforeEach(async function () {
    // Get signers for testing accounts
    ;[sender, member1, member2] = await ethers.getSigners()

    recipientAddress = [member1.address, member2.address]
    // Deploy the Tips contract
    const TipsFactory = await ethers.getContractFactory('Tips')
    tips = await TipsFactory.deploy()
    await tips.initialize();
  })

  describe('pushTip', function () {
    it('should emit a PushTip event when a tip is pushed', async function () {
      const amountPerAddress = ethers.parseEther('10')

      await expect(tips.connect(sender).pushTip(recipientAddress, { value: TIP_AMOUNT }))
        .to.emit(tips, 'PushTip')
        .withArgs(sender.address, recipientAddress, TIP_AMOUNT, amountPerAddress)
    })

    it('should revert if the tip amount is zero', async function () {
      await expect(tips.connect(sender).pushTip(recipientAddress)).to.be.revertedWith(
        'Must send a positive amount.'
      )
    })

    it('should transfer the tip amount to the recipient', async function () {
      const amountPerAddress = ethers.parseEther('10')
      const member1StartingBalance = await ethers.provider.getBalance(member1.address)
      const member2StartingBalance = await ethers.provider.getBalance(member2.address)

      await tips.pushTip(recipientAddress, { value: TIP_AMOUNT })

      const member1EndingBalance = await ethers.provider.getBalance(member1.address)
      const member2EndingBalance = await ethers.provider.getBalance(member2.address)
      expect(member1EndingBalance).to.equal(member1StartingBalance + amountPerAddress)
      expect(member2EndingBalance).to.equal(member2StartingBalance + amountPerAddress)
    })
  })

  describe('sendTip', function () {
    it('should emit a SendTip event when a tip is sent', async function () {
      const amountPerAddress = ethers.parseEther('10')

      await expect(tips.connect(sender).sendTip(recipientAddress, { value: TIP_AMOUNT }))
        .to.emit(tips, 'SendTip')
        .withArgs(sender.address, recipientAddress, TIP_AMOUNT, amountPerAddress)
    })

    it('should revert if the tip amount is zero', async function () {
      await expect(tips.connect(sender).sendTip(recipientAddress)).to.be.revertedWith(
        'Must send a positive amount.'
      )
    })

    it('should accumulate tips for the recipient', async function () {
      const amountPerAddress = ethers.parseEther('10')
      await tips.sendTip(recipientAddress, { value: TIP_AMOUNT })
      await tips.sendTip(recipientAddress, { value: TIP_AMOUNT })

      const addressToTips = await tips.getBalance(member1.address)
      const expectedTotalTip = amountPerAddress + amountPerAddress
      expect(addressToTips).to.equal(expectedTotalTip)
    })
  })

  describe('withdraw', function () {
    it('should revert if no tips have been earned', async function () {
      await expect(tips.connect(member1).withdraw(TIP_AMOUNT)).to.be.revertedWith(
        'No tips to withdraw.'
      )
    })

    it('should withdraw earned tips and reset the balance', async function () {
      const amountPerAddress = ethers.parseEther('10')
      const amountToWithdraw = ethers.parseEther('5')
      await tips.connect(sender).sendTip(recipientAddress, { value: TIP_AMOUNT })

      await expect(() => tips.connect(member1).withdraw(amountToWithdraw)).to.changeEtherBalance(
        member1,
        amountToWithdraw
      )
      expect(await tips.getBalance(member1.address)).to.equal(amountPerAddress - amountToWithdraw)
    })

    it('should emit a TipWithdrawal event on successful withdrawal', async function () {
      const amountToWithdraw = ethers.parseEther('5')
      await tips.connect(sender).sendTip(recipientAddress, { value: TIP_AMOUNT })

      await expect(tips.connect(member1).withdraw(amountToWithdraw))
        .to.emit(tips, 'TipWithdrawal')
        .withArgs(member1.address, amountToWithdraw)
    })
  })
})

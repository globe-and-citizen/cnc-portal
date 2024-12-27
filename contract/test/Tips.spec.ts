import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { Tips } from '../typechain-types/contracts'

describe('Tips', function () {
  let tips: Tips
  let owner: SignerWithAddress,
    sender: SignerWithAddress,
    member1: SignerWithAddress,
    member2: SignerWithAddress

  let recipientAddress: Array<string>
  const TIP_AMOUNT = ethers.parseEther('20')

  beforeEach(async function () {
    // Get signers for testing accounts
    const [signer1, signer2, signer3, signer4] = await ethers.getSigners()
    owner = signer1
    sender = signer2
    member1 = signer3
    member2 = signer4

    recipientAddress = [member1.address, member2.address]
    // Deploy the Tips contract
    const tipsFactory = await ethers.getContractFactory('Tips')
    tips = (await upgrades.deployProxy(tipsFactory)) as unknown as Tips
  })

  it('should deploy and set the owner', async function () {
    expect(tips.deploymentTransaction()).is.exist
    expect(await tips.connect(sender).owner()).to.equal(owner.address)
  })
  it('should update the push limit', async () => {
    await tips.connect(owner).updatePushLimit(50)
    expect(await tips.pushLimit()).to.equal(50)
  })
  it('should retrieve contract balance', async () => {
    const balance = await tips.getContractBalance()
    expect(balance).to.equal(0)
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
      await expect(tips.connect(member1).withdraw()).to.be.revertedWith('No tips to withdraw.')
    })

    it('should withdraw earned tips and reset the balance', async function () {
      await tips.connect(sender).sendTip(recipientAddress, { value: TIP_AMOUNT })

      await expect(() => tips.connect(member1).withdraw()).to.changeEtherBalance(
        member1,
        ethers.parseEther('10')
      )

      expect(await tips.getBalance(member1.address)).to.equal(0) // Balance should be reset
    })

    it('should emit a TipWithdrawal event on successful withdrawal', async function () {
      const amountPerAddress = ethers.parseEther('10')
      await tips.connect(sender).sendTip(recipientAddress, { value: TIP_AMOUNT })

      await expect(tips.connect(member1).withdraw())
        .to.emit(tips, 'TipWithdrawal')
        .withArgs(member1.address, amountPerAddress)
    })
  })
  describe('pause', () => {
    it('Should allow only owner to pause the contract', async function () {
      await expect(tips.connect(owner).pause()).to.emit(tips, 'Paused').withArgs(owner.address)

      expect(tips.connect(member1).pause()).to.be.revertedWithCustomError
    })

    it('Should allow only owner to unpause the contract', async function () {
      await tips.connect(owner).pause()

      await expect(tips.connect(owner).unpause()).to.emit(tips, 'Unpaused').withArgs(owner.address)

      expect(tips.connect(member1).unpause()).to.be.revertedWithCustomError
    })

    it('Should not allow tips to be pushed when paused', async function () {
      await tips.connect(owner).pause()

      expect(tips.connect(member1).pushTip([member2.address], { value: ethers.parseEther('1') })).to
        .be.revertedWithCustomError
    })

    it('Should allow tips to be pushed when unpaused', async function () {
      await tips.connect(owner).pause()
      await tips.connect(owner).unpause()
      await expect(
        tips.connect(member1).pushTip([member1.address], { value: ethers.parseEther('1') })
      ).to.emit(tips, 'PushTip')
    })
  })
})

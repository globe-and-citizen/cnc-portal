import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Bank } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('Bank', () => {
  let bankProxy: Bank
  let owner: SignerWithAddress
  let sender: SignerWithAddress
  let member1: SignerWithAddress
  let member2: SignerWithAddress
  let recipientAddresses: Array<string>
  const TIP_AMOUNT = ethers.parseEther('20')

  beforeEach(async () => {
    ;[owner, sender, member1, member2] = await ethers.getSigners()
    recipientAddresses = [member1.address, member2.address]

    const BankImplementation = await ethers.getContractFactory('Bank')
    bankProxy = (await upgrades.deployProxy(BankImplementation, [owner.address], {
      initializer: 'initialize'
    })) as unknown as Bank
  })

  describe('Deployment', () => {
    it('should set the correct owner', async () => {
      expect(await bankProxy.owner()).to.eq(owner.address)
    })

    it('should not allow to initialize the contract again', async () => {
      await expect(bankProxy.initialize(owner.address)).to.be.reverted
    })
  })

  describe('Deposits', () => {
    it('should allow any address to deposit funds', async () => {
      const depositAmount = ethers.parseEther('10')

      await expect(async () =>
        sender.sendTransaction({ to: await bankProxy.getAddress(), value: depositAmount })
      ).to.changeEtherBalance(bankProxy, depositAmount)

      await expect(async () =>
        member1.sendTransaction({ to: await bankProxy.getAddress(), value: depositAmount })
      ).to.changeEtherBalance(bankProxy, depositAmount)
    })

    it('should emit Deposited event', async () => {
      const depositAmount = ethers.parseEther('10')

      await expect(
        sender.sendTransaction({ to: await bankProxy.getAddress(), value: depositAmount })
      )
        .to.emit(bankProxy, 'Deposited')
        .withArgs(sender.address, depositAmount)
    })
  })

  describe('Transfers', () => {
    beforeEach(async () => {
      // Fund the bank contract
      await owner.sendTransaction({
        to: await bankProxy.getAddress(),
        value: ethers.parseEther('50')
      })
    })

    it('should allow owner to transfer funds', async () => {
      const transferAmount = ethers.parseEther('1')

      const tx = bankProxy.transfer(member1.address, transferAmount)
      await expect(tx).to.changeEtherBalance(bankProxy, -transferAmount)
      await expect(tx).to.changeEtherBalance(member1, transferAmount)
    })

    it('should emit Transfer event', async () => {
      const transferAmount = ethers.parseEther('1')

      await expect(bankProxy.transfer(member1.address, transferAmount))
        .to.emit(bankProxy, 'Transfer')
        .withArgs(owner.address, member1.address, transferAmount)
    })

    it('should fail when the to address is zero', async () => {
      await expect(
        bankProxy.transfer(ethers.ZeroAddress, ethers.parseEther('1'))
      ).to.be.revertedWith('Address cannot be zero')
    })

    it('should fail when amount is zero', async () => {
      await expect(bankProxy.transfer(member1.address, 0)).to.be.revertedWith(
        'Amount must be greater than zero'
      )
    })

    it('should fail when non-owner tries to transfer', async () => {
      await expect(bankProxy.connect(member1).transfer(member2.address, ethers.parseEther('1'))).to
        .be.reverted
    })
  })

  describe('Tips Management', () => {
    beforeEach(async () => {
      // Fund the bank contract
      await owner.sendTransaction({
        to: await bankProxy.getAddress(),
        value: ethers.parseEther('50')
      })
    })

    describe('pushTip', () => {
      it('should allow owner to push tips directly to recipients', async () => {
        const amountPerAddress = ethers.parseEther('10')

        const tx = bankProxy.pushTip(recipientAddresses, TIP_AMOUNT)
        await expect(tx).to.changeEtherBalance(bankProxy, -TIP_AMOUNT)
        await expect(tx).to.changeEtherBalance(member1, amountPerAddress)
        await expect(tx).to.changeEtherBalance(member2, amountPerAddress)
      })

      it('should emit PushTip event', async () => {
        const amountPerAddress = ethers.parseEther('10')

        await expect(bankProxy.pushTip(recipientAddresses, TIP_AMOUNT))
          .to.emit(bankProxy, 'PushTip')
          .withArgs(owner.address, recipientAddresses, TIP_AMOUNT, amountPerAddress)
      })

      it('should fail when team members exceed push limit', async () => {
        const manyAddresses = Array(11).fill(member1.address)
        await expect(bankProxy.pushTip(manyAddresses, TIP_AMOUNT)).to.be.revertedWith(
          'You have too much team members'
        )
      })

      it('should fail when non-owner tries to push tips', async () => {
        await expect(bankProxy.connect(member1).pushTip(recipientAddresses, TIP_AMOUNT)).to.be
          .reverted
      })
    })

    describe('sendTip', () => {
      it('should allow owner to send tips to balance', async () => {
        const amountPerAddress = ethers.parseEther('10')

        await bankProxy.sendTip(recipientAddresses, TIP_AMOUNT)

        expect(await bankProxy.getBalance(member1.address)).to.equal(amountPerAddress)
        expect(await bankProxy.getBalance(member2.address)).to.equal(amountPerAddress)
      })

      it('should emit SendTip event', async () => {
        const amountPerAddress = ethers.parseEther('10')

        await expect(bankProxy.sendTip(recipientAddresses, TIP_AMOUNT))
          .to.emit(bankProxy, 'SendTip')
          .withArgs(owner.address, recipientAddresses, TIP_AMOUNT, amountPerAddress)
      })

      it('should accumulate tips in balance', async () => {
        const amountPerAddress = ethers.parseEther('10')

        await bankProxy.sendTip(recipientAddresses, TIP_AMOUNT)
        await bankProxy.sendTip(recipientAddresses, TIP_AMOUNT)

        expect(await bankProxy.getBalance(member1.address)).to.equal(amountPerAddress * 2n)
      })

      it('should fail when non-owner tries to send tips', async () => {
        await expect(bankProxy.connect(member1).sendTip(recipientAddresses, TIP_AMOUNT)).to.be
          .reverted
      })
    })

    describe('withdraw', () => {
      beforeEach(async () => {
        await bankProxy.sendTip(recipientAddresses, TIP_AMOUNT)
      })

      it('should allow withdrawal of accumulated tips', async () => {
        const initialBalance = await bankProxy.getBalance(member1.address)

        await expect(() => bankProxy.connect(member1).withdraw()).to.changeEtherBalance(
          member1,
          initialBalance
        )

        expect(await bankProxy.getBalance(member1.address)).to.equal(0)
      })

      it('should emit TipWithdrawal event', async () => {
        const withdrawAmount = await bankProxy.getBalance(member1.address)

        await expect(bankProxy.connect(member1).withdraw())
          .to.emit(bankProxy, 'TipWithdrawal')
          .withArgs(member1.address, withdrawAmount)
      })

      it('should fail when no tips to withdraw', async () => {
        await bankProxy.connect(member1).withdraw()

        await expect(bankProxy.connect(member1).withdraw()).to.be.revertedWith(
          'No tips to withdraw.'
        )
      })
    })
  })

  describe('Push Limit Management', () => {
    it('should allow owner to update push limit', async () => {
      await bankProxy.updatePushLimit(50)
      expect(await bankProxy.pushLimit()).to.equal(50)
    })

    it('should fail when new limit exceeds maximum', async () => {
      await expect(bankProxy.updatePushLimit(101)).to.be.revertedWith(
        'Push limit is too high, must be less or equal to 100'
      )
    })

    it('should fail when new limit is same as current', async () => {
      await expect(bankProxy.updatePushLimit(10)).to.be.revertedWith(
        'New limit is the same as the old one'
      )
    })

    it('should fail when non-owner tries to update limit', async () => {
      await expect(bankProxy.connect(member1).updatePushLimit(50)).to.be.reverted
    })
  })

  describe('Contract Management', () => {
    describe('pause/unpause', () => {
      it('should allow owner to pause and unpause', async () => {
        await bankProxy.pause()
        expect(await bankProxy.paused()).to.be.true

        await bankProxy.unpause()
        expect(await bankProxy.paused()).to.be.false
      })

      it('should prevent non-owner from pausing/unpausing', async () => {
        await expect(bankProxy.connect(member1).pause()).to.be.reverted

        await bankProxy.pause()
        await expect(bankProxy.connect(member1).unpause()).to.be.reverted
      })

      it('should prevent operations when paused', async () => {
        await bankProxy.pause()

        await expect(bankProxy.transfer(member1.address, ethers.parseEther('1'))).to.be.reverted

        await expect(bankProxy.pushTip(recipientAddresses, TIP_AMOUNT)).to.be.reverted

        await expect(bankProxy.sendTip(recipientAddresses, TIP_AMOUNT)).to.be.reverted
      })
    })

    describe('getContractBalance', () => {
      it('should return correct contract balance', async () => {
        const amount = ethers.parseEther('10')
        await owner.sendTransaction({
          to: await bankProxy.getAddress(),
          value: amount
        })

        expect(await bankProxy.getContractBalance()).to.equal(amount)
      })

      it('should fail when non-owner tries to get balance', async () => {
        await expect(bankProxy.connect(member1).getContractBalance()).to.be.reverted
      })
    })
  })
})

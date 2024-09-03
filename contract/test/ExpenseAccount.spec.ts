import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ExpenseAccount } from '../typechain-types'

describe('ExpenseAccount', () => {
  let expenseAccountProxy: ExpenseAccount

  const deployContract = async (owner: SignerWithAddress) => {
    const ExpenseAccountImplementation = await ethers.getContractFactory('ExpenseAccount')
    expenseAccountProxy = (await upgrades.deployProxy(
      ExpenseAccountImplementation,
      [owner.address],
      { initializer: 'initialize' }
    )) as unknown as ExpenseAccount
  }

  describe('As CNC Company Founder', () => {
    let owner: SignerWithAddress
    let withdrawer: SignerWithAddress

    context('I want to deploy my Expense Account Smart Contract', () => {
      before(async () => {
        ;[owner, withdrawer] = await ethers.getSigners()
        await deployContract(owner)
      })

      it('Then I become the owner of the contract', async () => {
        expect(await expenseAccountProxy.owner()).to.eq(await owner.getAddress())
      })

      it('Then I can deposit into the expense account contract', async () => {
        const amount = ethers.parseEther('100')
        const tx = await owner.sendTransaction({
          to: await expenseAccountProxy.getAddress(),
          value: amount
        })

        expect(tx).to.changeEtherBalance(expenseAccountProxy, amount)
        await expect(tx).to.emit(expenseAccountProxy, 'Deposited').withArgs(owner.address, amount)
      })

      it('Then I can get the smart contract balance', async () => {
        const balance = await expenseAccountProxy.getBalance()
        expect(balance).to.eq(ethers.parseEther('100'))
      })

      it('Then I can set a withdrawal limit', async () => {
        await expenseAccountProxy.setMaxLimit(ethers.parseEther('10'))
        expect(await expenseAccountProxy.maxLimit()).to.eq(ethers.parseEther('10'))
      })

      it('Then I can authorize a user to send from the expense account', async () => {
        await expenseAccountProxy.approveAddress(withdrawer.address)
        expect(await expenseAccountProxy.approvedAddresses(withdrawer.address)).to.eq(true)
      })

      it('Then an authorized user can send from the expense account', async () => {
        const amount = ethers.parseEther('10')
        const tx = await expenseAccountProxy.connect(withdrawer).transfer(withdrawer, amount)
        await expect(tx)
          .to.emit(expenseAccountProxy, 'Transfer')
          .withArgs(withdrawer.address, withdrawer.address, amount)
      })

      it('Then a user cannot send more than the set limit', async () => {
        const amount = ethers.parseEther('15')
        await expect(
          expenseAccountProxy.connect(withdrawer).transfer(withdrawer.address, amount)
        ).to.be.revertedWith('Max limit exceeded')
      })

      it('Then a user cannot send to zero address', async () => {
        const amount = ethers.parseEther('15')
        await expect(
          expenseAccountProxy
            .connect(withdrawer)
            .transfer('0x0000000000000000000000000000000000000000', amount)
        ).to.be.revertedWith('Address required')
      })

      it('Then a user cannot send a zero or negative amount', async () => {
        const amount = ethers.parseEther('0')
        await expect(
          expenseAccountProxy.connect(withdrawer).transfer(withdrawer.address, amount)
        ).to.be.revertedWith('Amount must be greater than zero')
      })

      it('Then I can unauthorize a user', async () => {
        await expenseAccountProxy.disapproveAddress(withdrawer.address)
        expect(await expenseAccountProxy.approvedAddresses(withdrawer.address)).to.eq(false)
      })

      it('Then an unauthorized user cannot withdraw', async () => {
        await expect(
          expenseAccountProxy
            .connect(withdrawer)
            .transfer(withdrawer.address, ethers.parseEther('5'))
        ).to.be.revertedWith('Sender not approved')
      })

      it('Then I can pause the account', async () => {
        await expect(expenseAccountProxy.pause())
          .to.emit(expenseAccountProxy, 'Paused')
          .withArgs(owner.address)
      })

      it('Then I can unpause the account', async () => {
        await expect(expenseAccountProxy.unpause())
          .to.emit(expenseAccountProxy, 'Unpaused')
          .withArgs(owner.address)
      })
    })
  })
})

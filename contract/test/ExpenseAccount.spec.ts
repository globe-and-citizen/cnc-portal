import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ExpenseAccount } from '../typechain-types'

describe('ExpenseAccount (Current Implementation)', () => {
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

      it("Then as the contract owner I'm an approved user by default", async () => {
        const isApproved = await expenseAccountProxy.approvedAddresses(owner.address)
        expect(isApproved).to.eq(true)
      })

      //TODO: anyone can deposit into the expense account
      // The owner, the withdrawer, or any other address: That mean 3 test cases. 3 3 transaction to check that
      // Here you assert that there is an event emited, but you don't check if the balance is updated
      // The test can be donne with a random value, and the test will pass
      it('Then I can deposit into the expense account contract', async () => {
        const amount = ethers.parseEther('100')
        const tx = await owner.sendTransaction({
          to: await expenseAccountProxy.getAddress(),
          value: amount
        })

        expect(tx).to.changeEtherBalance(expenseAccountProxy, amount)
        await expect(tx).to.emit(expenseAccountProxy, 'Deposited').withArgs(owner.address, amount)
      })

      // the check of the balance will be donne in the first test, so you don't need to check it here
      it('Then I can get the smart contract balance', async () => {
        const balance = await expenseAccountProxy.getBalance()
        expect(balance).to.eq(ethers.parseEther('100'))
      })

      // OK noting to say here
      it('Then I can set a transfer limit', async () => {
        const tx = await expenseAccountProxy.setMaxLimit(ethers.parseEther('10'))
        expect(await expenseAccountProxy.maxLimit()).to.eq(ethers.parseEther('10'))

        const receipt = await tx.wait()
        console.log(`\t  Gas used: ${receipt?.gasUsed.toString()}`)
      })

      it('Then I can authorize a user to transfer from the expense account', async () => {
        const tx = await expenseAccountProxy.approveAddress(withdrawer.address)
        expect(await expenseAccountProxy.approvedAddresses(withdrawer.address)).to.eq(true)

        const receipt = await tx.wait()
        console.log(`\t  Gas used: ${receipt?.gasUsed.toString()}`)
      })

      it('Then an authorized user can transfer from the expense account', async () => {
        const amount = ethers.parseEther('10')
        const tx = await expenseAccountProxy.connect(withdrawer).transfer(withdrawer, amount)
        await expect(tx)
          .to.emit(expenseAccountProxy, 'Transfer')
          .withArgs(withdrawer.address, withdrawer.address, amount)

        const receipt = await tx.wait()
        console.log(`\t  Gas used: ${receipt?.gasUsed.toString()}`)
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

      // This is a little bit strange. It's like a user need to be unauthorize sepecially then he can't withdraw
      // Because a user who never been authorized can't withdraw. It need to be checked also here, so you need to check it also
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

      // After pause no one can deposit, withdraw, or transfer
      // and only function that have the onlyOwner and whenNotPaused modifier can be called

      it('Then I can unpause the account', async () => {
        await expect(expenseAccountProxy.unpause())
          .to.emit(expenseAccountProxy, 'Unpaused')
          .withArgs(owner.address)
      })
    })
  })
})

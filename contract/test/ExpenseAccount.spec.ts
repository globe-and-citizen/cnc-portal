import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ExpenseAccount } from '../typechain-types';
import { extendEnvironment } from 'hardhat/config';

describe("ExpenseAccount", () => {
  let expenseAccountProxy: ExpenseAccount;

  const deployContract = async (owner: SignerWithAddress) => {
    const ExpenseAccountImplementation = await ethers.getContractFactory("ExpenseAccount");
    expenseAccountProxy = (await upgrades.deployProxy(
      ExpenseAccountImplementation, 
      [], 
      {initializer: "initialize"}
    )) as unknown as ExpenseAccount;
  }

  describe("As CNC Company Founder", () => {
    let owner: SignerWithAddress;
    let withdrawer: SignerWithAddress;
    let imposter: SignerWithAddress;

    context("I want to deploy my Expense Account Smart Contract", () => {
      before(async () => {
        [owner, withdrawer, imposter] = await ethers.getSigners();
        await deployContract(owner)
      })

      it('Then I become the owner of the contract', async () => {
        expect(await expenseAccountProxy.owner()).to.eq(await owner.getAddress())
      })

      it('Then I can deposit into the expense account contract', async () => {
        const amount = ethers.parseEther('100')
        const tx = await owner.sendTransaction({ to: await expenseAccountProxy.getAddress(), value: amount })

        expect(tx).to.changeEtherBalance(expenseAccountProxy, amount)
        await expect(tx).to.emit(expenseAccountProxy, 'NewDeposit').withArgs(owner.address, amount)
      })

      it('Then I can get the smart contract balance', async () => {
        const balance = await expenseAccountProxy.getBalance()
        expect(balance).to.eq(ethers.parseEther('100'))
      })

      it('Then I can set a withdrawal limit', async () => {
        await expenseAccountProxy.setMaxLimit(ethers.parseEther('10'))
        expect(await expenseAccountProxy.maxLimit()).to.eq(ethers.parseEther('10'))
      })

      it('Then I can authorize a user to withdraw from the expense account', async () => {
        await expenseAccountProxy.approveAddress(withdrawer.address)
        expect(await expenseAccountProxy.approvedAddresses(withdrawer.address)).to.eq(true)
      })

      it('Then an authorized user can withdraw from the expense account', async () => {
        const amount = ethers.parseEther('10')
        const tx = await expenseAccountProxy.connect(withdrawer).withdraw(amount)
        await expect(tx).to.emit(expenseAccountProxy, 'NewWithdrawal').withArgs(withdrawer.address, amount)
      })

      it('Then a user cannot withdraw more than the set limit', async () => {
        const amount = ethers.parseEther('15')
        await expect(expenseAccountProxy.connect(withdrawer).withdraw(amount))
          .to
          .be
          .revertedWith('Max limit exceeded')
      })

      it('Then I can unauthorize a user', async () => {
        await expenseAccountProxy.disapproveAddress(withdrawer.address)
        expect(await expenseAccountProxy.approvedAddresses(withdrawer.address)).to.eq(false)
      })

      it('Then an unauthorized user cannot withdraw', async () => {
        await expect(expenseAccountProxy.connect(withdrawer).withdraw(ethers.parseEther('5')))
          .to
          .be
          .revertedWith('Withdrawer not approved')
      })

      it('Then I can pause the account', async () => {
        await expect(expenseAccountProxy.pause())
          .to
          .emit(expenseAccountProxy, 'Paused')
          .withArgs(owner.address)
      })

      it('Then I can unpause the account', async () => {
        await expect(expenseAccountProxy.unpause())
          .to
          .emit(expenseAccountProxy, 'Unpaused')
          .withArgs(owner.address)
      })
    })
  })
})
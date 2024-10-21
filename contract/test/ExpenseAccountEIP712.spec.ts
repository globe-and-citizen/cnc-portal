import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ExpenseAccountEIP712 } from '../typechain-types';

describe("ExpenseAccount (EIP712)", () => {
  let expenseAccountProxy: ExpenseAccountEIP712;

  const deployContract = async (owner: SignerWithAddress) => {
    const ExpenseAccountImplementation = await ethers.getContractFactory("ExpenseAccountEIP712");
    expenseAccountProxy = (await upgrades.deployProxy(
      ExpenseAccountImplementation, 
      [], 
      {initializer: "initialize"}
    )) as unknown as ExpenseAccountEIP712;
  }

  describe("As CNC Company Founder", () => {
    let owner: SignerWithAddress;
    let withdrawer: SignerWithAddress;
    let imposter: SignerWithAddress;
    const DOMAIN_NAME = "CNCExpenseAccount";
    const DOMAIN_VERSION = "1";
    let chainId: bigint;
    let verifyingContract: string;
    let domain: {
      name: string,
      version: string,
      chainId: bigint,
      verifyingContract: string
    }
    let types: {
      [key: string]: Array<{name: string, type: string}>
    }

    context("I want to deploy my Expense Account Smart Contract", () => {
      before(async () => {
        [owner, withdrawer, imposter] = await ethers.getSigners();
        await deployContract(owner)
        chainId = (await ethers.provider.getNetwork()).chainId
        verifyingContract = await expenseAccountProxy.getAddress()
      })

      it('Then I become the owner of the contract', async () => {
        expect(await expenseAccountProxy.owner()).to.eq(await owner.getAddress())
      })

      it('Then I can deposit into the expense account contract', async () => {
        const amount = ethers.parseEther('100')
        const tx = await owner.sendTransaction({ to: await expenseAccountProxy.getAddress(), value: amount })

        expect(tx).to.changeEtherBalance(expenseAccountProxy, amount)
        expect(tx).to.emit(expenseAccountProxy, 'NewDeposit').withArgs(owner.address, amount)
      })

      describe('Then I can authorize a user to withdraw from the expense account by;', async () => {
        beforeEach(async () => {
          domain = {
            name: DOMAIN_NAME,
            version: DOMAIN_VERSION,
            chainId,
            verifyingContract
          };

          types = {
              BudgetLimit: [
                  { name: "approvedAddress", type: "address" },
                  { name: "budgetType", type: "uint8" },
                  { name: "value", type: "uint256" },
                  { name: "expiry", type: "uint256" }
              ]
          };

          const balance = await expenseAccountProxy.getBalance()
          //console.log('\tcontract balance: ', balance)
        })
        it('transactions per period', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 0, // TransactionsPerPeriod
            value: 10,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          };

          const signature = await owner.signTypedData(domain, types, budgetLimit);
          const { v, r, s } = ethers.Signature.from(signature);
          const amount = ethers.parseEther('5');
          const tx = await expenseAccountProxy.connect(withdrawer).withdraw(amount, budgetLimit, v, r, s);

          const receipt = await tx.wait()

          console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

          // Try to exceed the transaction limit
          expect(tx).to.changeEtherBalance(expenseAccountProxy, amount)
          expect(tx).to.emit(expenseAccountProxy, 'NewWithdrawl').withArgs(withdrawer.address, 1)
        })
        it('amount per period', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 1, // AmountPerPeriod
            value: ethers.parseEther("10"),
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          };

          const signature = await owner.signTypedData(domain, types, budgetLimit);
          const { v, r, s } = ethers.Signature.from(signature);
          const amount = ethers.parseEther('5');
          const tx = await expenseAccountProxy.connect(withdrawer).withdraw(amount, budgetLimit, v, r, s);

          const receipt = await tx.wait()

          console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

          // Try to exceed the transaction limit
          //expect(tx).to.changeEtherBalance(expenseAccountProxy, amount)
          expect(withdrawer).to.changeEtherBalance(withdrawer, amount)
        })
        it('amount per transaction', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 2, // AmountPerPeriod
            value: ethers.parseEther("10"),
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          };

          const signature = await owner.signTypedData(domain, types, budgetLimit);
          const { v, r, s } = ethers.Signature.from(signature);
          const amount = ethers.parseEther('5');
          const tx = await expenseAccountProxy.connect(withdrawer).withdraw(amount, budgetLimit, v, r, s);

          const receipt = await tx.wait()

          console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

          // Try to exceed the transaction limit
          //expect(tx).to.changeEtherBalance(expenseAccountProxy, amount)
          expect(withdrawer).to.changeEtherBalance(withdrawer, amount)
        })
      })
    })
  })
})
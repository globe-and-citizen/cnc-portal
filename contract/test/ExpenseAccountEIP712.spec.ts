import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ExpenseAccountEIP712 } from '../typechain-types'

describe('ExpenseAccount (EIP712)', () => {
  let expenseAccountProxy: ExpenseAccountEIP712

  const deployContract = async (owner: SignerWithAddress) => {
    const ExpenseAccountImplementation = await ethers.getContractFactory('ExpenseAccountEIP712')
    expenseAccountProxy = (await upgrades.deployProxy(
      ExpenseAccountImplementation, 
      [owner.address], 
      {initializer: 'initialize'}
    )) as unknown as ExpenseAccountEIP712
  }

  describe('As CNC Company Founder', () => {
    let owner: SignerWithAddress
    let withdrawer: SignerWithAddress
    let imposter: SignerWithAddress
    const DOMAIN_NAME = 'CNCExpenseAccount'
    const DOMAIN_VERSION = '1'
    let chainId: bigint
    let verifyingContract: string
    let domain: {
      name: string
      version: string
      chainId: bigint
      verifyingContract: string
    }
    let types: {
      [key: string]: Array<{ name: string; type: string }>
    }

    context('I want to deploy my Expense Account Smart Contract', () => {
      before(async () => {
        ;[owner, withdrawer, imposter] = await ethers.getSigners()
        await deployContract(owner)
        chainId = (await ethers.provider.getNetwork()).chainId
        verifyingContract = await expenseAccountProxy.getAddress()

        domain = {
          name: DOMAIN_NAME,
          version: DOMAIN_VERSION,
          chainId,
          verifyingContract
        }

        types = {
          BudgetLimit: [
            { name: 'approvedAddress', type: 'address' },
            { name: 'budgetType', type: 'uint8' },
            { name: 'value', type: 'uint256' },
            { name: 'expiry', type: 'uint256' }
          ]
        }
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

        await expect(tx).to.changeEtherBalance(expenseAccountProxy, amount)
        await expect(tx).to.emit(expenseAccountProxy, 'Deposited').withArgs(owner.address, amount)
      })

      it('Then I can get the contract balance', async () => {
        const balance = await expenseAccountProxy.getBalance()
        expect(balance).to.be.equal(ethers.parseEther('100'))
      })

      describe('Then I can authorize a user to transfer from the expense account by;', async () => {
        // beforeEach(async () => {
        //   domain = {
        //     name: DOMAIN_NAME,
        //     version: DOMAIN_VERSION,
        //     chainId,
        //     verifyingContract
        //   }

        //   types = {
        //     BudgetLimit: [
        //       { name: 'approvedAddress', type: 'address' },
        //       { name: 'budgetType', type: 'uint8' },
        //       { name: 'value', type: 'uint256' },
        //       { name: 'expiry', type: 'uint256' }
        //     ]
        //   }
        // })

        it('transactions per period', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 0, // TransactionsPerPeriod
            value: 10,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }
          const digest = ethers.TypedDataEncoder.hash(domain, types, budgetLimit)

          const beforeTxCount = (await expenseAccountProxy.balances(digest)).transactionCount
          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('5')
          const tx = await expenseAccountProxy
            .connect(withdrawer)
            .transfer(withdrawer.address, amount, budgetLimit, v, r, s)

          const receipt = await tx.wait()

          console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

          // Try to exceed the transaction limit
          await expect(tx).to.changeEtherBalance(withdrawer, amount)
          await expect(tx)
            .to.emit(expenseAccountProxy, 'Transfer')
            .withArgs(withdrawer.address, withdrawer.address, amount)
          const afterTxCount = (await expenseAccountProxy.balances(digest)).transactionCount
          expect(afterTxCount).to.be.equal(beforeTxCount + BigInt(1))
        })

        it('amount per period', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 1, // AmountPerPeriod
            value: ethers.parseEther('10'),
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const digest = ethers.TypedDataEncoder.hash(domain, types, budgetLimit)

          const beforeAmountWithdrawn = (await expenseAccountProxy.balances(digest)).amountWithdrawn

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('5')
          const tx = await expenseAccountProxy
            .connect(withdrawer)
            .transfer(withdrawer.address, amount, budgetLimit, v, r, s)

          const receipt = await tx.wait()

          console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

          await expect(tx).to.changeEtherBalance(withdrawer, amount)
          await expect(tx)
            .to.emit(expenseAccountProxy, 'Transfer')
            .withArgs(withdrawer.address, withdrawer.address, amount)
          const afterAmountWithdrawn = (await expenseAccountProxy.balances(digest)).amountWithdrawn
          expect(afterAmountWithdrawn).to.be.equal(beforeAmountWithdrawn + amount)
        })

        it('amount per transaction', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 2, // AmountPerTransaction
            value: ethers.parseEther('10'),
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('5')
          const tx = await expenseAccountProxy
            .connect(withdrawer)
            .transfer(withdrawer.address, amount, budgetLimit, v, r, s)

          const receipt = await tx.wait()

          console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

          // Try to exceed the transaction limit
          await expect(tx).to.changeEtherBalance(withdrawer, amount)
          await expect(tx)
            .to.emit(expenseAccountProxy, 'Transfer')
            .withArgs(withdrawer.address, withdrawer.address, amount)
        })
      })

      describe("Then a user can't transfer if;", () => {
        it('the signer is not the contract owner', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 2, // AmountPerTransaction
            value: ethers.parseEther('10'),
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await imposter.signTypedData(domain, types, budgetLimit)
          const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('5')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, v, r, s)
          ).to.be.revertedWithCustomError(expenseAccountProxy, 'UnauthorizedAccess')
        })
        it('the total amount transferred exceeds the budget limit', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 1, // AmountPerPeriod
            value: ethers.parseEther('10'),
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('15')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, v, r, s)
          ).to.be.revertedWithCustomError(expenseAccountProxy, 'AuthorizedAmountExceeded')
        })
        it('the amount per transaction exceeds the budget limit', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 2, // AmountPerPeriod
            value: ethers.parseEther('10'),
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('15')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, v, r, s)
          ).to.be.revertedWith('Authorized amount exceeded')
        })
        it('the number of transactions exceed the transaction limit', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 0, // TransactionsPerPeriod
            value: 0,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('5')
          const N = budgetLimit.value + 1
          for (let i = 0; i <= N; i++) {
            if (i < N) {
              await expenseAccountProxy
                .connect(withdrawer)
                .transfer(withdrawer.address, amount, budgetLimit, v, r, s)
              continue
            }
            await expect(
              expenseAccountProxy
                .connect(withdrawer)
                .transfer(withdrawer.address, amount, budgetLimit, v, r, s)
            ).to.be.revertedWith('Transaction limit reached')
          }
        })
        it('the to address is a zero address', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 0, // TransactionsPerPeriod
            value: 0,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('5')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer('0x0000000000000000000000000000000000000000', amount, budgetLimit, v, r, s)
          ).to.be.revertedWith('Address required')
        })
        it('the amount is zero or negative', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 0, // TransactionsPerPeriod
            value: 0,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('0')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, v, r, s)
          ).to.be.revertedWith('Amount must be greater than zero')
        })
        it('the approval has expired', async () => {
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetType: 0, // TransactionsPerPeriod
            value: 0,
            expiry: Math.floor(Date.now() / 1000) - 60 * 60 // 1 hour before now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('5')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, v, r, s)
          ).to.be.revertedWith('Authorization expired')
        })
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

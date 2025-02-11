import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ExpenseAccountEIP712 } from '../typechain-types'
import { MockERC20 } from '../typechain-types'

describe('ExpenseAccount (EIP712)', () => {
  let expenseAccountProxy: ExpenseAccountEIP712
  let mockUSDT: MockERC20
  let mockUSDC: MockERC20

  const deployContract = async (owner: SignerWithAddress) => {
    // Deploy mock tokens first
    const MockToken = await ethers.getContractFactory('MockERC20')
    mockUSDT = await MockToken.deploy('USDT', 'USDT')
    mockUSDC = await MockToken.deploy('USDC', 'USDC')

    const ExpenseAccountImplementation = await ethers.getContractFactory('ExpenseAccountEIP712')
    expenseAccountProxy = (await upgrades.deployProxy(
      ExpenseAccountImplementation,
      [owner.address, await mockUSDT.getAddress(), await mockUSDC.getAddress()],
      { initializer: 'initialize' }
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
          BudgetData: [
            { name: 'budgetType', type: 'uint8' },
            { name: 'value', type: 'uint256' } //,
            //{ name: 'token', type: 'address' }
          ],
          BudgetLimit: [
            { name: 'approvedAddress', type: 'address' },
            { name: 'budgetData', type: 'BudgetData[]' },
            { name: 'expiry', type: 'uint256' },
            { name: 'tokenAddress', type: 'address' }
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
          const budgetData = [{ budgetType: 0, value: 10 }] //, token: ethers.ZeroAddress }]

          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
            tokenAddress: ethers.ZeroAddress
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const signatureHash = ethers.keccak256(signature)
          const beforeTxCount = (await expenseAccountProxy.balances(signatureHash)).transactionCount

          const amount = ethers.parseEther('5')
          const tx = await expenseAccountProxy
            .connect(withdrawer)
            .transfer(withdrawer.address, amount, budgetLimit, signature)

          const receipt = await tx.wait()

          console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

          // Try to exceed the transaction limit
          await expect(tx).to.changeEtherBalance(withdrawer, amount)
          await expect(tx)
            .to.emit(expenseAccountProxy, 'Transfer')
            .withArgs(withdrawer.address, withdrawer.address, amount)
          const afterTxCount = (await expenseAccountProxy.balances(signatureHash)).transactionCount
          expect(afterTxCount).to.be.equal(beforeTxCount + BigInt(1))
        })

        it('amount per period', async () => {
          const budgetData = [
            { budgetType: 1, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          //const digest = ethers.TypedDataEncoder.hash(domain, types, budgetLimit)
          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const signatureHash = ethers.keccak256(signature)
          const beforeAmountWithdrawn = (await expenseAccountProxy.balances(signatureHash))
            .amountWithdrawn

          //const { v, r, s } = ethers.Signature.from(signature)
          const amount = ethers.parseEther('5')
          const tx = await expenseAccountProxy
            .connect(withdrawer)
            .transfer(withdrawer.address, amount, budgetLimit, signature)

          const receipt = await tx.wait()

          console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

          await expect(tx).to.changeEtherBalance(withdrawer, amount)
          await expect(tx)
            .to.emit(expenseAccountProxy, 'Transfer')
            .withArgs(withdrawer.address, withdrawer.address, amount)
          const afterAmountWithdrawn = (await expenseAccountProxy.balances(signatureHash))
            .amountWithdrawn
          expect(afterAmountWithdrawn).to.be.equal(beforeAmountWithdrawn + amount)
        })

        it('amount per transaction', async () => {
          const budgetData = [
            { budgetType: 2, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const signatureHash = ethers.keccak256(signature)

          const beforeAmountWithdrawn = (await expenseAccountProxy.balances(signatureHash))
            .amountWithdrawn

          const amount = ethers.parseEther('5')
          const tx = await expenseAccountProxy
            .connect(withdrawer)
            .transfer(withdrawer.address, amount, budgetLimit, signature)

          const receipt = await tx.wait()

          console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

          // Try to exceed the transaction limit
          await expect(tx).to.changeEtherBalance(withdrawer, amount)
          await expect(tx)
            .to.emit(expenseAccountProxy, 'Transfer')
            .withArgs(withdrawer.address, withdrawer.address, amount)
          const afterAmountWithdrawn = (await expenseAccountProxy.balances(signatureHash))
            .amountWithdrawn
          expect(afterAmountWithdrawn).to.be.equal(beforeAmountWithdrawn + amount)
        })

        it('all limits', async () => {
          const budgetData = [
            { budgetType: 0, value: 10, token: ethers.ZeroAddress },
            { budgetType: 1, value: ethers.parseEther('10') }, //, token: ethers.ZeroAddress },
            { budgetType: 2, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const signatureHash = ethers.keccak256(signature)

          const beforeAmountWithdrawn = (await expenseAccountProxy.balances(signatureHash))
            .amountWithdrawn
          const beforeTxCount = (await expenseAccountProxy.balances(signatureHash)).transactionCount

          const amount = ethers.parseEther('5')
          const tx = await expenseAccountProxy
            .connect(withdrawer)
            .transfer(withdrawer.address, amount, budgetLimit, signature)

          const receipt = await tx.wait()

          console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

          // Try to exceed the transaction limit
          await expect(tx).to.changeEtherBalance(withdrawer, amount)
          await expect(tx)
            .to.emit(expenseAccountProxy, 'Transfer')
            .withArgs(withdrawer.address, withdrawer.address, amount)
          const afterAmountWithdrawn = (await expenseAccountProxy.balances(signatureHash))
            .amountWithdrawn
          const afterTxCount = (await expenseAccountProxy.balances(signatureHash)).transactionCount
          expect(afterAmountWithdrawn).to.be.equal(beforeAmountWithdrawn + amount)
          expect(afterTxCount).to.be.equal(beforeTxCount + BigInt(1))
        })
      })

      describe("Then a user can't transfer if;", () => {
        it('the signer is not the contract owner', async () => {
          const budgetData = [
            { budgetType: 0, value: 10, token: ethers.ZeroAddress },
            { budgetType: 1, value: ethers.parseEther('10') }, // token: ethers.ZeroAddress },
            { budgetType: 2, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await imposter.signTypedData(domain, types, budgetLimit)

          const amount = ethers.parseEther('5')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, signature)
          ).to.be.revertedWithCustomError(expenseAccountProxy, 'UnauthorizedAccess')
        })
        it('the amount per period exceeds the budget limit', async () => {
          const budgetData = [
            { budgetType: 0, value: 10, token: ethers.ZeroAddress },
            { budgetType: 2, value: ethers.parseEther('20') }, //token: ethers.ZeroAddress },
            { budgetType: 1, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const amount = ethers.parseEther('15')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, signature)
          ).to.be.revertedWithCustomError(expenseAccountProxy, 'AmountPerPeriodExceeded')
        })
        it('the amount per transaction exceeds the budget limit', async () => {
          const budgetData = [
            { budgetType: 0, value: 10, token: ethers.ZeroAddress },
            { budgetType: 1, value: ethers.parseEther('50') }, // token: ethers.ZeroAddress },
            { budgetType: 2, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const amount = ethers.parseEther('15')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, signature)
          ).to.be.revertedWithCustomError(expenseAccountProxy, 'AmountPerTransactionExceeded')
        })
        it('the number of transactions exceed the transaction limit', async () => {
          const budgetData = [
            { budgetType: 0, value: 1, token: ethers.ZeroAddress },
            { budgetType: 1, value: ethers.parseEther('50') }, // token: ethers.ZeroAddress },
            { budgetType: 2, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const amount = ethers.parseEther('5')
          const N = Number(budgetData[0].value)
          for (let i = 0; i <= N; i++) {
            if (i < N) {
              await expenseAccountProxy
                .connect(withdrawer)
                .transfer(withdrawer.address, amount, budgetLimit, signature)
              continue
            }
          }
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, signature)
          ).to.be.revertedWith('Transaction limit reached')
        })
        it('the budget data is an empty array', async () => {
          //@ts-expect-error test empty array passed to contract
          const budgetData = []
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            //@ts-expect-error test empty array passed to contract
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const amount = ethers.parseEther('20')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, signature)
          ).to.be.revertedWith('Empty budget data')
        })
        it('the budget data contains an invalid type', async () => {
          const budgetData = [
            { budgetType: 4, value: ethers.parseEther('20') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const amount = ethers.parseEther('20')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, signature)
          ).to.be.reverted
        })
        it('the to address is a zero address', async () => {
          const budgetData = [
            { budgetType: 0, value: 1, token: ethers.ZeroAddress },
            { budgetType: 1, value: ethers.parseEther('50') }, // token: ethers.ZeroAddress },
            { budgetType: 2, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const amount = ethers.parseEther('5')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(
                '0x0000000000000000000000000000000000000000',
                amount,
                budgetLimit,
                signature
              )
          ).to.be.revertedWith('Address required')
        })
        it('the amount is zero or negative', async () => {
          const budgetData = [
            { budgetType: 0, value: 1, token: ethers.ZeroAddress },
            { budgetType: 1, value: ethers.parseEther('50') }, // token: ethers.ZeroAddress },
            { budgetType: 2, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const amount = ethers.parseEther('0')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, signature)
          ).to.be.revertedWith('Amount must be greater than zero')
        })
        it('the approval has expired', async () => {
          const budgetData = [
            { budgetType: 0, value: 1, token: ethers.ZeroAddress },
            { budgetType: 1, value: ethers.parseEther('50') }, //, token: ethers.ZeroAddress },
            { budgetType: 2, value: ethers.parseEther('10') } // token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor((Date.now() - 3600) / 1000) // 1 hour from now
          }

          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const amount = ethers.parseEther('5')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, signature)
          ).to.be.revertedWith('Authorization expired')
        })
        it('The approval is deactivated', async () => {
          const budgetData = [
            { budgetType: 1, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
          ]
          const budgetLimit = {
            approvedAddress: withdrawer.address,
            budgetData,
            tokenAddress: ethers.ZeroAddress,
            expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
          }

          //const digest = ethers.TypedDataEncoder.hash(domain, types, budgetLimit)
          const signature = await owner.signTypedData(domain, types, budgetLimit)
          const signatureHash = ethers.keccak256(signature)

          await expect(expenseAccountProxy.deactivateApproval(signatureHash))
            .to.emit(expenseAccountProxy, 'ApprovalDeactivated')
            .withArgs(signatureHash)

          const amount = ethers.parseEther('5')
          await expect(
            expenseAccountProxy
              .connect(withdrawer)
              .transfer(withdrawer.address, amount, budgetLimit, signature)
          ).to.be.revertedWith('Approval inactive')
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
      it('Then I can deactivate the approval', async () => {
        const budgetData = [
          { budgetType: 0, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
        ]
        const budgetLimit = {
          approvedAddress: withdrawer.address,
          budgetData,
          tokenAddress: ethers.ZeroAddress,
          expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
        }

        //const digest = ethers.TypedDataEncoder.hash(domain, types, budgetLimit)
        const signature = await owner.signTypedData(domain, types, budgetLimit)
        const signatureHash = ethers.keccak256(signature)

        await expect(expenseAccountProxy.deactivateApproval(signatureHash))
          .to.emit(expenseAccountProxy, 'ApprovalDeactivated')
          .withArgs(signatureHash)

        const amount = ethers.parseEther('5')
        await expect(
          expenseAccountProxy
            .connect(withdrawer)
            .transfer(withdrawer.address, amount, budgetLimit, signature)
        ).to.be.revertedWith('Approval inactive')
      })
      it('Then I can activate the approval', async () => {
        const budgetData = [
          { budgetType: 0, value: ethers.parseEther('10') } //, token: ethers.ZeroAddress }
        ]
        const budgetLimit = {
          approvedAddress: withdrawer.address,
          budgetData,
          tokenAddress: ethers.ZeroAddress,
          expiry: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
        }

        const signature = await owner.signTypedData(domain, types, budgetLimit)
        const signatureHash = ethers.keccak256(signature)

        await expect(expenseAccountProxy.activateApproval(signatureHash))
          .to.emit(expenseAccountProxy, 'ApprovalActivated')
          .withArgs(signatureHash)

        const beforeTxCount = (await expenseAccountProxy.balances(signatureHash)).transactionCount

        const amount = ethers.parseEther('5')
        const tx = await expenseAccountProxy
          .connect(withdrawer)
          .transfer(withdrawer.address, amount, budgetLimit, signature)

        const receipt = await tx.wait()

        console.log(`\t    Gas used: ${receipt?.gasUsed.toString()}`)

        await expect(tx).to.changeEtherBalance(withdrawer, amount)
        await expect(tx)
          .to.emit(expenseAccountProxy, 'Transfer')
          .withArgs(withdrawer.address, withdrawer.address, amount)
        const afterTxCount = (await expenseAccountProxy.balances(signatureHash)).transactionCount
        expect(afterTxCount).to.be.equal(beforeTxCount + BigInt(1))
      })
    })
  })

  describe('Token functionality', () => {
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

    before(async () => {
      ;[owner, withdrawer, imposter] = await ethers.getSigners()

      // Deploy expense account with token addresses
      const ExpenseAccountImplementation = await ethers.getContractFactory('ExpenseAccountEIP712')
      expenseAccountProxy = (await upgrades.deployProxy(
        ExpenseAccountImplementation,
        [owner.address, await mockUSDT.getAddress(), await mockUSDC.getAddress()],
        { initializer: 'initialize' }
      )) as unknown as ExpenseAccountEIP712

      chainId = (await ethers.provider.getNetwork()).chainId
      verifyingContract = await expenseAccountProxy.getAddress()

      domain = {
        name: DOMAIN_NAME,
        version: DOMAIN_VERSION,
        chainId,
        verifyingContract
      }

      types = {
        BudgetData: [
          { name: 'budgetType', type: 'uint8' },
          { name: 'value', type: 'uint256' } //,
          //{ name: 'token', type: 'address' }
        ],
        BudgetLimit: [
          { name: 'approvedAddress', type: 'address' },
          { name: 'budgetData', type: 'BudgetData[]' },
          { name: 'expiry', type: 'uint256' },
          { name: 'tokenAddress', type: 'address' }
        ]
      }

      // Mint and approve tokens
      await mockUSDT.mint(owner.address, ethers.parseEther('1000'))
      await mockUSDC.mint(owner.address, ethers.parseEther('1000'))
      await mockUSDT.approve(expenseAccountProxy.getAddress(), ethers.parseEther('1000'))
      await mockUSDC.approve(expenseAccountProxy.getAddress(), ethers.parseEther('1000'))
    })

    it('should correctly initialize with token addresses', async () => {
      expect(await expenseAccountProxy.supportedTokens('USDT')).to.equal(
        await mockUSDT.getAddress()
      )
      expect(await expenseAccountProxy.supportedTokens('USDC')).to.equal(
        await mockUSDC.getAddress()
      )
    })

    it('should allow token deposits', async () => {
      const amount = ethers.parseEther('100')

      const tx = await expenseAccountProxy.depositToken(await mockUSDT.getAddress(), amount)

      await expect(tx)
        .to.emit(expenseAccountProxy, 'TokenDeposited')
        .withArgs(owner.address, await mockUSDT.getAddress(), amount)

      expect(await expenseAccountProxy.getTokenBalance(await mockUSDT.getAddress())).to.equal(
        amount
      )
    })

    it('should allow token transfers with valid budget limits', async () => {
      const amount = ethers.parseEther('10')
      const budgetData = [
        { budgetType: 0, value: 10 }, // token: await mockUSDT.getAddress() },
        { budgetType: 1, value: ethers.parseEther('50') }, // token: await mockUSDT.getAddress() },
        { budgetType: 2, value: ethers.parseEther('20') } // token: await mockUSDT.getAddress() }
      ]
      const budgetLimit = {
        approvedAddress: withdrawer.address,
        budgetData,
        tokenAddress: await mockUSDT.getAddress(),
        expiry: Math.floor(Date.now() / 1000) + 60 * 60
      }

      const signature = await owner.signTypedData(domain, types, budgetLimit)

      const tx = await expenseAccountProxy.connect(withdrawer).transfer(
        /*Token*/ withdrawer.address,
        //await mockUSDT.getAddress(),
        amount,
        budgetLimit,
        signature
      )

      await expect(tx)
        .to.emit(expenseAccountProxy, 'TokenTransfer')
        .withArgs(withdrawer.address, withdrawer.address, await mockUSDT.getAddress(), amount)
    })

    it('should allow owner to change token addresses', async () => {
      const newAddress = '0x1234567890123456789012345678901234567890'

      const tx = await expenseAccountProxy.changeTokenAddress('USDT', newAddress)

      await expect(tx)
        .to.emit(expenseAccountProxy, 'TokenAddressChanged')
        .withArgs(owner.address, 'USDT', await mockUSDT.getAddress(), newAddress)

      expect(await expenseAccountProxy.supportedTokens('USDT')).to.equal(newAddress)
    })

    describe('Token transfer restrictions', () => {
      it('should not allow transfers with unsupported tokens', async () => {
        const amount = ethers.parseEther('10')
        const unsupportedToken = '0x9876543210987654321098765432109876543210'
        const budgetData = [
          { budgetType: 1, value: ethers.parseEther('50') } // token: unsupportedToken }
        ]
        const budgetLimit = {
          approvedAddress: withdrawer.address,
          budgetData,
          tokenAddress: unsupportedToken,
          expiry: Math.floor(Date.now() / 1000) + 60 * 60
        }

        const signature = await owner.signTypedData(domain, types, budgetLimit)

        await expect(
          expenseAccountProxy
            .connect(withdrawer)
            .transfer(withdrawer.address, /*unsupportedToken, */ amount, budgetLimit, signature)
        ).to.be.revertedWith('Unsupported token')
      })

      it('should not allow token deposits with unsupported tokens', async () => {
        const amount = ethers.parseEther('100')
        const unsupportedToken = '0x9876543210987654321098765432109876543210'

        await expect(expenseAccountProxy.depositToken(unsupportedToken, amount)).to.be.revertedWith(
          'Unsupported token'
        )
      })

      it('should not allow non-owners to change token addresses', async () => {
        const newAddress = '0x1234567890123456789012345678901234567890'

        await expect(
          expenseAccountProxy.connect(imposter).changeTokenAddress('USDT', newAddress)
        ).to.be.revertedWithCustomError(expenseAccountProxy, 'OwnableUnauthorizedAccount')
      })

      it('should not allow setting invalid token symbols', async () => {
        const newAddress = '0x1234567890123456789012345678901234567890'

        await expect(
          expenseAccountProxy.changeTokenAddress('INVALID', newAddress)
        ).to.be.revertedWith('Invalid token symbol')
      })

      it('should not allow setting zero address as token address', async () => {
        await expect(
          expenseAccountProxy.changeTokenAddress('USDT', ethers.ZeroAddress)
        ).to.be.revertedWith('Address cannot be zero')
      })
    })
  })
})

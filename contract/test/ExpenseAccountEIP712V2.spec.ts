import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ExpenseAccountEIP712 } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { AddressLike } from 'ethers'

describe('ExpenseAccountEIP712V2', function () {
  let owner: SignerWithAddress
  let approvedAddress: SignerWithAddress
  let recipient: SignerWithAddress
  let other: SignerWithAddress

  async function deployExpenseAccountFixture() {
    ;[owner, approvedAddress, recipient, other] = await ethers.getSigners()

    const USDT = await ethers.getContractFactory('MockERC20')
    const usdt = await USDT.deploy('USDT', 'USDT')
    await usdt.waitForDeployment()

    const USDC = await ethers.getContractFactory('MockERC20')
    const usdc = await USDC.deploy('USDC', 'USDC')
    await usdc.waitForDeployment()

    const ExpenseAccount = await ethers.getContractFactory('ExpenseAccountEIP712')
    const expenseAccount = await ExpenseAccount.deploy()
    await expenseAccount.waitForDeployment()

    await expenseAccount.initialize(owner.address, await usdt.getAddress(), await usdc.getAddress())

    // Fund the contract with native tokens
    await owner.sendTransaction({
      to: await expenseAccount.getAddress(),
      value: ethers.parseEther('10')
    })

    // Fund contract with ERC20 tokens
    await usdt.mint(await expenseAccount.getAddress(), ethers.parseEther('10000'))
    await usdc.mint(await expenseAccount.getAddress(), ethers.parseEther('10000'))

    return {
      expenseAccount,
      owner,
      approvedAddress,
      recipient,
      other,
      usdt,
      usdc
    }
  }

  interface CreateBudgetLimitParams {
    amount?: bigint
    frequencyType?: number
    customFrequency?: bigint | number
    startDate?: number
    endDate?: number
    tokenAddress?: string
    approvedAddress: AddressLike
  }

  function createBudgetLimit({
    amount = ethers.parseEther('1000'),
    frequencyType = 3, // Monthly
    customFrequency = 0n,
    startDate = Math.floor(Date.now() / 1000) - 86400, // Started yesterday
    endDate = Math.floor(Date.now() / 1000) + 30 * 86400, // Ends in 30 days
    tokenAddress = ethers.ZeroAddress, // Native token by default
    approvedAddress
  }: CreateBudgetLimitParams) {
    return {
      amount,
      frequencyType,
      customFrequency,
      startDate,
      endDate,
      tokenAddress,
      approvedAddress
    }
  }

  async function createSignature(
    owner: SignerWithAddress,
    budgetLimit: Record<string, unknown>,
    expenseAccount: ExpenseAccountEIP712
  ) {
    const domain = {
      name: 'CNCExpenseAccount',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await expenseAccount.getAddress()
    }

    const types = {
      BudgetLimit: [
        { name: 'amount', type: 'uint256' },
        { name: 'frequencyType', type: 'uint8' },
        { name: 'customFrequency', type: 'uint256' },
        { name: 'startDate', type: 'uint256' },
        { name: 'endDate', type: 'uint256' },
        { name: 'tokenAddress', type: 'address' },
        { name: 'approvedAddress', type: 'address' }
      ]
    }

    const signature = await owner.signTypedData(domain, types, budgetLimit)
    return signature
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { expenseAccount, owner } = await loadFixture(deployExpenseAccountFixture)
      expect(await expenseAccount.owner()).to.equal(owner.address)
    })

    it('Should initialize supported tokens', async function () {
      const { expenseAccount, usdt, usdc } = await loadFixture(deployExpenseAccountFixture)
      expect(await expenseAccount.supportedTokens('USDT')).to.equal(await usdt.getAddress())
      expect(await expenseAccount.supportedTokens('USDC')).to.equal(await usdc.getAddress())
    })
  })

  describe('Native Token Transfers', function () {
    it('Should transfer native tokens with valid signature', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('1'),
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      const initialBalance = await ethers.provider.getBalance(recipient.address)

      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)
      ).to.emit(expenseAccount, 'Transfer')

      const finalBalance = await ethers.provider.getBalance(recipient.address)
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther('0.5'))
    })

    it('Should allow multiple transfers within monthly budget', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('1'),
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      // First transfer
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.3'), budgetLimit, signature)

      // Second transfer in same period
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.3'), budgetLimit, signature)

      // Check total withdrawn
      const signatureHash = ethers.keccak256(signature)
      const expenseBalance = await expenseAccount.expenseBalances(signatureHash)
      expect(expenseBalance.totalWithdrawn).to.equal(ethers.parseEther('0.6'))
    })

    it('Should reset monthly budget for new period', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      // Use future dates to avoid timestamp issues
      const startDate = Date.UTC(2030, 0, 1, 0, 0, 0) / 1000 // Jan 1, 2030
      const endDate = Date.UTC(2030, 2, 1, 0, 0, 0) / 1000 // Mar 1, 2030 (2 months later)

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('1'),
        startDate: startDate,
        endDate: endDate, // Explicitly set endDate to be after startDate
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      // Set time to start date
      await time.setNextBlockTimestamp(startDate)

      // Use full budget in current period
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('1'), budgetLimit, signature)

      // Try to transfer more in same period - should fail
      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('0.1'), budgetLimit, signature)
      ).to.be.revertedWith('Exceeds period budget')

      // Check that we're tracking the correct period
      const expenseBalance = await expenseAccount.expenseBalances(signatureHash)
      const currentPeriod = await expenseAccount.getCurrentPeriod(budgetLimit)
      expect(expenseBalance.lastWithdrawnPeriod).to.equal(currentPeriod)
    })

    it('Should enforce cumulative weekly budget limit', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      // Use future dates to avoid timestamp conflicts
      const mondayTimestamp = Date.UTC(2030, 0, 7, 0, 0, 0) / 1000 // Jan 7, 2030 (Monday)
      const endDate = Date.UTC(2030, 0, 28, 0, 0, 0) / 1000 // Jan 28, 2030

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('1'),
        frequencyType: 2, // Weekly
        startDate: mondayTimestamp,
        endDate: endDate,
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      // Set time to Monday
      await time.setNextBlockTimestamp(mondayTimestamp)

      // First transfer - 0.6 ETH
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.6'), budgetLimit, signature)

      // Second transfer - 0.4 ETH (total 1.0 ETH - at limit)
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.4'), budgetLimit, signature)

      // Third transfer in same week - should fail (exceeds weekly budget)
      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('0.1'), budgetLimit, signature)
      ).to.be.revertedWith('Exceeds period budget')

      // Move to next Monday (new week)
      const nextMonday = Date.UTC(2030, 0, 14, 0, 0, 0) / 1000 // Jan 14, 2030
      await time.setNextBlockTimestamp(nextMonday)

      // Should be able to transfer again in new week (budget resets)
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)
    })
  })

  describe('ERC20 Token Transfers', function () {
    it('Should transfer USDT with valid signature', async function () {
      const { expenseAccount, owner, approvedAddress, recipient, usdt } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('500'),
        tokenAddress: await usdt.getAddress(),
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      const initialBalance = await usdt.balanceOf(recipient.address)

      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('100'), budgetLimit, signature)
      ).to.emit(expenseAccount, 'TokenTransfer')

      const finalBalance = await usdt.balanceOf(recipient.address)
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther('100'))
    })

    it('Should transfer USDC with valid signature', async function () {
      const { expenseAccount, owner, approvedAddress, recipient, usdc } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('300'),
        tokenAddress: await usdc.getAddress(),
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('150'), budgetLimit, signature)
      ).to.emit(expenseAccount, 'TokenTransfer')
    })
  })

  describe('Validation', function () {
    it('Should reject transfer with unsupported token', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      // Create a mock unsupported token
      const UnsupportedToken = await ethers.getContractFactory('MockERC20')
      const unsupportedToken = await UnsupportedToken.deploy('UNSUPPORTED', 'UNSPT')
      await unsupportedToken.waitForDeployment()

      // Fund the contract with the unsupported token
      await unsupportedToken.mint(await expenseAccount.getAddress(), ethers.parseEther('1000'))

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('100'),
        tokenAddress: await unsupportedToken.getAddress(), // Use unsupported token
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('50'), budgetLimit, signature)
      ).to.be.revertedWith('Token not supported')
    })

    it('Should reject transfer from unauthorized spender', async function () {
      const { expenseAccount, owner, approvedAddress, recipient, other } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      await expect(
        expenseAccount
          .connect(other)
          .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)
      ).to.be.revertedWith('Spender not approved')
    })

    it('Should reject transfer with invalid signature', async function () {
      const { expenseAccount, approvedAddress, recipient, other } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        approvedAddress: approvedAddress.address
      })

      const invalidSignature = await createSignature(other, budgetLimit, expenseAccount) // Signed by wrong person

      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, invalidSignature)
      ).to.be.revertedWith('Signer not authorized')
    })

    it('Should reject transfer outside date range', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        startDate: Math.floor(Date.now() / 1000) + 86400, // Starts tomorrow
        endDate: Math.floor(Date.now() / 1000) + 30 * 86400,
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)
      ).to.be.revertedWith('Outside valid date range')
    })

    it('Should reject transfer exceeding single withdrawal limit', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('1'),
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('1.5'), budgetLimit, signature)
      ).to.be.revertedWith('Amount exceeds budget limit')
    })

    it('Should reject one-time transfer exceeding total budget', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('1'),
        frequencyType: 0, // OneTime
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      // Second transfer exceeding total
      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('1.1'), budgetLimit, signature)
      ).to.be.revertedWith('Amount exceeds budget limit')
    })

    it('Should reject one-time transfer if already withdrawn', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('1'),
        frequencyType: 0, // OneTime
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)

      // First transfer - should work
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Second transfer - should fail even if within budget amount
      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)
      ).to.be.revertedWith('One-time budget already used')
    })
  })

  describe('Period Calculations', function () {
    it('Should calculate daily periods correctly', async function () {
      const { expenseAccount } = await loadFixture(deployExpenseAccountFixture)

      // Use future date to avoid epoch issues
      const startDate = Date.UTC(2030, 0, 1, 0, 0, 0) / 1000 // Jan 1, 2030

      const budgetLimit = createBudgetLimit({
        frequencyType: 1, // Daily
        startDate: startDate,
        approvedAddress: approvedAddress.address
      })

      // 1 day after start = period 1
      const period = await expenseAccount.getPeriod(budgetLimit, startDate + 86400)
      expect(period).to.equal(1)
    })

    it('Should calculate weekly periods correctly', async function () {
      const { expenseAccount } = await loadFixture(deployExpenseAccountFixture)

      // Use a known Monday in the future
      const mondayTimestamp = Date.UTC(2030, 0, 7, 0, 0, 0) / 1000 // Jan 7, 2030 (Monday)

      const budgetLimit = createBudgetLimit({
        frequencyType: 2, // Weekly
        startDate: mondayTimestamp,
        approvedAddress: approvedAddress.address
      })

      // 7 days after start = period 1
      const period = await expenseAccount.getPeriod(budgetLimit, mondayTimestamp + 604800)
      expect(period).to.equal(1)
    })

    it('Should calculate monthly periods correctly', async function () {
      const { expenseAccount } = await loadFixture(deployExpenseAccountFixture)

      // Use future dates
      const startDate = Date.UTC(2030, 0, 1, 0, 0, 0) / 1000 // Jan 1, 2030

      const budgetLimit = createBudgetLimit({
        frequencyType: 3, // Monthly
        startDate: startDate,
        approvedAddress: approvedAddress.address
      })

      // March 1, 2030 should be period 2 (Jan=0, Feb=1, Mar=2)
      const march1Timestamp = Date.UTC(2030, 2, 1, 0, 0, 0) / 1000 // Mar 1, 2030
      const period = await expenseAccount.getPeriod(budgetLimit, march1Timestamp)
      expect(period).to.equal(2)
    })
  })
})

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

  describe('isNewPeriod Helper', function () {
    it('Should return false for one-time frequency budgets', async function () {
      const { expenseAccount } = await loadFixture(deployExpenseAccountFixture)

      const budgetLimit = createBudgetLimit({
        frequencyType: 0, // OneTime
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      const isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(false)
    })

    it('Should return true for periodic budgets never withdrawn before', async function () {
      const { expenseAccount, owner, approvedAddress } = await loadFixture(
        deployExpenseAccountFixture
      )

      const budgetLimit = createBudgetLimit({
        frequencyType: 2, // Weekly
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      const isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(true)
    })

    it('Should return true when entering a new weekly period', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      // Start on a specific Monday in the future
      const futureMonday = Date.UTC(2030, 0, 7, 0, 0, 0, 0) / 1000 // Jan 7, 2030 (Monday)

      const budgetLimit = createBudgetLimit({
        frequencyType: 2, // Weekly
        startDate: futureMonday,
        endDate: futureMonday + 14 * 86400, // 2 weeks
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      // Set time to Monday and make a withdrawal
      await time.setNextBlockTimestamp(futureMonday)

      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Should be false (same period)
      let isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(false)

      // Move forward 7 days to next Monday
      await time.increase(7 * 86400)

      // Should be true (new period)
      isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(true)
    })

    it('Should return true when entering a new monthly period', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      // Start on January 15th, 2030
      const jan15Timestamp = Date.UTC(2030, 0, 15, 0, 0, 0, 0) / 1000 // Jan 15, 2030
      const feb1Timestamp = Date.UTC(2030, 1, 1, 0, 0, 0, 0) / 1000 // Feb 1, 2030

      const budgetLimit = createBudgetLimit({
        frequencyType: 3, // Monthly
        startDate: jan15Timestamp,
        endDate: feb1Timestamp + 30 * 86400,
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      // Set time to January 15th and make a withdrawal
      await time.setNextBlockTimestamp(jan15Timestamp)

      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Should be false (same period - January)
      let isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(false)

      // Calculate days from Jan 15 to Feb 1
      const daysToFeb1 = Math.floor((feb1Timestamp - jan15Timestamp) / 86400)
      await time.increase(daysToFeb1 * 86400)

      // Should be true (new period - February)
      isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(true)
    })

    it('Should handle daily frequency periods', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      const startTime = await time.latest()
      const budgetLimit = createBudgetLimit({
        frequencyType: 1, // Daily
        startDate: startTime,
        endDate: startTime + 7 * 86400, // 7 days
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      // Make initial withdrawal
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Should be false (same day)
      let isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(false)

      // Move forward 1 day
      await time.increase(86400)

      // Should be true (new day)
      isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(true)
    })

    it('Should handle custom frequency periods', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      const startTime = await time.latest()
      const customFrequency = 3600 // 1 hour

      const budgetLimit = createBudgetLimit({
        frequencyType: 4, // Custom
        customFrequency: customFrequency,
        startDate: startTime,
        endDate: startTime + 24 * customFrequency, // 24 hours
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      // Make initial withdrawal
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Should be false (same 1-hour period)
      let isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(false)

      // Move forward 1 hour
      await time.increase(customFrequency)

      // Should be true (new 1-hour period)
      isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(true)
    })

    it('Should return false when still in same period after time passes but before period boundary', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      // Start on Monday
      const mondayTimestamp = 2000000000 // Future Monday
      const budgetLimit = createBudgetLimit({
        frequencyType: 2, // Weekly
        startDate: mondayTimestamp,
        endDate: mondayTimestamp + 14 * 86400,
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      // Set time to Monday and make a withdrawal
      await time.setNextBlockTimestamp(mondayTimestamp)
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Move forward 3 days (Wednesday) - still same week
      await time.increase(3 * 86400)

      // Should still be false (same weekly period)
      const isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(false)
    })

    it('Should work correctly with multiple withdrawals in same period', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      const startTime = await time.latest()
      const budgetLimit = createBudgetLimit({
        frequencyType: 1, // Daily
        startDate: startTime,
        endDate: startTime + 3 * 86400,
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      // First withdrawal
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.3'), budgetLimit, signature)

      let isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(false)

      // Second withdrawal same day
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.2'), budgetLimit, signature)

      isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(false)

      // Move to next day
      await time.increase(86400)

      // Should be true (new day)
      isNewPeriod = await expenseAccount.isNewPeriod(budgetLimit, signatureHash)
      expect(isNewPeriod).to.equal(true)
    })
  })
})

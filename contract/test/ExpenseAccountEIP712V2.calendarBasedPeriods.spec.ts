import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { ExpenseAccountEIP712 } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { AddressLike } from 'ethers'
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'

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

    // Fund owner with ERC20 tokens
    await usdt.mint(
      /* owner.address */ await expenseAccount.getAddress(),
      ethers.parseEther('10000')
    )
    await usdc.mint(
      /* owner.address */ await expenseAccount.getAddress(),
      ethers.parseEther('10000')
    )

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

  describe('Calendar Period Calculations', function () {
    it('Should reset weekly budget on Monday', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      // Get current time and find the next Monday
      const currentTime = await time.latest()
      const currentDate = new Date(currentTime * 1000)

      // Find the next Monday from current time
      const currentDay = currentDate.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
      const daysUntilMonday = currentDay === 1 ? 0 : currentDay === 0 ? 1 : 8 - currentDay

      const nextMonday = currentTime + daysUntilMonday * 86400

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('1'),
        frequencyType: 2, // Weekly
        startDate: nextMonday,
        endDate: nextMonday + 14 * 86400, // 2 weeks
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      // Set the blockchain time to our test Monday
      await time.setNextBlockTimestamp(nextMonday)

      // Transfer on the same Monday (period 0)
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Check period is 0 (same week)
      const currentPeriod = await expenseAccount.getCurrentPeriod(budgetLimit)
      expect(currentPeriod).to.equal(0)

      // Try to transfer more in same week - should work
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.3'), budgetLimit, signature)

      let expenseBalance = await expenseAccount.expenseBalances(signatureHash)
      expect(expenseBalance.totalWithdrawn).to.equal(ethers.parseEther('0.8'))

      // Move to next Monday (period 1)
      const followingMonday = nextMonday + 7 * 86400
      await time.setNextBlockTimestamp(followingMonday)

      // Should be able to transfer again in new period (budget resets)
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Check that total withdrawn reset for new period
      expenseBalance = await expenseAccount.expenseBalances(signatureHash)
      expect(expenseBalance.totalWithdrawn).to.equal(ethers.parseEther('0.5'))

      // Verify we're now in period 1
      const newPeriod = await expenseAccount.getCurrentPeriod(budgetLimit)
      expect(newPeriod).to.equal(1)
    })

    it('Should reset monthly budget on 1st of month', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      // Use future dates with Date.UTC() to avoid timestamp conflicts
      const midMonthTimestamp = Date.UTC(2030, 0, 15, 0, 0, 0) / 1000 // January 15, 2030 (middle of month)
      const nextMonthTimestamp = Date.UTC(2030, 1, 1, 0, 0, 0) / 1000 // February 1, 2030 (start of next month)
      const endDate = Date.UTC(2030, 2, 1, 0, 0, 0) / 1000 // March 1, 2030 (end date)

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('1'),
        frequencyType: 3, // Monthly
        startDate: midMonthTimestamp,
        endDate: endDate,
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      // Set time to the middle of the month
      await time.setNextBlockTimestamp(midMonthTimestamp)

      // Transfer in the current month (period 0)
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.8'), budgetLimit, signature)

      // Check period is 0 (current month)
      const currentPeriod = await expenseAccount.getCurrentPeriod(budgetLimit)
      expect(currentPeriod).to.equal(0)

      // Verify we can't exceed current month budget
      await expect(
        expenseAccount
          .connect(approvedAddress)
          .transfer(recipient.address, ethers.parseEther('0.3'), budgetLimit, signature)
      ).to.be.revertedWith('Exceeds period budget')

      // Move to 1st of next month (period 1)
      await time.setNextBlockTimestamp(nextMonthTimestamp)

      // Should be able to transfer again in new period (budget resets)
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.7'), budgetLimit, signature)

      // Check that total withdrawn reset for new period
      const expenseBalance = await expenseAccount.expenseBalances(signatureHash)
      expect(expenseBalance.totalWithdrawn).to.equal(ethers.parseEther('0.7'))

      // Verify we're now in period 1 (next month)
      const newPeriod = await expenseAccount.getCurrentPeriod(budgetLimit)
      expect(newPeriod).to.equal(1)
    })

    it('Should handle partial month at start correctly', async function () {
      const { expenseAccount } = await loadFixture(deployExpenseAccountFixture)

      // Use Date.UTC() for all timestamps
      const jan15Timestamp = Date.UTC(2023, 0, 15, 0, 0, 0) / 1000 // January 15, 2023 00:00:00 UTC
      const jan31Timestamp = Date.UTC(2023, 0, 31, 0, 0, 0) / 1000 // January 31, 2023 00:00:00 UTC
      const feb1Timestamp = Date.UTC(2023, 1, 1, 0, 0, 0) / 1000 // February 1, 2023 00:00:00 UTC
      const feb28Timestamp = Date.UTC(2023, 1, 28, 0, 0, 0) / 1000 // February 28, 2023 00:00:00 UTC
      const mar1Timestamp = Date.UTC(2023, 2, 1, 0, 0, 0) / 1000 // March 1, 2023 00:00:00 UTC

      const budgetLimit = createBudgetLimit({
        frequencyType: 3, // Monthly
        startDate: jan15Timestamp,
        approvedAddress: approvedAddress.address
      })

      // January 15th should be period 0
      const jan15Period = await expenseAccount.getPeriod(budgetLimit, jan15Timestamp)
      expect(jan15Period).to.equal(0)

      // January 31st should still be period 0
      const jan31Period = await expenseAccount.getPeriod(budgetLimit, jan31Timestamp)
      expect(jan31Period).to.equal(0)

      // February 1st should be period 1
      const feb1Period = await expenseAccount.getPeriod(budgetLimit, feb1Timestamp)
      expect(feb1Period).to.equal(1)

      // February 28th should be period 1
      const feb28Period = await expenseAccount.getPeriod(budgetLimit, feb28Timestamp)
      expect(feb28Period).to.equal(1)

      // March 1st should be period 2
      const mar1Period = await expenseAccount.getPeriod(budgetLimit, mar1Timestamp)
      expect(mar1Period).to.equal(2)
    })

    it('Should handle week boundaries correctly with Monday-based weeks', async function () {
      const { expenseAccount } = await loadFixture(deployExpenseAccountFixture)

      // Use specific known Monday dates with Date.UTC()
      const mondayTimestamp = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000 // January 1, 2024 (Monday) 00:00:00 UTC

      const budgetLimit = createBudgetLimit({
        frequencyType: 2, // Weekly
        startDate: mondayTimestamp,
        approvedAddress: approvedAddress.address
      })

      // Same Monday should be period 0
      const sameDayPeriod = await expenseAccount.getPeriod(budgetLimit, mondayTimestamp)
      expect(sameDayPeriod).to.equal(0)

      // Tuesday should still be period 0
      const tuesdayTimestamp = Date.UTC(2024, 0, 2, 0, 0, 0) / 1000 // January 2, 2024 (Tuesday)
      const tuesdayPeriod = await expenseAccount.getPeriod(budgetLimit, tuesdayTimestamp)
      expect(tuesdayPeriod).to.equal(0)

      // Sunday should still be period 0
      const sundayTimestamp = Date.UTC(2024, 0, 7, 0, 0, 0) / 1000 // January 7, 2024 (Sunday)
      const sundayPeriod = await expenseAccount.getPeriod(budgetLimit, sundayTimestamp)
      expect(sundayPeriod).to.equal(0)

      // Next Monday should be period 1
      const nextMondayTimestamp = Date.UTC(2024, 0, 8, 0, 0, 0) / 1000 // January 8, 2024 (Monday)
      const nextMondayPeriod = await expenseAccount.getPeriod(budgetLimit, nextMondayTimestamp)
      expect(nextMondayPeriod).to.equal(1)

      // Following Sunday should be period 1
      const nextSundayTimestamp = Date.UTC(2024, 0, 14, 0, 0, 0) / 1000 // January 14, 2024 (Sunday)
      const nextSundayPeriod = await expenseAccount.getPeriod(budgetLimit, nextSundayTimestamp)
      expect(nextSundayPeriod).to.equal(1)

      // Monday after that should be period 2
      const thirdMondayTimestamp = Date.UTC(2024, 0, 15, 0, 0, 0) / 1000 // January 15, 2024 (Monday)
      const thirdMondayPeriod = await expenseAccount.getPeriod(budgetLimit, thirdMondayTimestamp)
      expect(thirdMondayPeriod).to.equal(2)
    })

    it('Should handle weekly budget starting mid-week with partial first week', async function () {
      const { expenseAccount, owner, approvedAddress, recipient } = await loadFixture(
        deployExpenseAccountFixture
      )

      // Use future dates to avoid block timestamp issues
      const currentTime = await time.latest()
      const currentDate = new Date(currentTime * 1000)

      // Calculate next Wednesday from current time
      const currentDay = currentDate.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 3 = Wednesday
      const daysUntilWednesday = currentDay <= 3 ? 3 - currentDay : 10 - currentDay
      const nextWednesday = new Date(currentDate)
      nextWednesday.setUTCDate(currentDate.getUTCDate() + daysUntilWednesday)
      nextWednesday.setUTCHours(12, 0, 0, 0) // Wednesday at 12:00:00 UTC

      const wednesdayTimestamp = Math.floor(nextWednesday.getTime() / 1000)

      // Calculate period boundaries
      const startOfWeekMonday = new Date(nextWednesday)
      startOfWeekMonday.setUTCDate(
        nextWednesday.getUTCDate() -
          (nextWednesday.getUTCDay() === 0 ? 6 : nextWednesday.getUTCDay() - 1)
      )
      startOfWeekMonday.setUTCHours(0, 0, 0, 0)
      const startOfWeekMondayTimestamp = Math.floor(startOfWeekMonday.getTime() / 1000)

      const endOfFirstWeekSunday = new Date(startOfWeekMonday)
      endOfFirstWeekSunday.setUTCDate(startOfWeekMonday.getUTCDate() + 6)
      endOfFirstWeekSunday.setUTCHours(23, 59, 59, 0)
      const endOfFirstWeekSundayTimestamp = Math.floor(endOfFirstWeekSunday.getTime() / 1000)

      const nextMondayReset = new Date(startOfWeekMonday)
      nextMondayReset.setUTCDate(startOfWeekMonday.getUTCDate() + 7)
      nextMondayReset.setUTCHours(0, 0, 0, 0)
      const nextMondayResetTimestamp = Math.floor(nextMondayReset.getTime() / 1000)

      const budgetLimit = createBudgetLimit({
        amount: ethers.parseEther('1'),
        frequencyType: 2, // Weekly
        startDate: wednesdayTimestamp,
        endDate: nextMondayResetTimestamp + 14 * 86400, // End 2 weeks after reset
        approvedAddress: approvedAddress.address
      })

      const signature = await createSignature(owner, budgetLimit, expenseAccount)
      const signatureHash = ethers.keccak256(signature)

      // Set time to Wednesday (first partial week)
      await time.setNextBlockTimestamp(wednesdayTimestamp)

      // Should be able to use full budget in first partial week (Wed-Sun)
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Should be able to use remaining budget in same partial week
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Verify total withdrawn for first partial week
      let expenseBalance = await expenseAccount.expenseBalances(signatureHash)
      expect(expenseBalance.totalWithdrawn).to.equal(ethers.parseEther('1'))

      // Move to next Monday (full new week)
      await time.setNextBlockTimestamp(nextMondayResetTimestamp)

      // Should be able to use full budget again in new week (budget resets)
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.5'), budgetLimit, signature)

      // Verify we're in period 1 (second week) and budget reset
      const currentPeriod = await expenseAccount.getCurrentPeriod(budgetLimit)
      expect(currentPeriod).to.equal(1)

      // Should be able to use full budget again in new week (budget resets)
      await expenseAccount
        .connect(approvedAddress)
        .transfer(recipient.address, ethers.parseEther('0.3'), budgetLimit, signature)

      expenseBalance = await expenseAccount.expenseBalances(signatureHash)
      expect(expenseBalance.totalWithdrawn).to.equal(ethers.parseEther('0.8'))
    })

    it('Should handle year boundaries for monthly periods', async function () {
      const { expenseAccount } = await loadFixture(deployExpenseAccountFixture)

      // Use correct UTC timestamps
      const dec15Timestamp = Date.UTC(2030, 11, 15, 0, 0, 0) / 1000 // December 15, 2030 00:00:00 UTC
      const dec31Timestamp = Date.UTC(2030, 11, 31, 0, 0, 0) / 1000 // December 31, 2030 00:00:00 UTC
      const jan1Timestamp = Date.UTC(2031, 0, 1, 0, 0, 0) / 1000 // January 1, 2031 00:00:00 UTC
      const jan31Timestamp = Date.UTC(2031, 0, 31, 0, 0, 0) / 1000 // January 31, 2031 00:00:00 UTC
      const feb1Timestamp = Date.UTC(2031, 1, 1, 0, 0, 0) / 1000 // February 1, 2031 00:00:00 UTC

      const budgetLimit = createBudgetLimit({
        frequencyType: 3, // Monthly
        startDate: dec15Timestamp,
        approvedAddress: approvedAddress.address
      })

      // December 15th should be period 0
      const dec15Period = await expenseAccount.getPeriod(budgetLimit, dec15Timestamp)
      expect(dec15Period).to.equal(0)

      // December 31st should be period 0
      const dec31Period = await expenseAccount.getPeriod(budgetLimit, dec31Timestamp)
      expect(dec31Period).to.equal(0)

      // January 1st, 2031 should be period 1
      const jan1Period = await expenseAccount.getPeriod(budgetLimit, jan1Timestamp)
      expect(jan1Period).to.equal(1)

      // January 31st, 2031 should be period 1
      const jan31Period = await expenseAccount.getPeriod(budgetLimit, jan31Timestamp)
      expect(jan31Period).to.equal(1)

      // February 1st, 2031 should be period 2
      const feb1Period = await expenseAccount.getPeriod(budgetLimit, feb1Timestamp)
      expect(feb1Period).to.equal(2)
    })

    it('Should handle exact start of month for monthly periods', async function () {
      const { expenseAccount } = await loadFixture(deployExpenseAccountFixture)

      // Use correct UTC timestamps
      const feb1Timestamp = Date.UTC(2023, 1, 1, 0, 0, 0) / 1000 // February 1, 2023 00:00:00 UTC
      const feb28Timestamp = Date.UTC(2023, 1, 28, 0, 0, 0) / 1000 // February 28, 2023 00:00:00 UTC
      const mar1Timestamp = Date.UTC(2023, 2, 1, 0, 0, 0) / 1000 // March 1, 2023 00:00:00 UTC

      const budgetLimit = createBudgetLimit({
        frequencyType: 3, // Monthly
        startDate: feb1Timestamp,
        approvedAddress: approvedAddress.address
      })

      // February 1st should be period 0
      const feb1Period = await expenseAccount.getPeriod(budgetLimit, feb1Timestamp)
      expect(feb1Period).to.equal(0)

      // February 28th should be period 0
      const feb28Period = await expenseAccount.getPeriod(budgetLimit, feb28Timestamp)
      expect(feb28Period).to.equal(0)

      // March 1st should be period 1
      const mar1Period = await expenseAccount.getPeriod(budgetLimit, mar1Timestamp)
      expect(mar1Period).to.equal(1)
    })
  })
})

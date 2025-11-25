import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { FeeCollector } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('FeeCollector', () => {
  let feeCollector: FeeCollector
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress

  const ERRORS = {
    OWNER_ZERO: 'Owner is zero',
    EMPTY_TYPE: 'Empty type',
    INVALID_BPS: 'Invalid BPS',
    DUPLICATE_TYPE: 'Duplicate contractType',
    INSUFFICIENT_BALANCE: 'Insufficient balance',
    WITHDRAWAL_FAILED: ' withdrawal failed',
    UNAUTHORIZED: 'OwnableUnauthorizedAccount'
  } as const

  const INITIAL_CONFIGS = [
    { contractType: 'BANK', feeBps: 50 }, // 0.5%
    { contractType: 'CASH_REMUNERATION', feeBps: 100 }, // 1%
    { contractType: 'EXPENSE_ACCOUNT', feeBps: 75 } // 0.75%
  ]

  async function deployFeeCollector(configs = INITIAL_CONFIGS) {
    const FeeCollectorFactory = await ethers.getContractFactory('FeeCollector')
    return (await upgrades.deployProxy(FeeCollectorFactory, [owner.address, configs], {
      initializer: 'initialize'
    })) as unknown as FeeCollector
  }

  describe('Initialization', () => {
    beforeEach(async () => {
      ;[owner, user1, user2] = await ethers.getSigners()
    })

    it('should initialize correctly with valid configs', async () => {
      feeCollector = await deployFeeCollector()

      expect(await feeCollector.owner()).to.equal(owner.address)
      expect(await feeCollector.getBalance()).to.equal(0)

      const configs = await feeCollector.getAllFeeConfigs()
      expect(configs.length).to.equal(3)
      expect(configs[0].contractType).to.equal('BANK')
      expect(configs[0].feeBps).to.equal(50)
      expect(configs[1].contractType).to.equal('CASH_REMUNERATION')
      expect(configs[1].feeBps).to.equal(100)
      expect(configs[2].contractType).to.equal('EXPENSE_ACCOUNT')
      expect(configs[2].feeBps).to.equal(75)
    })

    it('should reject zero address as owner', async () => {
      const FeeCollectorFactory = await ethers.getContractFactory('FeeCollector')

      await expect(
        upgrades.deployProxy(FeeCollectorFactory, [ethers.ZeroAddress, INITIAL_CONFIGS], {
          initializer: 'initialize'
        })
      ).to.be.revertedWith(ERRORS.OWNER_ZERO)
    })

    it('should reject empty contract type', async () => {
      const invalidConfigs = [
        { contractType: '', feeBps: 50 },
        { contractType: 'BANK', feeBps: 100 }
      ]

      const FeeCollectorFactory = await ethers.getContractFactory('FeeCollector')

      await expect(
        upgrades.deployProxy(FeeCollectorFactory, [owner.address, invalidConfigs], {
          initializer: 'initialize'
        })
      ).to.be.revertedWith(ERRORS.EMPTY_TYPE)
    })

    it('should reject invalid BPS (> 10000)', async () => {
      const invalidConfigs = [
        { contractType: 'BANK', feeBps: 50 },
        { contractType: 'INVALID', feeBps: 10001 } // Invalid: > 100%
      ]

      const FeeCollectorFactory = await ethers.getContractFactory('FeeCollector')

      await expect(
        upgrades.deployProxy(FeeCollectorFactory, [owner.address, invalidConfigs], {
          initializer: 'initialize'
        })
      ).to.be.revertedWith(ERRORS.INVALID_BPS)
    })

    it('should reject duplicate contract types', async () => {
      const duplicateConfigs = [
        { contractType: 'BANK', feeBps: 50 },
        { contractType: 'BANK', feeBps: 100 } // Duplicate
      ]

      const FeeCollectorFactory = await ethers.getContractFactory('FeeCollector')

      await expect(
        upgrades.deployProxy(FeeCollectorFactory, [owner.address, duplicateConfigs], {
          initializer: 'initialize'
        })
      ).to.be.revertedWith(ERRORS.DUPLICATE_TYPE)
    })

    it('should allow initialization with empty configs array', async () => {
      feeCollector = await deployFeeCollector([])

      expect(await feeCollector.owner()).to.equal(owner.address)
      const configs = await feeCollector.getAllFeeConfigs()
      expect(configs.length).to.equal(0)
    })

    it('should not allow reinitialization', async () => {
      feeCollector = await deployFeeCollector()

      await expect(feeCollector.initialize(owner.address, [])).to.be.reverted
    })

    it('should accept maximum valid BPS (10000 = 100%)', async () => {
      const maxBpsConfigs = [{ contractType: 'MAX_FEE', feeBps: 10000 }]

      feeCollector = await deployFeeCollector(maxBpsConfigs)

      expect(await feeCollector.getFeeFor('MAX_FEE')).to.equal(10000)
    })

    it('should accept zero BPS', async () => {
      const zeroBpsConfigs = [{ contractType: 'NO_FEE', feeBps: 0 }]

      feeCollector = await deployFeeCollector(zeroBpsConfigs)

      expect(await feeCollector.getFeeFor('NO_FEE')).to.equal(0)
    })
  })

  describe('Fee Configuration Queries', () => {
    beforeEach(async () => {
      ;[owner, user1, user2] = await ethers.getSigners()
      feeCollector = await deployFeeCollector()
    })

    it('should return correct fee for configured contract types', async () => {
      expect(await feeCollector.getFeeFor('BANK')).to.equal(50)
      expect(await feeCollector.getFeeFor('CASH_REMUNERATION')).to.equal(100)
      expect(await feeCollector.getFeeFor('EXPENSE_ACCOUNT')).to.equal(75)
    })

    it('should return zero for unconfigured contract types', async () => {
      expect(await feeCollector.getFeeFor('UNKNOWN_TYPE')).to.equal(0)
      expect(await feeCollector.getFeeFor('NON_EXISTENT')).to.equal(0)
    })

    it('should return all fee configs correctly', async () => {
      const configs = await feeCollector.getAllFeeConfigs()

      expect(configs.length).to.equal(3)
      expect(configs[0].contractType).to.equal('BANK')
      expect(configs[0].feeBps).to.equal(50)
      expect(configs[1].contractType).to.equal('CASH_REMUNERATION')
      expect(configs[1].feeBps).to.equal(100)
      expect(configs[2].contractType).to.equal('EXPENSE_ACCOUNT')
      expect(configs[2].feeBps).to.equal(75)
    })

    it('should handle case-sensitive contract type lookups', async () => {
      expect(await feeCollector.getFeeFor('BANK')).to.equal(50)
      expect(await feeCollector.getFeeFor('bank')).to.equal(0) // Different case
      expect(await feeCollector.getFeeFor('Bank')).to.equal(0) // Different case
    })

    it('should return empty array when no configs are set', async () => {
      const emptyFeeCollector = await deployFeeCollector([])
      const configs = await emptyFeeCollector.getAllFeeConfigs()

      expect(configs.length).to.equal(0)
    })
  })

  describe('Receiving Native Tokens', () => {
    beforeEach(async () => {
      ;[owner, user1, user2] = await ethers.getSigners()
      feeCollector = await deployFeeCollector()
    })

    it('should accept native token deposits via receive function', async () => {
      const depositAmount = ethers.parseEther('10')

      await expect(async () =>
        owner.sendTransaction({
          to: await feeCollector.getAddress(),
          value: depositAmount
        })
      ).to.changeEtherBalance(feeCollector, depositAmount)

      expect(await feeCollector.getBalance()).to.equal(depositAmount)
    })

    it('should accept multiple deposits from different addresses', async () => {
      const amount1 = ethers.parseEther('5')
      const amount2 = ethers.parseEther('3')
      const amount3 = ethers.parseEther('2')

      await user1.sendTransaction({
        to: await feeCollector.getAddress(),
        value: amount1
      })

      await user2.sendTransaction({
        to: await feeCollector.getAddress(),
        value: amount2
      })

      await owner.sendTransaction({
        to: await feeCollector.getAddress(),
        value: amount3
      })

      const totalAmount = amount1 + amount2 + amount3
      expect(await feeCollector.getBalance()).to.equal(totalAmount)
    })

    it('should accept zero value deposits', async () => {
      await owner.sendTransaction({
        to: await feeCollector.getAddress(),
        value: 0
      })

      expect(await feeCollector.getBalance()).to.equal(0)
    })

    it('should correctly track balance after multiple deposits', async () => {
      const deposits = [
        ethers.parseEther('1'),
        ethers.parseEther('2.5'),
        ethers.parseEther('0.1'),
        ethers.parseEther('5')
      ]

      let expectedTotal = 0n

      for (const amount of deposits) {
        await owner.sendTransaction({
          to: await feeCollector.getAddress(),
          value: amount
        })
        expectedTotal += amount
      }

      expect(await feeCollector.getBalance()).to.equal(expectedTotal)
    })
  })

  describe('Withdrawals', () => {
    beforeEach(async () => {
      ;[owner, user1, user2] = await ethers.getSigners()
      feeCollector = await deployFeeCollector()

      // Fund the contract
      await owner.sendTransaction({
        to: await feeCollector.getAddress(),
        value: ethers.parseEther('100')
      })
    })

    it('should allow owner to withdraw funds', async () => {
      const withdrawAmount = ethers.parseEther('10')
      const initialBalance = await feeCollector.getBalance()

      await expect(() => feeCollector.withdraw(withdrawAmount)).to.changeEtherBalance(
        owner,
        withdrawAmount
      )

      expect(await feeCollector.getBalance()).to.equal(initialBalance - withdrawAmount)
    })

    it('should allow owner to withdraw full balance', async () => {
      const fullBalance = await feeCollector.getBalance()

      await expect(() => feeCollector.withdraw(fullBalance)).to.changeEtherBalance(
        owner,
        fullBalance
      )

      expect(await feeCollector.getBalance()).to.equal(0)
    })

    it('should allow multiple partial withdrawals', async () => {
      const withdrawal1 = ethers.parseEther('30')
      const withdrawal2 = ethers.parseEther('20')
      const withdrawal3 = ethers.parseEther('10')

      await feeCollector.withdraw(withdrawal1)
      await feeCollector.withdraw(withdrawal2)
      await feeCollector.withdraw(withdrawal3)

      const expectedRemaining = ethers.parseEther('100') - withdrawal1 - withdrawal2 - withdrawal3
      expect(await feeCollector.getBalance()).to.equal(expectedRemaining)
    })

    it('should not allow non-owner to withdraw', async () => {
      const withdrawAmount = ethers.parseEther('10')

      await expect(feeCollector.connect(user1).withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(feeCollector, ERRORS.UNAUTHORIZED)
        .withArgs(user1.address)
    })

    it('should not allow withdrawal of more than balance', async () => {
      const contractBalance = await feeCollector.getBalance()
      const excessAmount = contractBalance + ethers.parseEther('1')

      await expect(feeCollector.withdraw(excessAmount)).to.be.revertedWith(
        ERRORS.INSUFFICIENT_BALANCE
      )
    })

    it('should allow withdrawal of zero amount', async () => {
      const initialBalance = await feeCollector.getBalance()

      await feeCollector.withdraw(0)

      expect(await feeCollector.getBalance()).to.equal(initialBalance)
    })

    it('should handle withdrawal when balance is zero', async () => {
      const emptyFeeCollector = await deployFeeCollector()

      await expect(emptyFeeCollector.withdraw(1)).to.be.revertedWith(ERRORS.INSUFFICIENT_BALANCE)
    })
  })

  describe('Balance Tracking', () => {
    beforeEach(async () => {
      ;[owner, user1, user2] = await ethers.getSigners()
      feeCollector = await deployFeeCollector()
    })

    it('should correctly report balance after deposits and withdrawals', async () => {
      // Initial deposit
      await owner.sendTransaction({
        to: await feeCollector.getAddress(),
        value: ethers.parseEther('50')
      })

      expect(await feeCollector.getBalance()).to.equal(ethers.parseEther('50'))

      // Additional deposit
      await user1.sendTransaction({
        to: await feeCollector.getAddress(),
        value: ethers.parseEther('30')
      })

      expect(await feeCollector.getBalance()).to.equal(ethers.parseEther('80'))

      // Partial withdrawal
      await feeCollector.withdraw(ethers.parseEther('20'))

      expect(await feeCollector.getBalance()).to.equal(ethers.parseEther('60'))
    })

    it('should match contract balance with getBalance()', async () => {
      const depositAmount = ethers.parseEther('25')

      await owner.sendTransaction({
        to: await feeCollector.getAddress(),
        value: depositAmount
      })

      const contractBalance = await ethers.provider.getBalance(await feeCollector.getAddress())
      const reportedBalance = await feeCollector.getBalance()

      expect(reportedBalance).to.equal(contractBalance)
      expect(reportedBalance).to.equal(depositAmount)
    })
  })

  // describe.skip('Reentrancy Protection', () => {
  //   beforeEach(async () => {
  //     ;[owner, user1, user2] = await ethers.getSigners()
  //     feeCollector = await deployFeeCollector()
  //   })

  //   it('should prevent reentrancy attacks on withdraw', async () => {
  //     // Deploy a malicious contract that attempts reentrancy
  //     const MaliciousContract = await ethers.getContractFactory('MaliciousReentrancy')
  //     const malicious = await MaliciousContract.deploy()

  //     // Fund the fee collector
  //     await owner.sendTransaction({
  //       to: await feeCollector.getAddress(),
  //       value: ethers.parseEther('10')
  //     })

  //     // Transfer ownership to malicious contract
  //     await feeCollector.transferOwnership(await malicious.getAddress())

  //     // Attempt reentrancy attack
  //     await expect(
  //       malicious.attack(await feeCollector.getAddress(), ethers.parseEther('1'))
  //     ).to.be.revertedWithCustomError(feeCollector, 'ReentrancyGuardReentrantCall')
  //   })
  // })

  describe('Edge Cases', () => {
    beforeEach(async () => {
      ;[owner, user1, user2] = await ethers.getSigners()
    })

    it('should handle large number of fee configurations', async () => {
      const largeConfigs = Array.from({ length: 50 }, (_, i) => ({
        contractType: `TYPE_${i}`,
        feeBps: (i * 10) % 10000
      }))

      feeCollector = await deployFeeCollector(largeConfigs)

      const configs = await feeCollector.getAllFeeConfigs()
      expect(configs.length).to.equal(50)

      expect(await feeCollector.getFeeFor('TYPE_0')).to.equal(0)
      expect(await feeCollector.getFeeFor('TYPE_10')).to.equal(100)
      expect(await feeCollector.getFeeFor('TYPE_49')).to.equal(490)
    })

    it('should handle very small wei amounts', async () => {
      feeCollector = await deployFeeCollector()

      const smallAmount = 1n // 1 wei

      await owner.sendTransaction({
        to: await feeCollector.getAddress(),
        value: smallAmount
      })

      expect(await feeCollector.getBalance()).to.equal(smallAmount)

      await feeCollector.withdraw(smallAmount)
      expect(await feeCollector.getBalance()).to.equal(0)
    })

    it('should handle contract type with special characters', async () => {
      const specialConfigs = [
        { contractType: 'TYPE-WITH-DASH', feeBps: 50 },
        { contractType: 'TYPE_WITH_UNDERSCORE', feeBps: 100 },
        { contractType: 'TYPE.WITH.DOT', feeBps: 150 }
      ]

      feeCollector = await deployFeeCollector(specialConfigs)

      expect(await feeCollector.getFeeFor('TYPE-WITH-DASH')).to.equal(50)
      expect(await feeCollector.getFeeFor('TYPE_WITH_UNDERSCORE')).to.equal(100)
      expect(await feeCollector.getFeeFor('TYPE.WITH.DOT')).to.equal(150)
    })

    it('should handle very long contract type names', async () => {
      const longTypeName = 'A'.repeat(100)
      const longTypeConfigs = [{ contractType: longTypeName, feeBps: 200 }]

      feeCollector = await deployFeeCollector(longTypeConfigs)

      expect(await feeCollector.getFeeFor(longTypeName)).to.equal(200)
    })
  })

  describe('Ownership Transfer', () => {
    beforeEach(async () => {
      ;[owner, user1, user2] = await ethers.getSigners()
      feeCollector = await deployFeeCollector()

      // Fund the contract
      await owner.sendTransaction({
        to: await feeCollector.getAddress(),
        value: ethers.parseEther('50')
      })
    })

    it('should allow new owner to withdraw after ownership transfer', async () => {
      await feeCollector.transferOwnership(user1.address)

      const withdrawAmount = ethers.parseEther('10')

      await expect(() =>
        feeCollector.connect(user1).withdraw(withdrawAmount)
      ).to.changeEtherBalance(user1, withdrawAmount)
    })

    it('should not allow previous owner to withdraw after transfer', async () => {
      await feeCollector.transferOwnership(user1.address)

      await expect(feeCollector.connect(owner).withdraw(ethers.parseEther('10')))
        .to.be.revertedWithCustomError(feeCollector, ERRORS.UNAUTHORIZED)
        .withArgs(owner.address)
    })
  })
})

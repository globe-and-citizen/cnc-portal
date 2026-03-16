import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ExpenseAccountEIP712 } from '../typechain-types'
import { MockERC20 } from '../typechain-types'

describe('ExpenseAccount (EIP712) - Administrative Tests', () => {
  let expenseAccount: ExpenseAccountEIP712
  let mockUSDT: MockERC20
  let mockUSDC: MockERC20
  let owner: SignerWithAddress
  let withdrawer: SignerWithAddress
  let imposter: SignerWithAddress

  const deployContract = async () => {
    // Deploy mock tokens first
    const MockToken = await ethers.getContractFactory('MockERC20')
    mockUSDT = await MockToken.deploy('USDT', 'USDT')
    mockUSDC = await MockToken.deploy('USDC', 'USDC')

    const ExpenseAccountImplementation = await ethers.getContractFactory('ExpenseAccountEIP712')
    expenseAccount = (await upgrades.deployProxy(
      ExpenseAccountImplementation,
      [owner.address, [await mockUSDT.getAddress(), await mockUSDC.getAddress()]],
      { initializer: 'initialize' }
    )) as unknown as ExpenseAccountEIP712
  }

  beforeEach(async () => {
    ;[owner, withdrawer, imposter] = await ethers.getSigners()
    await deployContract()
  })

  describe('Contract Deployment and Ownership', () => {
    it('Should set the right owner', async () => {
      expect(await expenseAccount.owner()).to.equal(owner.address)
    })

    it('Should initialize supported tokens correctly', async () => {
      expect(await expenseAccount.isTokenSupported(await mockUSDT.getAddress())).to.equal(true)
      expect(await expenseAccount.isTokenSupported(await mockUSDC.getAddress())).to.equal(true)
    })
  })

  describe('Native Token Management', () => {
    it('Should allow owner to deposit native tokens', async () => {
      const amount = ethers.parseEther('100')
      const tx = await owner.sendTransaction({
        to: await expenseAccount.getAddress(),
        value: amount
      })

      await expect(tx).to.changeEtherBalance(expenseAccount, amount)
      await expect(tx).to.emit(expenseAccount, 'Deposited').withArgs(owner.address, amount)
    })

    it('Should return correct contract balance', async () => {
      const amount = ethers.parseEther('100')
      await owner.sendTransaction({
        to: await expenseAccount.getAddress(),
        value: amount
      })

      const balance = await expenseAccount.getBalance()
      expect(balance).to.equal(ethers.parseEther('100'))
    })
  })

  describe('Approval State Management', () => {
    let signatureHash: string

    beforeEach(async () => {
      // Create a signature hash for testing approval state
      const budgetLimit = {
        amount: ethers.parseEther('1000'),
        frequencyType: 3, // Monthly
        customFrequency: 0,
        startDate: Math.floor(Date.now() / 1000),
        endDate: Math.floor(Date.now() / 1000) + 86400,
        tokenAddress: ethers.ZeroAddress,
        approvedAddress: withdrawer.address
      }

      const signature = await owner.signTypedData(
        {
          name: 'CNCExpenseAccount',
          version: '1',
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: await expenseAccount.getAddress()
        },
        {
          BudgetLimit: [
            { name: 'amount', type: 'uint256' },
            { name: 'frequencyType', type: 'uint8' },
            { name: 'customFrequency', type: 'uint256' },
            { name: 'startDate', type: 'uint256' },
            { name: 'endDate', type: 'uint256' },
            { name: 'tokenAddress', type: 'address' },
            { name: 'approvedAddress', type: 'address' }
          ]
        },
        budgetLimit
      )

      signatureHash = ethers.keccak256(signature)
    })

    it('Should allow owner to deactivate approval', async () => {
      await expect(expenseAccount.deactivateApproval(signatureHash))
        .to.emit(expenseAccount, 'ApprovalDeactivated')
        .withArgs(signatureHash)

      const expenseBalance = await expenseAccount.expenseBalances(signatureHash)
      expect(expenseBalance.state).to.equal(2) // Inactive state
    })

    it('Should allow owner to activate approval', async () => {
      // First deactivate
      await expenseAccount.deactivateApproval(signatureHash)

      // Then activate
      await expect(expenseAccount.activateApproval(signatureHash))
        .to.emit(expenseAccount, 'ApprovalActivated')
        .withArgs(signatureHash)

      const expenseBalance = await expenseAccount.expenseBalances(signatureHash)
      expect(expenseBalance.state).to.equal(1) // Active state
    })

    it('Should not allow non-owners to manage approvals', async () => {
      await expect(
        expenseAccount.connect(imposter).deactivateApproval(signatureHash)
      ).to.be.revertedWithCustomError(expenseAccount, 'OwnableUnauthorizedAccount')

      await expect(
        expenseAccount.connect(imposter).activateApproval(signatureHash)
      ).to.be.revertedWithCustomError(expenseAccount, 'OwnableUnauthorizedAccount')
    })
  })

  describe('Pause/Unpause Functionality', () => {
    it('Should allow owner to pause the contract', async () => {
      await expect(expenseAccount.pause()).to.emit(expenseAccount, 'Paused').withArgs(owner.address)
    })

    it('Should allow owner to unpause the contract', async () => {
      // First pause
      await expenseAccount.pause()

      // Then unpause
      await expect(expenseAccount.unpause())
        .to.emit(expenseAccount, 'Unpaused')
        .withArgs(owner.address)
    })

    it('Should not allow non-owners to pause/unpause', async () => {
      await expect(expenseAccount.connect(imposter).pause()).to.be.revertedWithCustomError(
        expenseAccount,
        'OwnableUnauthorizedAccount'
      )

      await expect(expenseAccount.connect(imposter).unpause()).to.be.revertedWithCustomError(
        expenseAccount,
        'OwnableUnauthorizedAccount'
      )
    })
  })

  describe('Token Management', () => {
    beforeEach(async () => {
      // Mint and approve tokens for deposit tests
      await mockUSDT.mint(owner.address, ethers.parseEther('1000'))
      await mockUSDC.mint(owner.address, ethers.parseEther('1000'))
      await mockUSDT
        .connect(owner)
        .approve(await expenseAccount.getAddress(), ethers.parseEther('1000'))
      await mockUSDC
        .connect(owner)
        .approve(await expenseAccount.getAddress(), ethers.parseEther('1000'))
    })

    it('Should allow token deposits', async () => {
      const amount = ethers.parseEther('100')

      const tx = await expenseAccount
        .connect(owner)
        .depositToken(await mockUSDT.getAddress(), amount)

      await expect(tx)
        .to.emit(expenseAccount, 'TokenDeposited')
        .withArgs(owner.address, await mockUSDT.getAddress(), amount)

      expect(await expenseAccount.getTokenBalance(await mockUSDT.getAddress())).to.equal(amount)
    })

    it('Should allow owner to add and remove token support', async () => {
      const MockToken = await ethers.getContractFactory('MockERC20')
      const newToken = await MockToken.deploy('NEW', 'NEW')

      await expect(expenseAccount.addTokenSupport(await newToken.getAddress()))
        .to.emit(expenseAccount, 'TokenSupportAdded')
        .withArgs(await newToken.getAddress())

      expect(await expenseAccount.isTokenSupported(await newToken.getAddress())).to.equal(true)

      await expect(expenseAccount.removeTokenSupport(await newToken.getAddress()))
        .to.emit(expenseAccount, 'TokenSupportRemoved')
        .withArgs(await newToken.getAddress())
    })

    it('Should correctly check if token is supported', async () => {
      expect(await expenseAccount.isTokenSupported(await mockUSDT.getAddress())).to.be.true
      expect(await expenseAccount.isTokenSupported(await mockUSDC.getAddress())).to.be.true
      expect(await expenseAccount.isTokenSupported(ethers.ZeroAddress)).to.be.false
      expect(await expenseAccount.isTokenSupported('0x1234567890123456789012345678901234567890')).to
        .be.false
    })

    it('Should return correct token balance', async () => {
      const amount = ethers.parseEther('50')
      await expenseAccount.connect(owner).depositToken(await mockUSDT.getAddress(), amount)

      const balance = await expenseAccount.getTokenBalance(await mockUSDT.getAddress())
      expect(balance).to.equal(amount)
    })

    describe('Token Management Restrictions', () => {
      it('Should not allow deposits with unsupported tokens', async () => {
        const amount = ethers.parseEther('100')
        const unsupportedToken = '0x9876543210987654321098765432109876543210'

        await expect(
          expenseAccount.connect(owner).depositToken(unsupportedToken, amount)
        ).to.be.revertedWith('Unsupported token')
      })

      it('Should not allow zero amount deposits', async () => {
        await expect(
          expenseAccount.connect(owner).depositToken(await mockUSDT.getAddress(), 0)
        ).to.be.revertedWith('Amount must be greater than zero')
      })

      it('Should not allow non-owners to change token addresses', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const newToken = await MockToken.deploy('NEW', 'NEW')

        await expect(
          expenseAccount.connect(imposter).addTokenSupport(await newToken.getAddress())
        ).to.be.revertedWithCustomError(expenseAccount, 'OwnableUnauthorizedAccount')
      })

      it('Should not allow changing to invalid token symbols', async () => {
        await expect(expenseAccount.addTokenSupport(ethers.ZeroAddress)).to.be.revertedWith(
          'Token address cannot be zero'
        )
      })

      it('Should not allow setting zero address as token address', async () => {
        await expect(expenseAccount.removeTokenSupport(ethers.ZeroAddress)).to.be.revertedWith(
          'Token address cannot be zero'
        )
      })
    })
  })
})

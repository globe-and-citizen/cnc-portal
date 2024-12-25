import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Bank, Tips, MockERC20 } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('Bank', () => {
  let bankProxy: Bank
  let tipsProxy: Tips
  let mockUSDT: MockERC20
  let mockUSDC: MockERC20
  let owner: SignerWithAddress
  let contractor: SignerWithAddress
  let member1: SignerWithAddress
  let member2: SignerWithAddress

  async function deployContracts() {
    // Deploy Tips contract
    const TipsImplementation = await ethers.getContractFactory('Tips')
    tipsProxy = (await upgrades.deployProxy(TipsImplementation, [], {
      initializer: 'initialize'
    })) as unknown as Tips

    // Deploy Bank contract
    const BankImplementation = await ethers.getContractFactory('Bank')
    bankProxy = (await upgrades.deployProxy(
      BankImplementation,
      [
        await tipsProxy.getAddress(),
        await mockUSDT.getAddress(),
        await mockUSDC.getAddress(),
        await owner.getAddress()
      ],
      {
        initializer: 'initialize',
        initialOwner: await owner.getAddress()
      }
    )) as unknown as Bank
  }

  describe('As A User (Owner of a wallet/address)', () => {
    beforeEach(async () => {
      ;[owner, contractor, member1, member2] = await ethers.getSigners()

      // Deploy mock tokens
      const MockToken = await ethers.getContractFactory('MockERC20')
      mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
      mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20

      await deployContracts()

      // Mint tokens to owner
      await mockUSDT.mint(owner.address, ethers.parseUnits('1000', 6))
      await mockUSDC.mint(owner.address, ethers.parseUnits('1000', 6))
    })

    context('Deployment', () => {
      it('should set the correct owner and tips address', async () => {
        expect(await bankProxy.owner()).to.eq(await owner.getAddress())
        expect(await bankProxy.tipsAddress()).to.eq(await tipsProxy.getAddress())
      })
    })

    context('Deposits and Transfers', () => {
      it('should allow the owner to deposit and transfer funds', async () => {
        const depositAmount = ethers.parseEther('10')
        const transferAmount = ethers.parseEther('1')

        await expect(async () =>
          owner.sendTransaction({ to: await bankProxy.getAddress(), value: depositAmount })
        ).to.changeEtherBalance(bankProxy, depositAmount)

        const tx = bankProxy.transfer(contractor.address, transferAmount)
        await expect(tx).to.changeEtherBalance(bankProxy, -transferAmount)
        await expect(tx).to.changeEtherBalance(contractor, transferAmount)
      })

      it("should fail when the to adddress is null, the ammount is 0 or the sender doesn't have enough funds", async () => {
        const transferAmount = ethers.parseEther('1')

        // Transfer to null address
        const tx = bankProxy.transfer(ethers.ZeroAddress, transferAmount)
        await expect(tx).to.be.revertedWith('Address cannot be zero')

        // Transfer 0 amount
        const tx2 = bankProxy.transfer(contractor.address, 0)
        await expect(tx2).to.be.revertedWith('Amount must be greater than zero')

        // Transfer more than the sender has
        const tx3 = bankProxy.transfer(contractor.address, ethers.parseEther('100'))
        await expect(tx3).to.be.revertedWith('Failed to transfer')
      })

      it('should allow any address to deposit but not transfer funds', async () => {
        const depositAmount = ethers.parseEther('5')
        const transferAmount = ethers.parseEther('1')

        await expect(async () =>
          member1.sendTransaction({ to: await bankProxy.getAddress(), value: depositAmount })
        ).to.changeEtherBalance(bankProxy, depositAmount)

        await expect(bankProxy.connect(member1).transfer(contractor.address, transferAmount)).to.be
          .reverted
      })
    })

    context('Bank Tips', () => {
      const tipAmount = ethers.parseEther('3')
      const amountPerAddress = ethers.parseEther('1')

      beforeEach(async () => {
        // Fund the bank contract with ETH
        await owner.sendTransaction({
          to: await bankProxy.getAddress(),
          value: ethers.parseEther('10')
        })
      })

      it('should allow the owner to send and push tips', async () => {
        const recipients = [contractor.address, member1.address, member2.address]
        await expect(bankProxy.sendTip(recipients, tipAmount))
          .to.emit(bankProxy, 'SendTip')
          .withArgs(owner.address, recipients, tipAmount)

        const tx = bankProxy.pushTip(recipients, tipAmount)
        await expect(tx).to.changeEtherBalance(bankProxy, -tipAmount)
        await expect(tx).to.changeEtherBalance(contractor, amountPerAddress)
        await expect(tx).to.changeEtherBalance(member1, amountPerAddress)
        await expect(tx).to.changeEtherBalance(member2, amountPerAddress)
      })

      it('should not allow other addresses to send or push tips', async () => {
        const recipients = [contractor.address, member1.address, member2.address]
        await expect(bankProxy.connect(member1).sendTip(recipients, tipAmount)).to.be.reverted
        await expect(bankProxy.connect(member1).pushTip(recipients, tipAmount)).to.be.reverted
      })
    })

    context('Contract Management', () => {
      beforeEach(async () => {
        // Fund the bank contract with ETH
        await owner.sendTransaction({
          to: await bankProxy.getAddress(),
          value: ethers.parseEther('10')
        })
      })

      it('should allow the owner to change tips address, pause, and unpause the contract', async () => {
        const newTipsAddress = (await ethers.getSigners())[4]

        await expect(bankProxy.changeTipsAddress(newTipsAddress.address))
          .to.emit(bankProxy, 'TipsAddressChanged')
          .withArgs(await owner.getAddress(), await tipsProxy.getAddress(), newTipsAddress.address)

        await bankProxy.pause()
        expect(await bankProxy.paused()).to.be.true
        await expect(bankProxy.transfer(contractor.address, ethers.parseEther('1'))).to.be.reverted

        await bankProxy.unpause()
        expect(await bankProxy.paused()).to.be.false
        await expect(bankProxy.transfer(contractor.address, ethers.parseEther('1'))).to.not.be
          .reverted
      })

      it('should not allow other addresses to change tips address, pause, or unpause the contract', async () => {
        const newTipsAddress = (await ethers.getSigners())[5]

        await expect(bankProxy.connect(member1).changeTipsAddress(newTipsAddress.address)).to.be
          .reverted

        await expect(bankProxy.connect(member1).pause()).to.be.reverted
        // Pause the contract
        await bankProxy.pause()
        // Ensure unauthorized user cannot unpause
        await expect(bankProxy.connect(member1).unpause()).to.be.reverted
        // Unpause the contract by an authorized user
        await bankProxy.unpause()
      })

      it('should only allow function execution when not paused', async () => {
        // Pause the contract
        await bankProxy.pause()
        expect(await bankProxy.paused()).to.be.true

        // Attempt to call a function protected by whenNotPaused and expect it to revert
        await expect(bankProxy.transfer(contractor.address, ethers.parseEther('1'))).to.be.reverted

        // Attempt to call sendTip function protected by whenNotPaused and expect it to revert
        const recipients = [contractor.address, member1.address, member2.address]
        const tipAmount = ethers.parseEther('3')
        await expect(bankProxy.sendTip(recipients, tipAmount)).to.be.reverted

        // Attempt to call pushTip function protected by whenNotPaused and expect it to revert
        await expect(bankProxy.pushTip(recipients, tipAmount)).to.be.reverted

        // Attempt to call changeTipsAddress function protected by whenNotPaused and expect it to revert
        const newTipsAddress = (await ethers.getSigners())[4]
        await expect(bankProxy.changeTipsAddress(newTipsAddress.address)).to.be.reverted

        // Unpause the contract
        await bankProxy.unpause()
        expect(await bankProxy.paused()).to.be.false

        // Call the same function again and expect it to succeed
        await expect(bankProxy.transfer(contractor.address, ethers.parseEther('1'))).to.not.be
          .reverted
      })

      it('should not allow to initialize the contract again', async () => {
        const tipsAddress = await tipsProxy.getAddress()
        const ownerAddress = await owner.getAddress()
        await expect(
          bankProxy.initialize(tipsAddress, ethers.ZeroAddress, ethers.ZeroAddress, ownerAddress)
        ).to.be.reverted
      })
    })
  })

  describe('Token Operations', () => {
    beforeEach(async () => {
      ;[owner, contractor, member1, member2] = await ethers.getSigners()

      // Deploy mock tokens
      const MockToken = await ethers.getContractFactory('MockERC20')
      mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
      mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20

      await deployContracts()

      // Mint tokens to owner
      await mockUSDT.mint(owner.address, ethers.parseUnits('1000', 6))
      await mockUSDC.mint(owner.address, ethers.parseUnits('1000', 6))
    })

    context('Token Support', () => {
      it('should correctly identify supported tokens', async () => {
        expect(await bankProxy.isTokenSupported(await mockUSDT.getAddress())).to.be.true
        expect(await bankProxy.isTokenSupported(await mockUSDC.getAddress())).to.be.true
        expect(await bankProxy.isTokenSupported(ethers.ZeroAddress)).to.be.false
      })

      it('should allow owner to change token addresses', async () => {
        const newAddress = member1.address

        await expect(bankProxy.changeTokenAddress('USDT', newAddress))
          .to.emit(bankProxy, 'TokenAddressChanged')
          .withArgs(owner.address, 'USDT', await mockUSDT.getAddress(), newAddress)

        expect(await bankProxy.supportedTokens('USDT')).to.equal(newAddress)
      })

      it('should not allow changing token address to zero address', async () => {
        await expect(bankProxy.changeTokenAddress('USDT', ethers.ZeroAddress)).to.be.revertedWith(
          'Address cannot be zero'
        )
      })

      it('should not allow changing unsupported token symbols', async () => {
        await expect(bankProxy.changeTokenAddress('INVALID', member1.address)).to.be.revertedWith(
          'Invalid token symbol'
        )
      })
    })

    context('Token Deposits and Transfers', () => {
      beforeEach(async () => {
        // Reset token addresses
        await bankProxy.changeTokenAddress('USDT', await mockUSDT.getAddress())
        await bankProxy.changeTokenAddress('USDC', await mockUSDC.getAddress())
      })

      it('should allow depositing supported tokens', async () => {
        const amount = ethers.parseUnits('100', 6)
        await mockUSDT.approve(await bankProxy.getAddress(), amount)

        await expect(bankProxy.depositToken(await mockUSDT.getAddress(), amount))
          .to.emit(bankProxy, 'TokenDeposited')
          .withArgs(owner.address, await mockUSDT.getAddress(), amount)
      })

      it('should not allow depositing unsupported tokens', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const unsupportedToken = (await MockToken.deploy(
          'UNSUPPORTED',
          'UNS'
        )) as unknown as MockERC20

        await expect(
          bankProxy.depositToken(await unsupportedToken.getAddress(), 100)
        ).to.be.revertedWith('Unsupported token')
      })

      it('should allow owner to transfer tokens', async () => {
        const amount = ethers.parseUnits('10', 6)
        await mockUSDT.approve(await bankProxy.getAddress(), amount)
        await bankProxy.depositToken(await mockUSDT.getAddress(), amount)

        await expect(
          bankProxy.transferToken(await mockUSDT.getAddress(), contractor.address, amount)
        )
          .to.emit(bankProxy, 'TokenTransfer')
          .withArgs(owner.address, contractor.address, await mockUSDT.getAddress(), amount)
      })
    })

    context('Token Tips', () => {
      const tipAmount = ethers.parseUnits('30', 6)
      const recipients: string[] = []

      beforeEach(async () => {
        recipients.length = 0
        recipients.push(contractor.address, member1.address, member2.address)

        // Fund bank with tokens
        await mockUSDT.approve(await bankProxy.getAddress(), tipAmount)
        await bankProxy.depositToken(await mockUSDT.getAddress(), tipAmount)
      })

      it('should allow owner to send token tips', async () => {
        await expect(bankProxy.sendTokenTip(recipients, await mockUSDT.getAddress(), tipAmount))
          .to.emit(bankProxy, 'SendTokenTip')
          .withArgs(owner.address, recipients, await mockUSDT.getAddress(), tipAmount)
      })

      it('should allow owner to push token tips', async () => {
        await expect(bankProxy.pushTokenTip(recipients, await mockUSDT.getAddress(), tipAmount))
          .to.emit(bankProxy, 'PushTokenTip')
          .withArgs(owner.address, recipients, await mockUSDT.getAddress(), tipAmount)
      })

      it('should not allow non-owners to send or push token tips', async () => {
        await expect(
          bankProxy
            .connect(member1)
            .sendTokenTip(recipients, await mockUSDT.getAddress(), tipAmount)
        ).to.be.reverted

        await expect(
          bankProxy
            .connect(member1)
            .pushTokenTip(recipients, await mockUSDT.getAddress(), tipAmount)
        ).to.be.reverted
      })

      it('should not allow tips with unsupported tokens', async () => {
        const MockToken = await ethers.getContractFactory('MockERC20')
        const unsupportedToken = (await MockToken.deploy(
          'UNSUPPORTED',
          'UNS'
        )) as unknown as MockERC20

        await expect(
          bankProxy.sendTokenTip(recipients, await unsupportedToken.getAddress(), tipAmount)
        ).to.be.revertedWith('Unsupported token')

        await expect(
          bankProxy.pushTokenTip(recipients, await unsupportedToken.getAddress(), tipAmount)
        ).to.be.revertedWith('Unsupported token')
      })
    })
  })
})

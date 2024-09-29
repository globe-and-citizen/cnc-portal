import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Bank, Tips } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('Bank', () => {
  let bankProxy: Bank
  let tipsProxy: Tips

  async function deployContract(owner: SignerWithAddress) {
    const TipsImplementation = await ethers.getContractFactory('Tips')
    tipsProxy = (await upgrades.deployProxy(TipsImplementation, [], {
      initializer: 'initialize'
    })) as unknown as Tips

    const BankImplementation = await ethers.getContractFactory('Bank')
    bankProxy = (await upgrades.deployProxy(
      BankImplementation,
      [await tipsProxy.getAddress(), await owner.getAddress()],
      {
        initializer: 'initialize',
        initialOwner: await owner.getAddress()
      }
    )) as unknown as Bank
  }

  describe('As A User (Owner of a wallet/address)', () => {
    let owner: SignerWithAddress
    let contractor: SignerWithAddress
    let member1: SignerWithAddress
    let member2: SignerWithAddress

    before(async () => {
      ;[owner, contractor, member1, member2] = await ethers.getSigners()
      await deployContract(owner)
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

      it('should allow the owner to send and push tips', async () => {
        const recipients = [contractor.address, member1.address, member2.address]
        await expect(bankProxy.sendTip(recipients, tipAmount)).to.changeEtherBalance(
          bankProxy,
          -tipAmount
        )
        expect(await tipsProxy.getBalance(contractor.address)).to.equal(amountPerAddress)
        expect(await tipsProxy.getBalance(member1.address)).to.equal(amountPerAddress)
        expect(await tipsProxy.getBalance(member2.address)).to.equal(amountPerAddress)

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
        await expect(bankProxy.initialize(await tipsProxy.getAddress())).to.be.reverted
      })
    })
  })
})

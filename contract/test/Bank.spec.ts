import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Bank, Tips } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe.only('Bank', () => {
  let bankProxy: Bank
  let tipsProxy: Tips

  async function deployContract(owner: SignerWithAddress) {
    const TipsImplementation = await ethers.getContractFactory('Tips')
    tipsProxy = (await upgrades.deployProxy(TipsImplementation, [], {
      initializer: 'initialize'
    })) as unknown as Tips

    const BankImplementation = await ethers.getContractFactory('Bank')
    bankProxy = (await upgrades.deployProxy(BankImplementation, [await tipsProxy.getAddress()], {
      initializer: 'initialize',
      initialOwner: await owner.getAddress()
    })) as unknown as Bank
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

      it('should allow any address to deposit but not transfer funds', async () => {
        const depositAmount = ethers.parseEther('5')
        const transferAmount = ethers.parseEther('1')

        await expect(async () =>
          member1.sendTransaction({ to: await bankProxy.getAddress(), value: depositAmount })
        ).to.changeEtherBalance(bankProxy, depositAmount)

        await expect(
          bankProxy.connect(member1).transfer(contractor.address, transferAmount)
        ).to.be.revertedWith('Ownable: caller is not the owner')
      })
    })

    context('Tips', async () => {
      const tipAmount = ethers.parseEther('3')
      const amountPerAddress = ethers.parseEther('1')
      
      ;[owner, contractor, member1, member2] = await ethers.getSigners()
      
      console.log({contractor, member1, member2})
      const recipients = [contractor.address, member1.address, member2.address]
      // const recipients = []

      it('should allow the owner to send and push tips', async () => {
        await expect(bankProxy.sendTip(recipients, tipAmount))
          .to.changeEtherBalance(bankProxy, -tipAmount)
        expect(await tipsProxy.getBalance(contractor.address)).to.equal(amountPerAddress)
        expect(await tipsProxy.getBalance(member1.address)).to.equal(amountPerAddress)
        expect(await tipsProxy.getBalance(member2.address)).to.equal(amountPerAddress)

        await expect(bankProxy.pushTip(recipients, tipAmount))
          .to.changeEtherBalance(bankProxy, -tipAmount)
          .and.to.changeEtherBalance(contractor, amountPerAddress)
          .and.to.changeEtherBalance(member1, amountPerAddress)
          .and.to.changeEtherBalance(member2, amountPerAddress)
      })

      it('should not allow other addresses to send or push tips', async () => {
        await expect(
          bankProxy.connect(member1).sendTip(recipients, tipAmount)
        ).to.be.revertedWith('Ownable: caller is not the owner')

        await expect(
          bankProxy.connect(member1).pushTip(recipients, tipAmount)
        ).to.be.revertedWith('Ownable: caller is not the owner')
      })
    })

    context('Contract Management', () => {
      it('should allow the owner to change tips address, pause, and unpause the contract', async () => {
        const newTipsAddress = (await ethers.getSigners())[4]

        await expect(bankProxy.changeTipsAddress(newTipsAddress.address))
          .to.emit(bankProxy, 'SetTipsAddress')
          .withArgs(newTipsAddress.address)

        await bankProxy.pause()
        expect(await bankProxy.paused()).to.be.true
        await expect(bankProxy.transfer(contractor.address, ethers.parseEther('1'))).to.be.reverted

        await bankProxy.unpause()
        expect(await bankProxy.paused()).to.be.false
        await expect(bankProxy.transfer(contractor.address, ethers.parseEther('1'))).to.not.be.reverted
      })

      it('should not allow other addresses to change tips address, pause, or unpause the contract', async () => {
        const newTipsAddress = (await ethers.getSigners())[5]

        await expect(
          bankProxy.connect(member1).changeTipsAddress(newTipsAddress.address)
        ).to.be.revertedWith('Ownable: caller is not the owner')

        await expect(bankProxy.connect(member1).pause()).to.be.revertedWith('Ownable: caller is not the owner')

        await bankProxy.pause()
        await expect(bankProxy.connect(member1).unpause()).to.be.revertedWith('Ownable: caller is not the owner')
        await bankProxy.unpause()
      })
    })
  })
})

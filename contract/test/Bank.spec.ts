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
    let otherUser: SignerWithAddress

    context('I want to deploy my Bank Smart Contract', () => {
      before(async () => {
        ;[owner, contractor, member1, member2, otherUser] = await ethers.getSigners()
        await deployContract(owner)
      })

      it('Then I become the owner of the contract', async () => {
        expect(await bankProxy.owner()).to.eq(await owner.getAddress())
      })

      it('Then the address I provide during the bank contract deployment becomes the address of tips contract', async () => {
        expect(await bankProxy.tipsAddress()).to.eq(await tipsProxy.getAddress())
      })

      it('Then I can deposit into the bank contract', async () => {
        const amount = ethers.parseEther('10')
        const tx = await owner.sendTransaction({ to: await bankProxy.getAddress(), value: amount })

        expect(tx).to.changeEtherBalance(bankProxy, amount)
        expect(tx).to.emit(bankProxy, 'Deposit').withArgs(owner.address, amount)
      })

      it('Then I can transfer fund from my bank contract to an address (contractor)', async () => {
        const amount = ethers.parseEther('1')
        const tx = await bankProxy.transfer(contractor.address, amount)

        expect(tx).to.changeEtherBalance(bankProxy, -amount)
        expect(tx).to.changeEtherBalance(contractor, amount)
        expect(tx)
          .to.emit(bankProxy, 'Transfer')
          .withArgs(owner.address, contractor.address, amount)
      })

      it('Then I can send tips to all contractors including team members', async () => {
        const amount = ethers.parseEther('3')
        const amountPerAddress = ethers.parseEther('1')
        const tx = await bankProxy.sendTip(
          [contractor.address, member1.address, member2.address],
          amount
        )

        expect(tx).to.changeEtherBalance(bankProxy, -amount)
        expect(await tipsProxy.getBalance(contractor.address)).to.equal(amountPerAddress)
        expect(await tipsProxy.getBalance(member1.address)).to.equal(amountPerAddress)
        expect(await tipsProxy.getBalance(member2.address)).to.equal(amountPerAddress)
      })

      it('Then I can push tips to all contractors including team members', async () => {
        const amount = ethers.parseEther('3')
        const amountPerAddress = ethers.parseEther('1')
        const tx = await bankProxy.pushTip(
          [contractor.address, member1.address, member2.address],
          amount
        )

        expect(tx).to.changeEtherBalance(bankProxy, -amount)
        expect(tx).to.changeEtherBalance(contractor, amountPerAddress)
        expect(tx).to.changeEtherBalance(member1, amountPerAddress)
        expect(tx).to.changeEtherBalance(member2, amountPerAddress)
      })

      it('Then I can edit tips contract address', async () => {
        const newTipsAddress = (await ethers.getSigners())[4]
        const tx = await bankProxy.changeTipsAddress(newTipsAddress.address)

        expect(tx).to.emit(bankProxy, 'SetTipsAddress').withArgs(newTipsAddress.address)
      })

      it('Then I can pause the contract', async () => {
        await bankProxy.pause()

        expect(await bankProxy.paused()).to.be.true
        await expect(bankProxy.transfer(contractor.address, ethers.parseEther('1'))).to.be.reverted
      })

      it('Then I can unpause the contract', async () => {
        await bankProxy.unpause()

        expect(await bankProxy.paused()).to.be.false
        expect(await bankProxy.transfer(contractor.address, ethers.parseEther('1'))).to.not.be
          .reverted
      })

      it('Then any address can deposit into the bank', async () => {
        const amount = ethers.parseEther('5')
        const tx = await otherUser.sendTransaction({ to: await bankProxy.getAddress(), value: amount })

        expect(tx).to.changeEtherBalance(bankProxy, amount)
        expect(tx).to.emit(bankProxy, 'Deposit').withArgs(otherUser.address, amount)
      })

      it('Then another address cannot transfer funds from the bank', async () => {
        const amount = ethers.parseEther('1')
        await expect(bankProxy.connect(otherUser).transfer(contractor.address, amount)).to.be.revertedWith('Ownable: caller is not the owner')
      })

      it('Then another address cannot send tips', async () => {
        const amount = ethers.parseEther('3')
        await expect(bankProxy.connect(otherUser).sendTip(
          [contractor.address, member1.address, member2.address],
          amount
        )).to.be.revertedWith('Ownable: caller is not the owner')
      })

      it('Then another address cannot push tips', async () => {
        const amount = ethers.parseEther('3')
        await expect(bankProxy.connect(otherUser).pushTip(
          [contractor.address, member1.address, member2.address],
          amount
        )).to.be.revertedWith('Ownable: caller is not the owner')
      })

      it('Then another address cannot change tips address', async () => {
        const newTipsAddress = (await ethers.getSigners())[5]
        await expect(bankProxy.connect(otherUser).changeTipsAddress(newTipsAddress.address)).to.be.revertedWith('Ownable: caller is not the owner')
      })

      it('Then another address cannot pause the contract', async () => {
        await expect(bankProxy.connect(otherUser).pause()).to.be.revertedWith('Ownable: caller is not the owner')
      })

      it('Then another address cannot unpause the contract', async () => {
        await bankProxy.pause()
        await expect(bankProxy.connect(otherUser).unpause()).to.be.revertedWith('Ownable: caller is not the owner')
        await bankProxy.unpause()
      })
    })
  })
})

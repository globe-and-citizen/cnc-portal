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

    context('I want to deploy my Bank Smart Contract', () => {
      before(async () => {
        ;[owner, contractor, member1, member2] = await ethers.getSigners()
        await deployContract(owner)
      })

      it('Then I become the owner of the contract', async () => {
        expect(await bankProxy.owner()).to.eq(await owner.getAddress())
      })

      it('Then the address i provide during the bank contract deployment becomes the address of tips contract', async () => {
        expect(await bankProxy.tipsAddress()).to.eq(await tipsProxy.getAddress())
      })

      // Todo test any address can deposit into the bank, bank owner and simple user
      it('Then I can deposit into the bank contract', async () => {
        const amount = ethers.parseEther('10')
        const tx = await owner.sendTransaction({ to: await bankProxy.getAddress(), value: amount })

        expect(tx).to.changeEtherBalance(bankProxy, amount)
        expect(tx).to.emit(bankProxy, 'Deposit').withArgs(owner.address, amount)
      })

      // TODO: test another addres can't transfer from the bank
      it('Then I can transfer fund from my bank contract to an address (contractor)', async () => {
        const amount = ethers.parseEther('1')
        const tx = await bankProxy.transfer(contractor.address, amount)

        expect(tx).to.changeEtherBalance(bankProxy, -amount)
        expect(tx).to.changeEtherBalance(owner, amount)
        expect(tx)
          .to.emit(bankProxy, 'Transfer')
          .withArgs(owner.address, contractor.address, amount)
      })

      // TODO: test another addres can't send tips
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

      // TODO: test another addres can't push tips
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

      // TODO: test another addres can't change tips address
      it('Then I can edit tips contract address', async () => {
        const newTipsAddress = (await ethers.getSigners())[4]
        const tx = await bankProxy.changeTipsAddress(newTipsAddress.address)

        expect(tx).to.emit(bankProxy, 'SetTipsAddress').withArgs(newTipsAddress.address)
      })

      // TODO: test another addres can't pause the contract
      // and only function that have the onlyOwner and whenNotPaused modifier can be called
      it('Then I can pause the contract', async () => {
        await bankProxy.pause()

        expect(await bankProxy.paused()).to.be.true
        await expect(bankProxy.transfer(contractor.address, ethers.parseEther('1'))).to.be.reverted
      })

      // TODO: test another addres can't unpause the contract
      it('Then I can unpause the contract', async () => {
        await bankProxy.unpause()

        expect(await bankProxy.paused()).to.be.false
        expect(await bankProxy.transfer(contractor.address, ethers.parseEther('1'))).to.not.be
          .reverted
      })
    })
  })
})

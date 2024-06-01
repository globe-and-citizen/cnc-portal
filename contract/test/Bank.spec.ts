import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Bank, Tips } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ContractTransactionResponse } from 'ethers'

describe('Bank', () => {
  let bank: Bank
  let tips: Tips

  async function deployContract(owner: SignerWithAddress) {
    const TipsImpl = await ethers.getContractFactory('Tips')
    tips = (await upgrades.deployProxy(TipsImpl, [], {
      initializer: 'initialize'
    })) as unknown as Tips

    const BankImpl = await ethers.getContractFactory('Bank')
    bank = (await upgrades.deployProxy(BankImpl, [await tips.getAddress()], {
      initializer: 'initialize',
      initialOwner: await owner.getAddress()
    })) as unknown as Bank
  }

  // As a company owner
  // I want to deploy/create a team's bank contract
  // so that I can operate transaction with it
  describe('Deploy a bank contract', () => {
    context("Given an owner and a team's bank contract", () => {
      let owner: SignerWithAddress

      before(async () => {
        owner = (await ethers.getSigners())[0]
      })

      context('When I deploy a bank contract', async () => {
        before(async () => {
          await deployContract(owner)
          expect(await bank.getAddress()).to.be.string
          expect(await tips.getAddress()).to.be.string
          expect(await bank.tipsAddress()).to.eq(await tips.getAddress())
        })

        it('Then I can operate transaction with it', async () => {
          const amount = ethers.parseEther('1')
          const bankAddress = await bank.getAddress()
          await owner.sendTransaction({ to: bankAddress, value: amount })
          expect(await ethers.provider.getBalance(bankAddress)).to.eq(amount)
        })

        it('Then I owned the contract', async () => {
          expect(await bank.owner()).to.eq(await owner.getAddress())
        })
      })
    })
  })

  // As a company owner of a digital service provider.
  // I want to direct money from my online operations to my team’s crypto “bank” account on the CNC portal.
  // When I deposit into my team's bank contract
  // Then I can see funds in the team's bank contract

  describe('Deposit', () => {
    context("Given an owner and a team's bank contract", () => {
      let owner: SignerWithAddress

      before(async () => {
        owner = (await ethers.getSigners())[0]
        await deployContract(owner)
      })
      context('When I deposit into my team’s bank contract', () => {
        it('Then I can see funds in the team’s bank contract', async () => {
          const amount = ethers.parseEther('1')
          const bankAddress = await bank.getAddress()
          await expect(owner.sendTransaction({ to: bankAddress, value: amount }))
            .to.emit(bank, 'Deposited')
            .withArgs(owner.address, amount)
          expect(await ethers.provider.getBalance(bankAddress)).to.eq(amount)
        })
      })
    })
  })

  // As a company owner of a digital service
  // I want to pay a provider through the team’s bank contract (CNC Portal).
  // When I have a service I want to buy
  // Then I can operate transfer operation to a provider company account as payment for the service I'm buying. Using my team's bank contract funds
  describe('Pay Digital Service', () => {
    context("Given an owner and a team's bank contract", () => {
      let owner: SignerWithAddress, digitalService: SignerWithAddress
      before(async () => {
        ;[owner, digitalService] = await ethers.getSigners()
        await deployContract(owner)
      })

      context('When I have a service I want to buy', () => {
        before(async () => {
          const amount = ethers.parseEther('5')
          await owner.sendTransaction({ to: await bank.getAddress(), value: amount })
        })

        it("Then I can operate transfer operation to a provider company account as payment for the service I'm buying. Using my team's bank contract funds", async () => {
          const tx = await bank.transfer(digitalService.address, ethers.parseEther('5'))

          expect(tx).to.emit(bank, 'Transfer')
          expect(tx).to.changeEtherBalance(digitalService, ethers.parseEther('5'))
          expect(tx).to.changeEtherBalance(bank, -ethers.parseEther('5'))
        })
      })
    })
  })

  // As a company owner of a digital service
  // I want to pay my employe
  // When I Send Token to my Employee
  // Then he will receive it in his wallet
  describe('Pay Employee', () => {
    context("Given an owner, employee and a team's bank contract", () => {
      let owner: SignerWithAddress, employee: SignerWithAddress

      before(async () => {
        ;[owner, employee] = await ethers.getSigners()
        await deployContract(owner)
        await owner.sendTransaction({ to: await bank.getAddress(), value: ethers.parseEther('10') })
      })

      context('When I send crypto to my Employee', () => {
        let tx: ContractTransactionResponse
        let amount: bigint

        before(async () => {
          amount = ethers.parseEther('5')
          tx = await bank.transfer(employee.address, amount)
        })

        it('Then he will receive it in his wallet', async () => {
          expect(tx).to.changeEtherBalance(employee, amount)
          expect(tx).to.changeEtherBalance(bank, -amount)
        })
      })
    })
  })

  // As a company owner of a digital service
  // I want to be able to call an external Contract to operate transaction
  // I want to send tips or push tips to my team using the TIPS Smart Contract
  // When I Call send tips or push tips with my team address
  // Then my team members's balance increases.
  describe('Call External Contract', () => {
    context("Given an owner and a team's bank contract", () => {
      let owner: SignerWithAddress, member1: SignerWithAddress, member2: SignerWithAddress

      before(async () => {
        ;[owner, member1, member2] = await ethers.getSigners()
        await deployContract(owner)
        await owner.sendTransaction({ to: await bank.getAddress(), value: ethers.parseEther('12') })
      })

      context('When I call send tips with my team address', () => {
        it("Then my team members' balance increases.", async () => {
          await bank
            .connect(owner)
            .sendTip([member1.address, member2.address], ethers.parseEther('6'))

          expect(await tips.getBalance(member1.address)).to.eq(ethers.parseEther('3'))
          expect(await tips.getBalance(member2.address)).to.eq(ethers.parseEther('3'))
        })
      })

      context('When I call push tips with my team address', () => {
        it("Then my team members' balance increases.", async () => {
          const tx = await bank
            .connect(owner)
            .pushTip([member1.address, member2.address], ethers.parseEther('6'))
          expect(tx).to.changeEtherBalance(member1, ethers.parseEther('3'))
          expect(tx).to.changeEtherBalance(member2, ethers.parseEther('3'))
        })
      })
    })
  })
})

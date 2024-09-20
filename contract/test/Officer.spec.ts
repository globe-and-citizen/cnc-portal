import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { Officer } from '../typechain-types'

describe('Officer Contract', function () {
  let Officer, officer: unknown
  let BankAccount, VotingContract
  let bankAccountBeacon, votingContractBeacon
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress

  this.beforeAll(async function () {
    BankAccount = await ethers.getContractFactory('Bank')
    bankAccountBeacon = await upgrades.deployBeacon(BankAccount)

    VotingContract = await ethers.getContractFactory('Voting')
    votingContractBeacon = await upgrades.deployBeacon(VotingContract)
    ;[owner, addr1, addr2, addr3] = await ethers.getSigners()

    Officer = await ethers.getContractFactory('Officer')
    officer = await upgrades.deployProxy(
      Officer,
      [await bankAccountBeacon.getAddress(), await votingContractBeacon.getAddress()],
      { initializer: 'initialize' }
    )
  })

  it('Should create a new team', async function () {
    const founders = [addr1.address, addr2.address]
    const tx = await (officer as Officer)
      .connect(owner)
      .createTeam(founders, ['0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'])

    await tx.wait()
    const team = await (officer as Officer).getTeam()

    expect(team[0][0]).to.equal(addr1.address)
    expect(team[0][1]).to.equal(addr2.address)
  })
  it('Should deploy the Voting contract via BeaconProxy', async function () {
    await (officer as Officer).connect(owner).deployVotingContract()

    const team = await (officer as Officer).getTeam()
    console.log(team[3])
    expect(team[3]).to.be.not.equal('0x0000000000000000000000000000000000000000')
  })
  it('Should deploy the BankAccount contract via BeaconProxy', async function () {
    await (officer as Officer)
      .connect(owner)
      .deployBankAccount(ethers.Wallet.createRandom().address)

    const team = await (officer as Officer).getTeam()
    expect(team[2]).to.be.not.equal('0x0000000000000000000000000000000000000000')
  })

  it('Should transfer ownership to a new owner', async function () {
    const team = await (officer as Officer).connect(owner).transferOwnershipToBOD(addr1.address)

    const receipt = await team.wait()
    interface TransactionReceipt {
      logs: {
        args: {
          newOwner: string
        }
      }[]
    }

    expect((receipt as unknown as TransactionReceipt).logs[0].args.newOwner).to.equal(addr1.address)
  })

  it('Should fail if non-founder or non-owner tries to deploy and should allow other founders to deploy', async function () {
    BankAccount = await ethers.getContractFactory('Bank')
    bankAccountBeacon = await upgrades.deployBeacon(BankAccount)

    VotingContract = await ethers.getContractFactory('Voting')
    votingContractBeacon = await upgrades.deployBeacon(VotingContract)
    ;[owner, addr1, addr2, addr3] = await ethers.getSigners()

    Officer = await ethers.getContractFactory('Officer')
    officer = await upgrades.deployProxy(
      Officer,
      [await bankAccountBeacon.getAddress(), await votingContractBeacon.getAddress()],
      { initializer: 'initialize' }
    )

    await expect(
      (officer as Officer).connect(addr3).deployBankAccount(ethers.Wallet.createRandom().address)
    ).to.be.revertedWith('You are not authorized to perform this action')
    await (officer as Officer)
      .connect(owner)
      .createTeam([addr1.address, addr2.address], ['0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'])

    await expect(
      (officer as Officer).connect(addr2).deployBankAccount(ethers.Wallet.createRandom().address)
    ).to.emit(officer as Officer, 'ContractDeployed')
  })
})

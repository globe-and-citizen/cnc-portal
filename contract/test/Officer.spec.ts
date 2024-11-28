import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  Bank__factory,
  BoardOfDirectors__factory,
  ExpenseAccount__factory,
  Officer,
  Voting__factory,
  UpgradeableBeacon
} from '../typechain-types'

describe('Officer Contract', function () {
  let Officer, officer: unknown
  let BankAccount, VotingContract, ExpenseAccount, ExpenseAccountEIP712
  let bankAccountBeacon, votingContractBeacon, expenseAccountBeacon, expenseAccountEip712Beacon
  let BoD, bodBeacon
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress

  this.beforeAll(async function () {
    BankAccount = await ethers.getContractFactory('Bank')
    bankAccountBeacon = await upgrades.deployBeacon(BankAccount)

    VotingContract = await ethers.getContractFactory('Voting')
    votingContractBeacon = await upgrades.deployBeacon(VotingContract)

    BoD = await ethers.getContractFactory('BoardOfDirectors')
    bodBeacon = await upgrades.deployBeacon(BoD)

    ExpenseAccount = await ethers.getContractFactory('ExpenseAccount')
    expenseAccountBeacon = await upgrades.deployBeacon(ExpenseAccount)

    ExpenseAccountEIP712 = await ethers.getContractFactory('ExpenseAccountEIP712')
    expenseAccountEip712Beacon = await upgrades.deployBeacon(ExpenseAccountEIP712)
    ;[owner, addr1, addr2, addr3] = await ethers.getSigners()

    Officer = await ethers.getContractFactory('Officer')
    officer = await upgrades.deployProxy(
      Officer,
      [
        await owner.getAddress(),
        await bankAccountBeacon.getAddress(),
        await votingContractBeacon.getAddress(),
        await bodBeacon.getAddress(),
        await expenseAccountBeacon.getAddress(),
        await expenseAccountEip712Beacon.getAddress()
      ],
      { initializer: 'initialize' }
    )
  })

  // Configure beacons
  await officer.connect(owner).configureBeacon('Bank', await bankAccountBeacon.getAddress())
  await officer.connect(owner).configureBeacon('Voting', await votingContractBeacon.getAddress())
  await officer.connect(owner).configureBeacon('BoardOfDirectors', await bodBeacon.getAddress())
  await officer
    .connect(owner)
    .configureBeacon('ExpenseAccount', await expenseAccountBeacon.getAddress())
})

describe('Team Management', () => {
  it('Should create a new team', async function () {
    const founders = [await addr1.getAddress(), await addr2.getAddress()]
    const members = [ethers.Wallet.createRandom().address]

    await expect(officer.connect(owner).createTeam(founders, members))
      .to.emit(officer, 'TeamCreated')
      .withArgs(founders, members)

    const [actualFounders, actualMembers, deployedContracts] = await officer.getTeam()
    expect(actualFounders).to.deep.equal(founders)
    expect(actualMembers).to.deep.equal(members)
    expect(deployedContracts).to.be.empty
  })

  it('Should fail to create team without founders', async () => {
    await expect(officer.createTeam([], [])).to.be.revertedWith('Must have at least one founder')
  })
})

describe('Contract Deployment', () => {
  it('Should deploy contracts via BeaconProxy', async function () {
    const votingInitData = votingContract.interface.encodeFunctionData('initialize', [
      owner.address
    ])

    const bankInitData = bankAccount.interface.encodeFunctionData('initialize', [
      owner.address,
      owner.address
    ])
    const expenseInitData = expenseAccount.interface.encodeFunctionData('initialize', [
      owner.address
    ])

    await expect(officer.connect(owner).deployBeaconProxy('Voting', votingInitData)).to.emit(
      officer,
      'ContractDeployed'
    )

    const team = await (officer as Officer).getTeam()
    expect(team[3]).to.be.not.equal('0x0000000000000000000000000000000000000000')

    expect(team[4]).to.be.not.equal('0x0000000000000000000000000000000000000000')
  })
  it('Should deploy the BankAccount contract via BeaconProxy', async function () {
    await (officer as Officer)
      .connect(owner)
      .deployBankAccount(ethers.Wallet.createRandom().address)

    const team = await (officer as Officer).getTeam()
    expect(team[2]).to.be.not.equal('0x0000000000000000000000000000000000000000')
  })
  it('Should deploy the ExpenseAccount contract via BeaconProxy', async function () {
    await (officer as Officer).connect(owner).deployExpenseAccount()

    const team = await (officer as Officer).getTeam()
    expect(team[5]).to.be.not.equal('0x0000000000000000000000000000000000000000')
  })
  it('should pause the contract', async function () {
    await (officer as Officer).connect(owner).pause()

    const paused = await (officer as Officer).paused()
    expect(paused).to.be.true
  })
  it('should unpause the contract', async function () {
    await (officer as Officer).connect(owner).unpause()

    const paused = await (officer as Officer).paused()
    expect(paused).to.be.false
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

    BoD = await ethers.getContractFactory('BoardOfDirectors')
    bodBeacon = await upgrades.deployBeacon(BoD)
    ;[owner, addr1, addr2, addr3] = await ethers.getSigners()

    ExpenseAccount = await ethers.getContractFactory('ExpenseAccount')
    expenseAccountBeacon = await upgrades.deployBeacon(ExpenseAccount)

    ExpenseAccountEIP712 = await ethers.getContractFactory('ExpenseAccountEIP712')
    expenseAccountEip712Beacon = await upgrades.deployBeacon(ExpenseAccountEIP712)

    Officer = await ethers.getContractFactory('Officer')
    officer = await upgrades.deployProxy(
      Officer,
      [
        await addr1.getAddress(),
        await bankAccountBeacon.getAddress(),
        await votingContractBeacon.getAddress(),
        await bodBeacon.getAddress(),
        await expenseAccountBeacon.getAddress(),
        await expenseAccountBeacon.getAddress()
      ],
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

import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { Officer } from '../typechain-types'

describe('Officer Contract', function () {
  let Officer, officer: Officer
  let BankAccount, VotingContract, ExpenseAccount, ExpenseAccountEIP712
  let bankAccountBeacon, votingContractBeacon, expenseAccountBeacon, expenseAccountEip712Beacon
  let BoD, bodBeacon
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress

  before(async function () {
    // Deploy implementations
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

    // Deploy Officer contract
    Officer = await ethers.getContractFactory('Officer')
    officer = (await upgrades.deployProxy(Officer, [owner.address], {
      initializer: 'initialize'
    })) as unknown as Officer

    // Configure beacons
    await officer.connect(owner).configureBeacon('Bank', await bankAccountBeacon.getAddress())
    await officer.connect(owner).configureBeacon('Voting', await votingContractBeacon.getAddress())
    await officer.connect(owner).configureBeacon('BoardOfDirectors', await bodBeacon.getAddress())
    await officer
      .connect(owner)
      .configureBeacon(
        'ExpenseAccount',
        await expenseAccountBeacon.getAddress(),
        await expenseAccountEip712Beacon.getAddress()
      )
  })

  it('Should create a new team', async function () {
    const founders = [await addr1.getAddress(), await addr2.getAddress()]
    const members = ['0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E']
    const tx = await officer.connect(owner).createTeam(founders, members)
    await tx.wait()

    // Access founders array
    const teamFounders = await officer.connect(owner).getTeam()
    console.log('Team Founders:', teamFounders)
    expect(teamFounders[0][0]).to.equal(await addr1.getAddress())
    expect(teamFounders[0][1]).to.equal(await addr2.getAddress())
  })

  it('Should deploy the Voting and BoD contracts via BeaconProxy', async function () {
    // Prepare initializer arguments
    const votingAdmin = owner.address // or any address you want as admin
    const bodDirectors = [addr1.address, addr2.address] // array of director addresses

    // Encode initializer data with correct arguments
    const votingInitData = VotingContract.interface.encodeFunctionData('initialize', [votingAdmin])
    const bodInitData = BoD.interface.encodeFunctionData('initialize', [bodDirectors])

    console.log('Voting Init Data:', votingInitData)

    // Deploy Voting contract
    await expect(officer.connect(owner).deployContract('Voting', votingInitData)).to.emit(
      officer,
      'ContractDeployed'
    )

    // Deploy Board of Directors contract
    await expect(officer.connect(owner).deployContract('BoardOfDirectors', bodInitData)).to.emit(
      officer,
      'ContractDeployed'
    )
  })

  it('Should deploy the BankAccount contract via BeaconProxy', async function () {
    const bankInitData = BankAccount.interface.encodeFunctionData(
      'initialize',
      ethers.Wallet.createRandom().address
    )

    await expect(officer.connect(owner).deployContract('Bank', bankInitData)).to.emit(
      officer,
      'ContractDeployed'
    )
  })

  it('Should deploy the ExpenseAccount contract via BeaconProxy', async function () {
    const expenseInitData = ExpenseAccount.interface.encodeFunctionData(
      'initialize',
      await owner.getAddress()
    )

    await expect(officer.connect(owner).deployContract('ExpenseAccount', expenseInitData)).to.emit(
      officer,
      'ContractDeployed'
    )
  })

  it('should pause the contract', async function () {
    await officer.connect(owner).pause()
    const paused = await officer.paused()
    expect(paused).to.be.true
  })

  it('should unpause the contract', async function () {
    await officer.connect(owner).unpause()
    const paused = await officer.paused()
    expect(paused).to.be.false
  })

  it('Should transfer ownership to a new owner', async function () {
    const tx = await officer.connect(owner).transferOwnership(addr1.address)
    const receipt = await tx.wait()

    const event = receipt.events?.find((e) => e.event === 'OwnershipTransferred')
    expect(event?.args?.newOwner).to.equal(addr1.address)
  })

  it('Should restrict deployment to owners and founders', async function () {
    // Re-deploy Officer contract with addr1 as owner
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
    officer = (await upgrades.deployProxy(Officer, [addr1.address], {
      initializer: 'initialize'
    })) as Officer

    // Configure beacons
    await officer.connect(addr1).configureBeacon('Bank', bankAccountBeacon.address)

    // Non-founder/non-owner should fail
    await expect(officer.connect(addr3).deployContract('Bank', '0x')).to.be.revertedWith(
      'You are not authorized to perform this action'
    )

    // Create team with addr1 and addr2 as founders
    await officer.connect(addr1).createTeam([addr1.address, addr2.address], ['0x...'])

    // Founder (addr2) should succeed
    await expect(officer.connect(addr2).deployContract('Bank', '0x')).to.emit(
      officer,
      'ContractDeployed'
    )
  })
})

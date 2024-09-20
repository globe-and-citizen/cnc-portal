import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'

describe('Officer Contract', function () {
  let Officer, officer: any
  let BankAccount, GovernanceContract
  let bankAccountBeacon, governanceContractBeacon
  let owner: any, addr1: any, addr2: any

  beforeEach(async function () {
    BankAccount = await ethers.getContractFactory('Bank')
    bankAccountBeacon = await upgrades.deployBeacon(BankAccount)

    GovernanceContract = await ethers.getContractFactory('Voting')
    governanceContractBeacon = await upgrades.deployBeacon(GovernanceContract)
    ;[owner, addr1, addr2] = await ethers.getSigners()

    Officer = await ethers.getContractFactory('Officer')
    // console.log(bankAccountBeacon.target, governanceContractBeacon.target)
    // console.log(Officer)
    officer = await upgrades.deployProxy(
      Officer,
      [await bankAccountBeacon.getAddress(), await governanceContractBeacon.getAddress()],
      { initializer: 'initialize' }
    )
  })

  it('Should create a new team', async function () {
    const founders = [addr1.address, addr2.address]
    // console.log('founders', founders)
    const tx = await officer
      .connect(owner)
      .createTeam(founders, ['0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'])

    const receipt = await tx.wait()

    console.log('receipt', receipt.logs[0].args)
    const team = await officer.getTeam(0)
    // const receipt2 = await team.wait()
    console.log('receipt2', team)
    expect(team.teamOwner).to.equal(owner.address)
    console.log('team', team)

    expect(team.founders[0]).to.equal(addr1.address)
    expect(team.founders[1]).to.equal(addr2.address)
  })

  it('Should deploy the BankAccount contract via BeaconProxy', async function () {
    const founders = [addr1.address, addr2.address]

    await officer.connect(owner).createTeam(founders)
    await officer.connect(owner).deployBankAccount(1)

    const team = await officer.teams(1)
    expect(team.bankAccountContract).to.not.equal(ethers.constants.AddressZero)
  })

  it('Should deploy the EmployeeContract contract via BeaconProxy', async function () {
    const founders = [addr1.address, addr2.address]

    await officer.connect(owner).createTeam(founders)
    await officer.connect(owner).deployEmployeeContract(1)

    const team = await officer.teams(1)
    expect(team.employeeContract).to.not.equal(ethers.constants.AddressZero)
  })

  it('Should deploy the GovernanceContract contract via BeaconProxy', async function () {
    const founders = [addr1.address, addr2.address]

    await officer.connect(owner).createTeam(founders)
    await officer.connect(owner).deployGovernanceContract(1)

    const team = await officer.teams(1)
    expect(team.governanceContract).to.not.equal(ethers.constants.AddressZero)
  })

  it('Should transfer ownership to a new owner', async function () {
    const founders = [addr1.address, addr2.address]

    await officer.connect(owner).createTeam(founders)
    await officer.connect(owner).transferOwnershipToBOD(1, addr1.address)

    const team = await officer.teams(1)
    expect(team.teamOwner).to.equal(addr1.address)
  })

  it('Should fail if non-founder or non-owner tries to deploy', async function () {
    const founders = [addr1.address, addr2.address]

    await officer.connect(owner).createTeam(founders)

    await expect(officer.connect(addr2).deployBankAccount(1)).to.be.revertedWith(
      'Only founders or team owner can deploy'
    )
  })

  it('Should not allow signing the agreement twice', async function () {
    const founders = [addr1.address, addr2.address]

    await officer.connect(owner).createTeam(founders)
    await officer.connect(addr1).signAgreement(1)

    await expect(officer.connect(addr1).signAgreement(1)).to.be.revertedWith(
      'Agreement already signed'
    )
  })

  it('Should fail if non-founder tries to sign the agreement', async function () {
    const founders = [addr1.address, addr2.address]

    await officer.connect(owner).createTeam(founders)

    await expect(officer.connect(owner).signAgreement(1)).to.be.revertedWith(
      'Only founders can sign the agreement'
    )
  })
})

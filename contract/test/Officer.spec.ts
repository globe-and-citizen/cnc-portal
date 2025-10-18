import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  Bank__factory,
  BoardOfDirectors__factory,
  ExpenseAccount__factory,
  Officer,
  UpgradeableBeacon,
  Elections__factory,
  Proposals__factory
} from '../typechain-types'

describe('Officer Contract', function () {
  let officer: Officer
  let bankAccount: Bank__factory
  let electionsContract: Elections__factory
  let expenseAccount: ExpenseAccount__factory
  let proposalsContract: Proposals__factory
  let bankAccountBeacon: UpgradeableBeacon
  let electionsBeacon: UpgradeableBeacon
  let expenseAccountBeacon: UpgradeableBeacon
  let proposalsBeacon: UpgradeableBeacon
  let boardOfDirectors: BoardOfDirectors__factory
  let bodBeacon: UpgradeableBeacon
  let owner: SignerWithAddress
  let addr1: SignerWithAddress
  let addr2: SignerWithAddress
  let addr3: SignerWithAddress

  beforeEach(async function () {
    ;[owner, addr1, addr2, addr3] = await ethers.getSigners()

    // Deploy implementation contracts
    bankAccount = await ethers.getContractFactory('Bank')
    bankAccountBeacon = (await upgrades.deployBeacon(bankAccount)) as unknown as UpgradeableBeacon

    electionsContract = await ethers.getContractFactory('Elections')
    electionsBeacon = (await upgrades.deployBeacon(
      electionsContract
    )) as unknown as UpgradeableBeacon

    boardOfDirectors = await ethers.getContractFactory('BoardOfDirectors')
    bodBeacon = (await upgrades.deployBeacon(boardOfDirectors)) as unknown as UpgradeableBeacon

    expenseAccount = await ethers.getContractFactory('ExpenseAccount')
    expenseAccountBeacon = (await upgrades.deployBeacon(
      expenseAccount
    )) as unknown as UpgradeableBeacon

    proposalsContract = await ethers.getContractFactory('Proposals')
    proposalsBeacon = (await upgrades.deployBeacon(
      proposalsContract
    )) as unknown as UpgradeableBeacon

    // Deploy Officer contract
    const Officer = await ethers.getContractFactory('Officer')
    officer = (await upgrades.deployProxy(Officer, [owner.address, [], [], false], {
      initializer: 'initialize'
    })) as unknown as Officer

    // Configure beacons
    await officer.connect(owner).configureBeacon('Bank', await bankAccountBeacon.getAddress())
    await officer.connect(owner).configureBeacon('Elections', await electionsBeacon.getAddress())
    await officer.connect(owner).configureBeacon('BoardOfDirectors', await bodBeacon.getAddress())
    await officer
      .connect(owner)
      .configureBeacon('ExpenseAccount', await expenseAccountBeacon.getAddress())
  })

  describe('Contract Deployment', () => {
    it('Should deploy contracts via BeaconProxy', async function () {
      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])

      const bankInitData = bankAccount.interface.encodeFunctionData('initialize', [
        [], // token addresses array
        owner.address
      ])
      const expenseInitData = expenseAccount.interface.encodeFunctionData('initialize', [
        owner.address
      ])

      await expect(
        officer.connect(owner).deployBeaconProxy('Elections', electionsInitData)
      ).to.emit(officer, 'ContractDeployed')

      const deployedContracts = await officer.getTeam()
      expect(deployedContracts.length).to.equal(2)
      expect(deployedContracts[0].contractType).to.equal('Elections')
      expect(deployedContracts[0].contractAddress).to.not.equal(ethers.ZeroAddress)

      await expect(officer.connect(owner).deployBeaconProxy('Bank', bankInitData)).to.emit(
        officer,
        'ContractDeployed'
      )

      await expect(
        officer.connect(owner).deployBeaconProxy('ExpenseAccount', expenseInitData)
      ).to.emit(officer, 'ContractDeployed')
    })

    it('Should restrict deployment to owners and founders', async function () {
      const initData = bankAccount.interface.encodeFunctionData('initialize', [
        [], // token addresses array
        owner.address
      ])

      // Test unauthorized access
      await expect(officer.connect(addr3).deployBeaconProxy('Bank', initData)).to.be.revertedWith(
        'Caller is not an owner and contract is not initializing'
      )

      // Test authorized access (founder)
      await expect(officer.connect(owner).deployBeaconProxy('Bank', initData)).to.emit(
        officer,
        'ContractDeployed'
      )
    })

    it('Should fail when deploying proxy for unknown contract type', async function () {
      const initData = bankAccount.interface.encodeFunctionData('initialize', [
        [], // token addresses array
        owner.address
      ])

      // Using a new contract type that hasn't been configured
      const newContractType = 'NewBankType'

      // Verify beacon doesn't exist yet
      expect(await officer.contractBeacons(newContractType)).to.equal(ethers.ZeroAddress)

      // Attempt to deploy proxy with new contract type should fail
      await expect(
        officer.connect(owner).deployBeaconProxy(newContractType, initData)
      ).to.be.revertedWith('Beacon not configured for this contract type')
    })
  })

  describe('Access Control', () => {
    it('Should transfer ownership', async function () {
      await expect(officer.connect(owner).transferOwnership(addr1.address))
        .to.emit(officer, 'OwnershipTransferred')
        .withArgs(owner.address, addr1.address)

      expect(await officer.owner()).to.equal(addr1.address)
    })

    it('Should pause and unpause', async function () {
      await officer.connect(owner).pause()
      expect(await officer.paused()).to.be.true

      await officer.connect(owner).unpause()
      expect(await officer.paused()).to.be.false
    })

    it('Should restrict pause/unpause to owners', async function () {
      await expect(officer.connect(addr3).pause()).to.be.revertedWith(
        'You are not authorized to perform this action'
      )

      await expect(officer.connect(addr3).unpause()).to.be.revertedWith(
        'You are not authorized to perform this action'
      )
    })
  })

  describe('Initialization and Beacon Configuration', () => {
    it('Should reject beacon configs with zero address', async function () {
      const Officer = await ethers.getContractFactory('Officer')
      const invalidConfig = [
        {
          beaconType: 'TestBeacon',
          beaconAddress: ethers.ZeroAddress
        }
      ]

      await expect(
        upgrades.deployProxy(Officer, [owner.address, invalidConfig, [], false], {
          initializer: 'initialize'
        })
      ).to.be.revertedWith('Invalid beacon address')
    })

    it('Should reject beacon configs with empty type', async function () {
      const Officer = await ethers.getContractFactory('Officer')
      const invalidConfig = [
        {
          beaconType: '',
          beaconAddress: addr1.address
        }
      ]

      await expect(
        upgrades.deployProxy(Officer, [owner.address, invalidConfig, [], false], {
          initializer: 'initialize'
        })
      ).to.be.revertedWith('Empty beacon type')
    })

    it('Should reject duplicate beacon types in config', async function () {
      const Officer = await ethers.getContractFactory('Officer')
      const duplicateConfigs = [
        {
          beaconType: 'TestBeacon',
          beaconAddress: addr1.address
        },
        {
          beaconType: 'TestBeacon', // Duplicate type
          beaconAddress: addr2.address
        }
      ]

      await expect(
        upgrades.deployProxy(Officer, [owner.address, duplicateConfigs, [], false], {
          initializer: 'initialize'
        })
      ).to.be.revertedWith('Duplicate beacon type')
    })

    it('Should successfully initialize with valid beacon configs', async function () {
      const Officer = await ethers.getContractFactory('Officer')
      const validConfigs = [
        {
          beaconType: 'TestBeacon1',
          beaconAddress: addr1.address
        },
        {
          beaconType: 'TestBeacon2',
          beaconAddress: addr2.address
        }
      ]

      const officerContract = (await upgrades.deployProxy(
        Officer,
        [owner.address, validConfigs, [], false],
        {
          initializer: 'initialize'
        }
      )) as unknown as Officer

      expect(await officerContract.contractBeacons('TestBeacon1')).to.equal(addr1.address)
      expect(await officerContract.contractBeacons('TestBeacon2')).to.equal(addr2.address)
    })

    it('Should initialize and deploy contracts in one transaction when isDeployAllContracts is true', async function () {
      const Officer = await ethers.getContractFactory('Officer')
      const bankBeaconAddr = await bankAccountBeacon.getAddress()
      const electionsBeaconAddr = await electionsBeacon.getAddress()
      const bodBeaconAddr = await bodBeacon.getAddress()
      const proposalsBeaconAddr = await proposalsBeacon.getAddress()

      const validConfigs = [
        {
          beaconType: 'Bank',
          beaconAddress: bankBeaconAddr
        },
        {
          beaconType: 'Elections',
          beaconAddress: electionsBeaconAddr
        },
        {
          beaconType: 'BoardOfDirectors',
          beaconAddress: bodBeaconAddr
        },
        {
          beaconType: 'Proposals',
          beaconAddress: proposalsBeaconAddr
        }
      ]

      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])
      const proposalsInitData = proposalsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])

      const bankInitData = bankAccount.interface.encodeFunctionData('initialize', [
        [], // token addresses array
        owner.address
      ])

      const deployments = [
        {
          contractType: 'Bank',
          initializerData: bankInitData
        },
        {
          contractType: 'Elections',
          initializerData: electionsInitData
        },
        {
          contractType: 'Proposals',
          initializerData: proposalsInitData
        }
      ]

      const officerContract = (await upgrades.deployProxy(
        Officer,
        [owner.address, validConfigs, deployments, true],
        {
          initializer: 'initialize'
        }
      )) as unknown as Officer

      const deployedContracts = await officerContract.getDeployedContracts()
      expect(deployedContracts.length).to.equal(4) // Bank, Elections, Proposals, and auto-deployed BoardOfDirectors
      expect(deployedContracts[0].contractType).to.equal('Bank')
      expect(deployedContracts[0].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[1].contractType).to.equal('Elections')
      expect(deployedContracts[1].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[2].contractType).to.equal('BoardOfDirectors')
      expect(deployedContracts[2].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[3].contractType).to.equal('Proposals')
      expect(deployedContracts[3].contractAddress).to.not.equal(ethers.ZeroAddress)

      // Verify the Elections contract has the correct BoardOfDirectors address
      const electionsInstance = await ethers.getContractAt(
        'Elections',
        deployedContracts[1].contractAddress
      )
      const bodAddress = await electionsInstance.bodAddress()
      expect(bodAddress).to.equal(deployedContracts[2].contractAddress)
    })

    it('Should not deploy contracts during initialization when isDeployAllContracts is false', async function () {
      const Officer = await ethers.getContractFactory('Officer')
      const validConfigs = [
        {
          beaconType: 'Bank',
          beaconAddress: await bankAccountBeacon.getAddress()
        },
        {
          beaconType: 'Elections',
          beaconAddress: await electionsBeacon.getAddress()
        }
      ]

      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])

      const bankInitData = bankAccount.interface.encodeFunctionData('initialize', [
        [], // token addresses array
        owner.address
      ])

      const deployments = [
        {
          contractType: 'Bank',
          initializerData: bankInitData
        },
        {
          contractType: 'Elections',
          initializerData: electionsInitData
        }
      ]

      const officerContract = (await upgrades.deployProxy(
        Officer,
        [owner.address, validConfigs, deployments, false],
        {
          initializer: 'initialize'
        }
      )) as unknown as Officer

      const deployedContracts = await officerContract.getDeployedContracts()
      expect(deployedContracts.length).to.equal(0) // No contracts should be deployed
    })
  })

  describe('Batch Contract Deployment', () => {
    it('Should deploy multiple contracts in a single transaction', async function () {
      // Create team first to ensure proper setup

      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])

      const bankInitData = bankAccount.interface.encodeFunctionData('initialize', [
        [], // token addresses array
        owner.address
      ])

      const deployments = [
        {
          contractType: 'Bank',
          initializerData: bankInitData
        },
        {
          contractType: 'Elections',
          initializerData: electionsInitData
        }
      ]

      // Deploy contracts
      const tx = await officer.connect(owner).deployAllContracts(deployments)
      await tx.wait()

      // Verify deployments
      const deployedContracts = await officer.getTeam()

      // Should have 3 contracts (Bank, Elections, and auto-deployed BoardOfDirectors)
      expect(deployedContracts.length).to.equal(3)

      // Instead of checking specific addresses, verify contract types and that addresses are valid
      expect(deployedContracts[0].contractType).to.equal('Bank')
      expect(deployedContracts[0].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[1].contractType).to.equal('Elections')
      expect(deployedContracts[1].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[2].contractType).to.equal('BoardOfDirectors')
      expect(deployedContracts[2].contractAddress).to.not.equal(ethers.ZeroAddress)

      // Verify the Elections contract has the correct BoardOfDirectors address
      const electionsInstance = await ethers.getContractAt(
        'Elections',
        deployedContracts[1].contractAddress
      )
      const bodAddress = await electionsInstance.bodAddress()

      expect(bodAddress).to.equal(deployedContracts[2].contractAddress)
    })

    it('Should fail when deploying with empty contract type', async function () {
      const deployments = [
        {
          contractType: '',
          initializerData: '0x12345678'
        }
      ]

      await expect(officer.connect(owner).deployAllContracts(deployments)).to.be.revertedWith(
        'Contract type cannot be empty'
      )
    })

    it('Should fail when deploying with empty initializer data', async function () {
      const deployments = [
        {
          contractType: 'Bank',
          initializerData: '0x'
        }
      ]

      await expect(officer.connect(owner).deployAllContracts(deployments)).to.be.revertedWith(
        'Missing initializer data for Bank'
      )
    })

    it('Should fail when deploying unconfigured contract type', async function () {
      const deployments = [
        {
          contractType: 'NonExistentContract',
          initializerData: '0x12345678'
        }
      ]

      await expect(officer.connect(owner).deployAllContracts(deployments)).to.be.revertedWith(
        'Beacon not configured for NonExistentContract'
      )
    })

    it('Should restrict batch deployment to owners and founders', async function () {
      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])
      const deployments = [
        {
          contractType: 'Elections',
          initializerData: electionsInitData
        }
      ]

      await expect(officer.connect(addr3).deployAllContracts(deployments)).to.be.revertedWith(
        'Caller is not an owner and contract is not initializing'
      )
    })
  })

  describe('Contract Type Management', () => {
    it('Should track configured contract types', async function () {
      const types = await officer.getConfiguredContractTypes()
      expect(types).to.have.lengthOf(4)
      expect(types).to.include('Bank')
      expect(types).to.include('Elections')
      expect(types).to.include('BoardOfDirectors')
      expect(types).to.include('ExpenseAccount')
    })

    it('Should add new contract type only when configuring new beacon', async function () {
      const initialTypes = await officer.getConfiguredContractTypes()
      const initialLength = initialTypes.length

      // Reconfigure existing beacon
      await officer.connect(owner).configureBeacon('Bank', addr1.address)
      let types = await officer.getConfiguredContractTypes()
      expect(types.length).to.equal(initialLength)

      // Configure new beacon
      await officer.connect(owner).configureBeacon('NewContractType', addr2.address)
      types = await officer.getConfiguredContractTypes()
      expect(types.length).to.equal(initialLength + 1)
      expect(types).to.include('NewContractType')
    })
  })

  describe('Deployed Contracts Management', () => {
    it('Should return empty array when no contracts are deployed', async function () {
      const deployedContracts = await officer.getDeployedContracts()
      expect(deployedContracts).to.be.empty
    })

    it('Should return all deployed contracts with their types', async function () {
      // Deploy multiple contracts
      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])
      const bankInitData = bankAccount.interface.encodeFunctionData('initialize', [
        [], // token addresses array
        owner.address
      ])

      // Deploy Elections contract (this will also auto-deploy BoardOfDirectors)
      await officer.connect(owner).deployBeaconProxy('Elections', electionsInitData)

      // Deploy Bank contract
      await officer.connect(owner).deployBeaconProxy('Bank', bankInitData)

      // Get deployed contracts
      const deployedContracts = await officer.getDeployedContracts()

      // Verify the results (updated order)
      expect(deployedContracts.length).to.equal(3) // Elections + BoardOfDirectors + Bank

      // Check first contract (Elections)
      expect(deployedContracts[0].contractType).to.equal('Elections')
      expect(deployedContracts[0].contractAddress).to.not.equal(ethers.ZeroAddress)

      // Check second contract (BoardOfDirectors - auto-deployed)
      expect(deployedContracts[1].contractType).to.equal('BoardOfDirectors')
      expect(deployedContracts[1].contractAddress).to.not.equal(ethers.ZeroAddress)

      // Check third contract (Bank)
      expect(deployedContracts[2].contractType).to.equal('Bank')
      expect(deployedContracts[2].contractAddress).to.not.equal(ethers.ZeroAddress)
    })

    it('Should maintain contract order as they are deployed', async function () {
      // Deploy contracts in specific order
      const initData = bankAccount.interface.encodeFunctionData('initialize', [
        [], // token addresses array
        owner.address
      ])

      // Deploy three Bank contracts
      await officer.connect(owner).deployBeaconProxy('Bank', initData)
      await officer.connect(owner).deployBeaconProxy('Bank', initData)
      await officer.connect(owner).deployBeaconProxy('Bank', initData)

      const deployedContracts = await officer.getDeployedContracts()

      // Verify order and length
      expect(deployedContracts.length).to.equal(3)
      deployedContracts.forEach((contract) => {
        expect(contract.contractType).to.equal('Bank')
        expect(contract.contractAddress).to.not.equal(ethers.ZeroAddress)
      })

      // Verify addresses are different
      expect(deployedContracts[0].contractAddress).to.not.equal(
        deployedContracts[1].contractAddress
      )
      expect(deployedContracts[1].contractAddress).to.not.equal(
        deployedContracts[2].contractAddress
      )
      expect(deployedContracts[0].contractAddress).to.not.equal(
        deployedContracts[2].contractAddress
      )
    })

    it('Should return same data as getTeam for deployed contracts', async function () {
      // Deploy a contract
      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])
      await officer.connect(owner).deployBeaconProxy('Elections', electionsInitData)

      // Get data from both functions
      const deployedContracts = await officer.getDeployedContracts()
      const teamDeployedContracts = await officer.getTeam()

      // Compare results
      expect(deployedContracts.length).to.equal(teamDeployedContracts.length)
      expect(deployedContracts[0].contractType).to.equal(teamDeployedContracts[0].contractType)
      expect(deployedContracts[0].contractAddress).to.equal(
        teamDeployedContracts[0].contractAddress
      )
    })
  })
})

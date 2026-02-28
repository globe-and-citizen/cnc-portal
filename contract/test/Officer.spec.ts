import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  Bank__factory,
  BoardOfDirectors__factory,
  ExpenseAccountEIP712__factory,
  FeeCollector,
  Officer,
  UpgradeableBeacon,
  Elections__factory,
  Proposals__factory,
  InvestorV1__factory,
  SafeDepositRouter__factory,
  MockERC20
} from '../typechain-types'

describe('Officer Contract', function () {
  let officer: Officer
  let bankAccount: Bank__factory
  let investor: InvestorV1__factory
  let electionsContract: Elections__factory
  let expenseAccount: ExpenseAccountEIP712__factory
  let proposalsContract: Proposals__factory
  let safeDepositRouter: SafeDepositRouter__factory
  let feeCollector: FeeCollector
  let bankAccountBeacon: UpgradeableBeacon
  let investorBeacon: UpgradeableBeacon
  let electionsBeacon: UpgradeableBeacon
  let expenseAccountBeacon: UpgradeableBeacon
  let proposalsBeacon: UpgradeableBeacon
  let safeDepositRouterBeacon: UpgradeableBeacon
  let boardOfDirectors: BoardOfDirectors__factory
  let bodBeacon: UpgradeableBeacon
  let owner: SignerWithAddress
  let addr1: SignerWithAddress
  let addr2: SignerWithAddress
  let addr3: SignerWithAddress
  let mockUSDT: MockERC20
  let mockUSDC: MockERC20
  let supportedTokenAddresses: string[]

  async function deployOfficerInstance(
    beaconConfigs: { beaconType: string; beaconAddress: string }[] = [],
    deployments: { contractType: string; initializerData: string }[] = [],
    isDeployAllContracts = false
  ) {
    const OfficerFactory = await ethers.getContractFactory('Officer')
    const instance = (await OfficerFactory.deploy(
      await feeCollector.getAddress()
    )) as unknown as Officer
    await instance.waitForDeployment()
    await instance.initialize(
      await owner.getAddress(),
      beaconConfigs,
      deployments,
      isDeployAllContracts
    )
    return instance
  }

  beforeEach(async function () {
    ;[owner, addr1, addr2, addr3] = await ethers.getSigners()

    const MockToken = await ethers.getContractFactory('MockERC20')
    mockUSDT = (await MockToken.deploy('USDT', 'USDT')) as unknown as MockERC20
    mockUSDC = (await MockToken.deploy('USDC', 'USDC')) as unknown as MockERC20
    supportedTokenAddresses = [await mockUSDT.getAddress(), await mockUSDC.getAddress()]

    const FeeCollector = await ethers.getContractFactory('FeeCollector')
    feeCollector = (await upgrades.deployProxy(
      FeeCollector,
      [owner.address, [], supportedTokenAddresses],
      {
        initializer: 'initialize'
      }
    )) as unknown as FeeCollector

    // Deploy implementation contracts
    bankAccount = await ethers.getContractFactory('Bank')
    bankAccountBeacon = (await upgrades.deployBeacon(bankAccount)) as unknown as UpgradeableBeacon

    investor = await ethers.getContractFactory('InvestorV1')
    investorBeacon = (await upgrades.deployBeacon(investor)) as unknown as UpgradeableBeacon

    electionsContract = await ethers.getContractFactory('Elections')
    electionsBeacon = (await upgrades.deployBeacon(
      electionsContract
    )) as unknown as UpgradeableBeacon

    boardOfDirectors = await ethers.getContractFactory('BoardOfDirectors')
    bodBeacon = (await upgrades.deployBeacon(boardOfDirectors)) as unknown as UpgradeableBeacon

    expenseAccount = await ethers.getContractFactory('ExpenseAccountEIP712')
    expenseAccountBeacon = (await upgrades.deployBeacon(
      expenseAccount
    )) as unknown as UpgradeableBeacon

    proposalsContract = await ethers.getContractFactory('Proposals')
    proposalsBeacon = (await upgrades.deployBeacon(
      proposalsContract
    )) as unknown as UpgradeableBeacon

    //  ADD: Deploy SafeDepositRouter beacon
    safeDepositRouter = await ethers.getContractFactory('SafeDepositRouter')
    safeDepositRouterBeacon = (await upgrades.deployBeacon(
      safeDepositRouter
    )) as unknown as UpgradeableBeacon

    // Deploy Officer contract
    officer = await deployOfficerInstance()

    // Configure beacons
    await officer.connect(owner).configureBeacon('Bank', await bankAccountBeacon.getAddress())
    await officer.connect(owner).configureBeacon('InvestorV1', await investorBeacon.getAddress())
    await officer.connect(owner).configureBeacon('Elections', await electionsBeacon.getAddress())
    await officer.connect(owner).configureBeacon('BoardOfDirectors', await bodBeacon.getAddress())
    await officer
      .connect(owner)
      .configureBeacon('ExpenseAccountEIP712', await expenseAccountBeacon.getAddress())
    //  ADD: Configure SafeDepositRouter beacon
    await officer
      .connect(owner)
      .configureBeacon('SafeDepositRouter', await safeDepositRouterBeacon.getAddress())
  })

  describe('Contract Deployment', () => {
    it.skip('Should deploy contracts via BeaconProxy', async function () {
      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])

      const bankInitData = bankAccount.interface.encodeFunctionData('initialize', [
        [],
        owner.address
      ])

      const investorInitData = investor.interface.encodeFunctionData('initialize', [
        'Bitcoin',
        'BTC',
        owner.address
      ])

      const expenseInitData = expenseAccount.interface.encodeFunctionData('initialize', [
        owner.address
      ])

      //  ADD: SafeDepositRouter initialization data
      const safeDepositRouterInitData = safeDepositRouter.interface.encodeFunctionData(
        'initialize',
        [
          // owner
          addr1.address, // safeAddress (using addr1 as placeholder)
          ethers.ZeroAddress, // investorAddress (will be set by Officer)
          [await mockUSDC.getAddress(), await mockUSDT.getAddress()],
          1n // multiplier
        ]
      )

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
        officer.connect(owner).deployBeaconProxy('ExpenseAccountEIP712', expenseInitData)
      ).to.emit(officer, 'ContractDeployed')

      await expect(
        officer.connect(owner).deployBeaconProxy('InvestorV1', investorInitData)
      ).to.emit(officer, 'ContractDeployed')

      //  ADD: Deploy SafeDepositRouter
      await expect(
        officer.connect(owner).deployBeaconProxy('SafeDepositRouter', safeDepositRouterInitData)
      ).to.emit(officer, 'ContractDeployed')
    })

    it('Should restrict deployment to owners and founders', async function () {
      const initData = bankAccount.interface.encodeFunctionData('initialize', [[], owner.address])

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
      const initData = bankAccount.interface.encodeFunctionData('initialize', [[], owner.address])

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

  describe('FeeCollector Integration', () => {
    it('Should report supported fee collector tokens', async function () {
      const MockToken = await ethers.getContractFactory('MockERC20')
      const unsupportedToken = await MockToken.deploy('DAI', 'DAI')

      expect(await officer.isFeeCollectorToken(supportedTokenAddresses[0])).to.equal(true)
      expect(await officer.isFeeCollectorToken(supportedTokenAddresses[1])).to.equal(true)
      expect(await officer.isFeeCollectorToken(await unsupportedToken.getAddress())).to.equal(false)
      expect(await officer.isFeeCollectorToken(ethers.ZeroAddress)).to.equal(false)
    })
  })

  describe('Initialization and Beacon Configuration', () => {
    it('Should reject beacon configs with zero address', async function () {
      const invalidConfig = [
        {
          beaconType: 'TestBeacon',
          beaconAddress: ethers.ZeroAddress
        }
      ]

      await expect(deployOfficerInstance(invalidConfig, [], false)).to.be.revertedWith(
        'Invalid beacon address'
      )
    })

    it('Should reject beacon configs with empty type', async function () {
      const invalidConfig = [
        {
          beaconType: '',
          beaconAddress: addr1.address
        }
      ]

      await expect(deployOfficerInstance(invalidConfig, [], false)).to.be.revertedWith(
        'Empty beacon type'
      )
    })

    it('Should reject duplicate beacon types in config', async function () {
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

      await expect(deployOfficerInstance(duplicateConfigs, [], false)).to.be.revertedWith(
        'Duplicate beacon type'
      )
    })

    it('Should successfully initialize with valid beacon configs', async function () {
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

      const officerContract = await deployOfficerInstance(validConfigs, [], false)

      expect(await officerContract.contractBeacons('TestBeacon1')).to.equal(addr1.address)
      expect(await officerContract.contractBeacons('TestBeacon2')).to.equal(addr2.address)
    })

    it('Should initialize and deploy contracts in one transaction when isDeployAllContracts is true', async function () {
      const bankBeaconAddr = await bankAccountBeacon.getAddress()
      const electionsBeaconAddr = await electionsBeacon.getAddress()
      const bodBeaconAddr = await bodBeacon.getAddress()
      const proposalsBeaconAddr = await proposalsBeacon.getAddress()
      const investorBeaconAddr = await investorBeacon.getAddress()
      const safeDepositRouterBeaconAddr = await safeDepositRouterBeacon.getAddress()

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
        },
        {
          beaconType: 'InvestorV1',
          beaconAddress: investorBeaconAddr
        },
        //  ADD: SafeDepositRouter beacon config
        {
          beaconType: 'SafeDepositRouter',
          beaconAddress: safeDepositRouterBeaconAddr
        }
      ]

      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])
      const proposalsInitData = proposalsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])
      const bankInitData = bankAccount.interface.encodeFunctionData('initialize', [
        [],
        owner.address
      ])
      const investorInitData = investor.interface.encodeFunctionData('initialize', [
        'Bitcoin',
        'BTC',
        ethers.ZeroAddress // Will be set to owner by Officer
      ])
      //  ADD: SafeDepositRouter init data
      const safeDepositRouterInitData = safeDepositRouter.interface.encodeFunctionData(
        'initialize',
        [
          // owner - will be transferred by Officer
          addr1.address, // safeAddress
          ethers.ZeroAddress, // investorAddress - will be set by Officer
          [await mockUSDC.getAddress(), await mockUSDT.getAddress()],
          1n // multiplier
        ]
      )

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
        },
        {
          contractType: 'InvestorV1',
          initializerData: investorInitData
        },
        // ✅ ADD: SafeDepositRouter deployment
        {
          contractType: 'SafeDepositRouter',
          initializerData: safeDepositRouterInitData
        }
      ]

      const officerContract = await deployOfficerInstance(validConfigs, deployments, true)

      const deployedContracts = await officerContract.getDeployedContracts()

      // Verify all contracts deployed (Bank, Elections, BoardOfDirectors, Proposals, InvestorV1, SafeDepositRouter)
      expect(deployedContracts.length).to.equal(6)

      expect(deployedContracts[0].contractType).to.equal('Bank')
      expect(deployedContracts[0].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[1].contractType).to.equal('Elections')
      expect(deployedContracts[1].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[2].contractType).to.equal('BoardOfDirectors')
      expect(deployedContracts[2].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[3].contractType).to.equal('Proposals')
      expect(deployedContracts[3].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[4].contractType).to.equal('InvestorV1')
      expect(deployedContracts[4].contractAddress).to.not.equal(ethers.ZeroAddress)

      //  ADD: Verify SafeDepositRouter deployment
      expect(deployedContracts[5].contractType).to.equal('SafeDepositRouter')
      expect(deployedContracts[5].contractAddress).to.not.equal(ethers.ZeroAddress)

      // Verify the Elections contract has the correct BoardOfDirectors address
      const electionsInstance = await ethers.getContractAt(
        'Elections',
        deployedContracts[1].contractAddress
      )
      const bodAddress = await electionsInstance.bodAddress()
      expect(bodAddress).to.equal(deployedContracts[2].contractAddress)

      //  ADD: Verify SafeDepositRouter has MINTER_ROLE
      const investorInstance = await ethers.getContractAt(
        'InvestorV1',
        deployedContracts[4].contractAddress
      )
      const minterRole = await investorInstance.MINTER_ROLE()
      const hasMinterRole = await investorInstance.hasRole(
        minterRole,
        deployedContracts[5].contractAddress
      )
      expect(hasMinterRole).to.be.true
    })

    it('Should not deploy contracts during initialization when isDeployAllContracts is false', async function () {
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
        [],
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

      const officerContract = await deployOfficerInstance(validConfigs, deployments, false)

      const deployedContracts = await officerContract.getDeployedContracts()
      expect(deployedContracts.length).to.equal(0) // No contracts should be deployed
    })
  })

  describe('Batch Contract Deployment', () => {
    it('Should deploy multiple contracts in a single transaction', async function () {
      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])

      const bankInitData = bankAccount.interface.encodeFunctionData('initialize', [
        [],
        owner.address
      ])

      //  ADD: SafeDepositRouter init data
      const safeDepositRouterInitData = safeDepositRouter.interface.encodeFunctionData(
        'initialize',
        [
          // owner
          addr1.address, // safeAddress
          ethers.ZeroAddress, // investorAddress
          [await mockUSDC.getAddress(), await mockUSDT.getAddress()],
          1n
        ]
      )

      const deployments = [
        {
          contractType: 'Bank',
          initializerData: bankInitData
        },
        {
          contractType: 'Elections',
          initializerData: electionsInitData
        },
        //  ADD: SafeDepositRouter deployment
        {
          contractType: 'SafeDepositRouter',
          initializerData: safeDepositRouterInitData
        }
      ]

      // Deploy contracts
      const tx = await officer.connect(owner).deployAllContracts(deployments)
      await tx.wait()

      // Verify deployments
      const deployedContracts = await officer.getTeam()

      // Should have 4 contracts (Bank, Elections, BoardOfDirectors, SafeDepositRouter)
      expect(deployedContracts.length).to.equal(4)

      expect(deployedContracts[0].contractType).to.equal('Bank')
      expect(deployedContracts[0].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[1].contractType).to.equal('Elections')
      expect(deployedContracts[1].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[2].contractType).to.equal('BoardOfDirectors')
      expect(deployedContracts[2].contractAddress).to.not.equal(ethers.ZeroAddress)

      //  ADD: Verify SafeDepositRouter
      expect(deployedContracts[3].contractType).to.equal('SafeDepositRouter')
      expect(deployedContracts[3].contractAddress).to.not.equal(ethers.ZeroAddress)

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
      // ✅ UPDATE: Now should include SafeDepositRouter (6 types total)
      expect(types).to.have.lengthOf(6)
      expect(types).to.include('Bank')
      expect(types).to.include('Elections')
      expect(types).to.include('BoardOfDirectors')
      expect(types).to.include('ExpenseAccountEIP712')
      expect(types).to.include('InvestorV1')
      expect(types).to.include('SafeDepositRouter')
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
      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])
      const bankInitData = bankAccount.interface.encodeFunctionData('initialize', [
        [],
        owner.address
      ])

      // Deploy Elections contract (this will also auto-deploy BoardOfDirectors)
      await officer.connect(owner).deployBeaconProxy('Elections', electionsInitData)

      // Deploy Bank contract
      await officer.connect(owner).deployBeaconProxy('Bank', bankInitData)

      const deployedContracts = await officer.getDeployedContracts()

      expect(deployedContracts.length).to.equal(3)

      expect(deployedContracts[0].contractType).to.equal('Elections')
      expect(deployedContracts[0].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[1].contractType).to.equal('BoardOfDirectors')
      expect(deployedContracts[1].contractAddress).to.not.equal(ethers.ZeroAddress)

      expect(deployedContracts[2].contractType).to.equal('Bank')
      expect(deployedContracts[2].contractAddress).to.not.equal(ethers.ZeroAddress)
    })

    it('Should maintain contract order as they are deployed', async function () {
      const initData = bankAccount.interface.encodeFunctionData('initialize', [[], owner.address])

      // Deploy three Bank contracts
      await officer.connect(owner).deployBeaconProxy('Bank', initData)
      await officer.connect(owner).deployBeaconProxy('Bank', initData)
      await officer.connect(owner).deployBeaconProxy('Bank', initData)

      const deployedContracts = await officer.getDeployedContracts()

      expect(deployedContracts.length).to.equal(3)
      deployedContracts.forEach((contract) => {
        expect(contract.contractType).to.equal('Bank')
        expect(contract.contractAddress).to.not.equal(ethers.ZeroAddress)
      })

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
      const electionsInitData = electionsContract.interface.encodeFunctionData('initialize', [
        owner.address
      ])
      await officer.connect(owner).deployBeaconProxy('Elections', electionsInitData)

      const deployedContracts = await officer.getDeployedContracts()
      const teamDeployedContracts = await officer.getTeam()

      expect(deployedContracts.length).to.equal(teamDeployedContracts.length)
      expect(deployedContracts[0].contractType).to.equal(teamDeployedContracts[0].contractType)
      expect(deployedContracts[0].contractAddress).to.equal(
        teamDeployedContracts[0].contractAddress
      )
    })
  })

  //  ADD: SafeDepositRouter-specific tests
  describe('SafeDepositRouter Integration', () => {
    it('Should deploy SafeDepositRouter with correct initial state', async function () {
      const investorInitData = investor.interface.encodeFunctionData('initialize', [
        'Bitcoin',
        'BTC',
        ethers.ZeroAddress
      ])

      // Initialize with ethers.ZeroAddress as owner - Officer becomes owner via msg.sender
      const safeDepositRouterInitData = safeDepositRouter.interface.encodeFunctionData(
        'initialize',
        [
          // owner - Officer (msg.sender) becomes owner
          addr1.address, // safeAddress
          ethers.ZeroAddress, // investorAddress - will be set by Officer
          [await mockUSDC.getAddress(), await mockUSDT.getAddress()],
          1n
        ]
      )

      // Deploy InvestorV1 first
      await officer.connect(owner).deployBeaconProxy('InvestorV1', investorInitData)

      // Deploy SafeDepositRouter
      await officer.connect(owner).deployBeaconProxy('SafeDepositRouter', safeDepositRouterInitData)

      const deployedContracts = await officer.getDeployedContracts()
      const safeDepositRouterAddress = deployedContracts.find(
        (c) => c.contractType === 'SafeDepositRouter'
      )?.contractAddress

      expect(safeDepositRouterAddress).to.not.equal(ethers.ZeroAddress)

      // Verify SafeDepositRouter contract
      const safeDepositRouterInstance = await ethers.getContractAt(
        'SafeDepositRouter',
        safeDepositRouterAddress!
      )

      expect(await safeDepositRouterInstance.safeAddress()).to.equal(addr1.address)
      expect(await safeDepositRouterInstance.multiplier()).to.equal(1n)
      expect(await safeDepositRouterInstance.depositsEnabled()).to.equal(false) // Disabled by default
    })

    it('Should grant MINTER_ROLE to SafeDepositRouter when deployed with InvestorV1', async function () {
      const investorInitData = investor.interface.encodeFunctionData('initialize', [
        'Bitcoin',
        'BTC',
        ethers.ZeroAddress
      ])

      // Initialize with ethers.ZeroAddress - Officer becomes owner
      const safeDepositRouterInitData = safeDepositRouter.interface.encodeFunctionData(
        'initialize',
        [
          // Officer becomes owner
          addr1.address, // safeAddress
          ethers.ZeroAddress, // investorAddress
          [await mockUSDC.getAddress()],
          1n
        ]
      )

      const deployments = [
        {
          contractType: 'InvestorV1',
          initializerData: investorInitData
        },
        {
          contractType: 'SafeDepositRouter',
          initializerData: safeDepositRouterInitData
        }
      ]

      await officer.connect(owner).deployAllContracts(deployments)

      const deployedContracts = await officer.getDeployedContracts()
      const investorAddress = deployedContracts.find(
        (c) => c.contractType === 'InvestorV1'
      )?.contractAddress
      const safeDepositRouterAddress = deployedContracts.find(
        (c) => c.contractType === 'SafeDepositRouter'
      )?.contractAddress

      const investorInstance = await ethers.getContractAt('InvestorV1', investorAddress!)
      const minterRole = await investorInstance.MINTER_ROLE()

      const hasMinterRole = await investorInstance.hasRole(minterRole, safeDepositRouterAddress!)
      expect(hasMinterRole).to.be.true
    })

    it('Should transfer SafeDepositRouter ownership to team owner after deployment', async function () {
      const investorInitData = investor.interface.encodeFunctionData('initialize', [
        'Bitcoin',
        'BTC',
        ethers.ZeroAddress
      ])

      const safeDepositRouterInitData = safeDepositRouter.interface.encodeFunctionData(
        'initialize',
        [
          // owner - will be transferred
          addr1.address, // safeAddress
          ethers.ZeroAddress, // investorAddress
          [await mockUSDC.getAddress()],
          1n
        ]
      )

      await officer.connect(owner).deployBeaconProxy('InvestorV1', investorInitData)
      await officer.connect(owner).deployBeaconProxy('SafeDepositRouter', safeDepositRouterInitData)

      const deployedContracts = await officer.getDeployedContracts()
      const safeDepositRouterAddress = deployedContracts.find(
        (c) => c.contractType === 'SafeDepositRouter'
      )?.contractAddress

      const safeDepositRouterInstance = await ethers.getContractAt(
        'SafeDepositRouter',
        safeDepositRouterAddress!
      )

      expect(await safeDepositRouterInstance.owner()).to.equal(owner.address)
    })

    it('Should set investor address on SafeDepositRouter during deployment', async function () {
      const investorInitData = investor.interface.encodeFunctionData('initialize', [
        'Bitcoin',
        'BTC',
        ethers.ZeroAddress
      ])

      const safeDepositRouterInitData = safeDepositRouter.interface.encodeFunctionData(
        'initialize',
        [
          addr1.address, // safeAddress
          ethers.ZeroAddress, // investorAddress - will be set by Officer
          [await mockUSDC.getAddress()],
          1n
        ]
      )

      await officer.connect(owner).deployBeaconProxy('InvestorV1', investorInitData)
      await officer.connect(owner).deployBeaconProxy('SafeDepositRouter', safeDepositRouterInitData)

      const deployedContracts = await officer.getDeployedContracts()
      const investorAddress = deployedContracts.find(
        (c) => c.contractType === 'InvestorV1'
      )?.contractAddress
      const safeDepositRouterAddress = deployedContracts.find(
        (c) => c.contractType === 'SafeDepositRouter'
      )?.contractAddress

      const safeDepositRouterInstance = await ethers.getContractAt(
        'SafeDepositRouter',
        safeDepositRouterAddress!
      )

      expect(await safeDepositRouterInstance.investorAddress()).to.equal(investorAddress)
    })

    it('Should handle SafeDepositRouter deployment order correctly', async function () {
      const investorInitData = investor.interface.encodeFunctionData('initialize', [
        'Bitcoin',
        'BTC',
        ethers.ZeroAddress
      ])

      const safeDepositRouterInitData = safeDepositRouter.interface.encodeFunctionData(
        'initialize',
        [
          addr1.address, // safeAddress
          ethers.ZeroAddress, // investorAddress
          [await mockUSDC.getAddress()],
          1n
        ]
      )

      await officer.connect(owner).deployBeaconProxy('SafeDepositRouter', safeDepositRouterInitData)
      await officer.connect(owner).deployBeaconProxy('InvestorV1', investorInitData)

      const deployedContracts = await officer.getDeployedContracts()
      const investorAddress = deployedContracts.find(
        (c) => c.contractType === 'InvestorV1'
      )?.contractAddress
      const safeDepositRouterAddress = deployedContracts.find(
        (c) => c.contractType === 'SafeDepositRouter'
      )?.contractAddress

      const safeDepositRouterInstance = await ethers.getContractAt(
        'SafeDepositRouter',
        safeDepositRouterAddress!
      )

      expect(await safeDepositRouterInstance.investorAddress()).to.equal(investorAddress)
      expect(await safeDepositRouterInstance.owner()).to.equal(owner.address)
    })
  })
})

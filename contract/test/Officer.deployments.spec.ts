import { expect } from 'chai'
import { ethers, initializeHardhat, upgrades } from './hardhat-context.js'
import type { SignerWithAddress } from './hardhat-context.js'
import {
  Bank__factory,
  BoardOfDirectors__factory,
  Elections__factory,
  Investor__factory,
  CashRemunerationEIP712__factory,
  ExpenseAccountEIP712__factory,
} from '../typechain-types/index.js'
import type { Beacon, FeeCollector, Officer } from '../typechain-types/index.js'
import { ZeroAddress } from 'ethers'

before(initializeHardhat)

// Define the DeployedContract type to match the contract struct
interface DeployedContract {
  contractType: string
  contractAddress: string
}

describe('Officer Contract', function () {
  let officer: Officer
  let bankAccount: Bank__factory
  let bankAccountBeacon: Beacon
  let investor: Investor__factory
  let investorBeacon: Beacon
  let elections: Elections__factory
  let electionsBeacon: Beacon
  // let proposals: Proposals__factory
  // let proposalsBeacon: Beacon
  let expenseAccountEip712: ExpenseAccountEIP712__factory
  let expenseAccountEip712Beacon: Beacon
  let bod: BoardOfDirectors__factory
  let bodBeacon: Beacon
  let cashRemunerationEip712: CashRemunerationEIP712__factory
  let cashRemunerationEip712Beacon: Beacon
  let owner: SignerWithAddress
  let feeCollector: FeeCollector

  it('Should deploy contracts', async function () {
    ;[owner] = await ethers.getSigners()

    const MockToken = await ethers.getContractFactory('MockERC20')
    const usdt = await MockToken.deploy('USDT', 'USDT')
    const usdc = await MockToken.deploy('USDC', 'USDC')
    const usdtAddress = await usdt.getAddress()
    const usdcAddress = await usdc.getAddress()

    const feeConfigs = [{ contractType: 'BANK', feeBps: 50 }]
    const supportedTokens = [usdtAddress, usdcAddress]

    const FeeCollector = await ethers.getContractFactory('FeeCollector')
    feeCollector = (await upgrades.deployProxy(
      FeeCollector,
      [owner.address, feeConfigs, supportedTokens],
      {
        initializer: 'initialize'
      }
    )) as unknown as FeeCollector

    // Deploy implementation contracts
    bankAccount = await ethers.getContractFactory('Bank')
    bankAccountBeacon = (await upgrades.deployBeacon(bankAccount)) as unknown as Beacon

    investor = await ethers.getContractFactory('Investor')
    investorBeacon = (await upgrades.deployBeacon(investor)) as unknown as Beacon

    // proposals = await ethers.getContractFactory('Proposals')
    // proposalsBeacon = (await upgrades.deployBeacon(proposals)) as unknown as Beacon

    elections = await ethers.getContractFactory('Elections')
    electionsBeacon = (await upgrades.deployBeacon(elections)) as unknown as Beacon

    bod = await ethers.getContractFactory('BoardOfDirectors')
    bodBeacon = (await upgrades.deployBeacon(bod)) as unknown as Beacon

    expenseAccountEip712 = await ethers.getContractFactory('ExpenseAccountEIP712')
    expenseAccountEip712Beacon = (await upgrades.deployBeacon(
      expenseAccountEip712
    )) as unknown as Beacon

    cashRemunerationEip712 = await ethers.getContractFactory('CashRemunerationEIP712')
    cashRemunerationEip712Beacon = (await upgrades.deployBeacon(
      cashRemunerationEip712
    )) as unknown as Beacon

    const vesting = await ethers.getContractFactory('Vesting')
    const vestingBeacon = (await upgrades.deployBeacon(vesting)) as unknown as Beacon

    const beaconConfigs: Array<{ beaconType: string; beaconAddress: string }> = [
      {
        beaconType: 'Bank',
        beaconAddress: await bankAccountBeacon.getAddress()
      },
      {
        beaconType: 'BoardOfDirectors',
        beaconAddress: await bodBeacon.getAddress()
      },
      // {
      //   beaconType: 'Proposals',
      //   beaconAddress: await proposalsBeacon.getAddress()
      // },
      {
        beaconType: 'ExpenseAccountEIP712',
        beaconAddress: await expenseAccountEip712Beacon.getAddress()
      },
      {
        beaconType: 'CashRemunerationEIP712',
        beaconAddress: await cashRemunerationEip712Beacon.getAddress()
      },
      {
        beaconType: 'Investor',
        beaconAddress: await investorBeacon.getAddress()
      },
      {
        beaconType: 'Elections',
        beaconAddress: await electionsBeacon.getAddress()
      },
      {
        beaconType: 'Vesting',
        beaconAddress: await vestingBeacon.getAddress()
      }
    ]

    const deployments = []

    deployments.push({
      contractType: 'Bank',
      initializerData: bankAccount.interface.encodeFunctionData('initialize', [
        supportedTokens,
        owner.address
      ])
    })

    deployments.push({
      contractType: 'Investor',
      initializerData: investor.interface.encodeFunctionData('initialize', [
        'Bitcoin',
        'BTC',
        ZeroAddress
      ])
    })

    // deployments.push({
    //   contractType: 'Proposals',
    //   initializerData: proposals.interface.encodeFunctionData('initialize', [owner.address])
    // })

    deployments.push({
      contractType: 'ExpenseAccountEIP712',
      initializerData: expenseAccountEip712.interface.encodeFunctionData('initialize', [
        owner.address,
        [usdtAddress, usdcAddress]
      ])
    })

    deployments.push({
      contractType: 'CashRemunerationEIP712',
      initializerData: cashRemunerationEip712.interface.encodeFunctionData('initialize', [
        ZeroAddress,
        [usdcAddress]
      ])
    })

    deployments.push({
      contractType: 'Elections',
      initializerData: elections.interface.encodeFunctionData('initialize', [owner.address])
    })

    deployments.push({
      contractType: 'Vesting',
      initializerData: vesting.interface.encodeFunctionData('initialize', [])
    })

    // Deploy Officer through a proxy; the implementation's constructor now calls
    // `_disableInitializers()`, so `initialize` can only be invoked on a proxy.
    const Officer = await ethers.getContractFactory('Officer')
    officer = (await upgrades.deployProxy(
      Officer,
      [owner.address, beaconConfigs, deployments, true],
      {
        initializer: 'initialize',
        constructorArgs: [await feeCollector.getAddress()],
        unsafeAllow: ['constructor', 'state-variable-immutable']
      }
    )) as unknown as Officer
    await officer.waitForDeployment()

    const deployedContracts = await officer.getDeployedContracts()

    const contractAddresses = new Map<string, string>()

    for (const contract of deployedContracts) {
      const deployedContract = contract as unknown as DeployedContract
      contractAddresses.set(deployedContract.contractType, deployedContract.contractAddress)
    }

    // Test Officer's deployed contracts
    const bankProxy = await ethers.getContractAt('Bank', contractAddresses.get('Bank')!)
    expect(await bankProxy.getOfficerAddress()).to.equal(await officer.getAddress())

    const cashRemunerationEip712Proxy = await ethers.getContractAt(
      'CashRemunerationEIP712',
      contractAddresses.get('CashRemunerationEIP712')!
    )
    const investorProxy = await ethers.getContractAt('Investor', contractAddresses.get('Investor')!)

    expect((await cashRemunerationEip712Proxy.getOfficerAddress()).toLocaleLowerCase()).to.be.equal(
      (await officer.getAddress()).toLocaleLowerCase()
    )
    expect((await cashRemunerationEip712Proxy.owner()).toLocaleLowerCase()).to.be.equal(
      owner.address.toLocaleLowerCase()
    )
    expect(
      await cashRemunerationEip712Proxy.isTokenSupported(await investorProxy.getAddress())
    ).to.be.equal(true)

    expect((await investorProxy.owner()).toLocaleLowerCase()).to.be.equal(
      owner.address.toLocaleLowerCase()
    )
    expect(
      await investorProxy.hasRole(
        await investorProxy.MINTER_ROLE(),
        await cashRemunerationEip712Proxy.getAddress()
      )
    ).to.be.equal(true)
    expect(
      await investorProxy.hasRole(await investorProxy.MINTER_ROLE(), owner.address)
    ).to.be.equal(true)
    expect(
      await investorProxy.hasRole(await investorProxy.DEFAULT_ADMIN_ROLE(), owner.address)
    ).to.be.equal(true)

    // Vesting is deployed per-team via the same beacon flow: bound to the Officer,
    // owned by the team owner, and granted MINTER_ROLE on Investor.
    const vestingProxy = await ethers.getContractAt('Vesting', contractAddresses.get('Vesting')!)
    expect((await vestingProxy.getOfficerAddress()).toLocaleLowerCase()).to.be.equal(
      (await officer.getAddress()).toLocaleLowerCase()
    )
    expect((await vestingProxy.owner()).toLocaleLowerCase()).to.be.equal(
      owner.address.toLocaleLowerCase()
    )
    expect(
      await investorProxy.hasRole(
        await investorProxy.MINTER_ROLE(),
        await vestingProxy.getAddress()
      )
    ).to.be.equal(true)

    // Test Officer's FeeCollector integration (these are valid since Officer needs to query FeeCollector)
    expect(await officer.isFeeCollectorToken(usdtAddress)).to.be.equal(true)
    expect(await officer.isFeeCollectorToken(usdcAddress)).to.be.equal(true)

    const unsupportedToken = await MockToken.deploy('DAI', 'DAI')
    expect(await officer.isFeeCollectorToken(await unsupportedToken.getAddress())).to.be.equal(
      false
    )
    expect(await officer.isFeeCollectorToken(ZeroAddress)).to.be.equal(false)

    // Verify Officer has correct FeeCollector reference
    expect(await officer.getFeeCollector()).to.equal(await feeCollector.getAddress())
  })
})

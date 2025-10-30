import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  Bank__factory,
  BoardOfDirectors__factory,
  Officer,
  UpgradeableBeacon,
  Elections__factory,
  InvestorV1__factory,
  CashRemunerationEIP712__factory,
  ExpenseAccountEIP712__factory
} from '../typechain-types'
import { ZeroAddress } from 'ethers'

describe('Officer Contract', function () {
  let officer: Officer
  let bankAccount: Bank__factory
  let bankAccountBeacon: UpgradeableBeacon
  let investor: InvestorV1__factory
  let investorBeacon: UpgradeableBeacon
  let elections: Elections__factory
  let electionsBeacon: UpgradeableBeacon
  let expenseAccountEip712: ExpenseAccountEIP712__factory
  let expenseAccountEip712Beacon: UpgradeableBeacon
  let bod: BoardOfDirectors__factory
  let bodBeacon: UpgradeableBeacon
  let cashRemunerationEip712: CashRemunerationEIP712__factory
  let cashRemunerationEip712Beacon: UpgradeableBeacon
  let owner: SignerWithAddress

  it('Should deploy contracts', async function () {
    ;[owner] = await ethers.getSigners()

    // Deploy implementation contracts
    bankAccount = await ethers.getContractFactory('Bank')
    bankAccountBeacon = (await upgrades.deployBeacon(bankAccount)) as unknown as UpgradeableBeacon

    investor = await ethers.getContractFactory('InvestorV1')
    investorBeacon = (await upgrades.deployBeacon(investor)) as unknown as UpgradeableBeacon

    elections = await ethers.getContractFactory('Elections')
    electionsBeacon = (await upgrades.deployBeacon(elections)) as unknown as UpgradeableBeacon

    bod = await ethers.getContractFactory('BoardOfDirectors')
    bodBeacon = (await upgrades.deployBeacon(bod)) as unknown as UpgradeableBeacon

    expenseAccountEip712 = await ethers.getContractFactory('ExpenseAccountEIP712')
    expenseAccountEip712Beacon = (await upgrades.deployBeacon(
      expenseAccountEip712
    )) as unknown as UpgradeableBeacon

    cashRemunerationEip712 = await ethers.getContractFactory('CashRemunerationEIP712')
    cashRemunerationEip712Beacon = (await upgrades.deployBeacon(
      cashRemunerationEip712
    )) as unknown as UpgradeableBeacon

    const beaconConfigs: Array<{ beaconType: string; beaconAddress: string }> = [
      {
        beaconType: 'Bank',
        beaconAddress: await bankAccountBeacon.getAddress()
      },
      {
        beaconType: 'BoardOfDirectors',
        beaconAddress: await bodBeacon.getAddress()
      },
      {
        beaconType: 'ExpenseAccountEIP712',
        beaconAddress: await expenseAccountEip712Beacon.getAddress()
      },
      {
        beaconType: 'CashRemunerationEIP712',
        beaconAddress: await cashRemunerationEip712Beacon.getAddress()
      },
      {
        beaconType: 'InvestorV1',
        beaconAddress: await investorBeacon.getAddress()
      },
      {
        beaconType: 'Elections',
        beaconAddress: await electionsBeacon.getAddress()
      }
    ]

    const deployments = []

    deployments.push({
      contractType: 'Bank',
      initializerData: bankAccount.interface.encodeFunctionData('initialize', [[], owner.address])
    })

    deployments.push({
      contractType: 'ExpenseAccountEIP712',
      initializerData: expenseAccountEip712.interface.encodeFunctionData('initialize', [
        owner.address,
        ZeroAddress,
        ZeroAddress
      ])
    })

    deployments.push({
      contractType: 'CashRemunerationEIP712',
      initializerData: cashRemunerationEip712.interface.encodeFunctionData('initialize', [
        ZeroAddress,
        []
      ])
    })

    deployments.push({
      contractType: 'InvestorV1',
      initializerData: investor.interface.encodeFunctionData('initialize', [
        'Bitcoin',
        'BTC',
        ZeroAddress
      ])
    })

    deployments.push({
      contractType: 'Elections',
      initializerData: elections.interface.encodeFunctionData('initialize', [owner.address])
    })

    // Deploy Officer contract
    const Officer = await ethers.getContractFactory('Officer')
    officer = (await upgrades.deployProxy(
      Officer,
      [owner.address, beaconConfigs, deployments, true],
      {
        initializer: 'initialize'
      }
    )) as unknown as Officer

    const deployedContracts = await officer.getDeployedContracts()

    const contractAddresses = new Map()

    for (const contract of deployedContracts) {
      contractAddresses.set(contract[0], contract[1])
    }

    const cashRemunerationEip712Proxy = await ethers.getContractAt(
      'CashRemunerationEIP712',
      contractAddresses.get('CashRemunerationEIP712')
    )
    const investorV1Proxy = await ethers.getContractAt(
      'InvestorV1',
      contractAddresses.get('InvestorV1')
    )

    expect((await cashRemunerationEip712Proxy.officerAddress()).toLocaleLowerCase()).to.be.equal(
      (await officer.getAddress()).toLocaleLowerCase()
    )
    expect((await cashRemunerationEip712Proxy.owner()).toLocaleLowerCase()).to.be.equal(
      owner.address.toLocaleLowerCase()
    )
    expect(
      await cashRemunerationEip712Proxy.supportedTokens(await investorV1Proxy.getAddress())
    ).to.be.equal(true)

    expect((await investorV1Proxy.owner()).toLocaleLowerCase()).to.be.equal(
      owner.address.toLocaleLowerCase()
    )
    expect(
      await investorV1Proxy.hasRole(
        await investorV1Proxy.MINTER_ROLE(),
        await cashRemunerationEip712Proxy.getAddress()
      )
    ).to.be.equal(true)
    expect(
      await investorV1Proxy.hasRole(await investorV1Proxy.MINTER_ROLE(), owner.address)
    ).to.be.equal(true)
    expect(
      await investorV1Proxy.hasRole(await investorV1Proxy.DEFAULT_ADMIN_ROLE(), owner.address)
    ).to.be.equal(true)
  })
})

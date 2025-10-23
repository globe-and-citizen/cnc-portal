import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
  Officer,
  UpgradeableBeacon,
  InvestorV1__factory,
  CashRemunerationEIP712__factory,
  CashRemunerationEIP712,
  InvestorV1
} from '../typechain-types'
import { ZeroAddress } from 'ethers'

describe('Cash Remuneration - Withdraw SHER', function () {
  let officer: Officer
  let investor: InvestorV1__factory
  let investorBeacon: UpgradeableBeacon
  let investorV1Proxy: InvestorV1
  let cashRemunerationEip712: CashRemunerationEIP712__factory
  let cashRemunerationEip712Beacon: UpgradeableBeacon
  let cashRemunerationEip712Proxy: CashRemunerationEIP712
  let owner: SignerWithAddress
  let addr1: SignerWithAddress

  //EIP 712 variables
  const DOMAIN_NAME = 'CashRemuneration'
  const DOMAIN_VERSION = '1'
  let chainId: bigint
  let verifyingContract: string
  let domain: {
    name: string
    version: string
    chainId: bigint
    verifyingContract: string
  }
  let types: {
    [key: string]: Array<{ name: string; type: string }>
  }

  beforeEach(async function () {
    ;[owner, addr1] = await ethers.getSigners()

    // Deploy implementation contracts
    investor = await ethers.getContractFactory('InvestorV1')
    investorBeacon = (await upgrades.deployBeacon(investor)) as unknown as UpgradeableBeacon

    cashRemunerationEip712 = await ethers.getContractFactory('CashRemunerationEIP712')
    cashRemunerationEip712Beacon = (await upgrades.deployBeacon(
      cashRemunerationEip712
    )) as unknown as UpgradeableBeacon

    const beaconConfigs: Array<{ beaconType: string; beaconAddress: string }> = [
      {
        beaconType: 'CashRemunerationEIP712',
        beaconAddress: await cashRemunerationEip712Beacon.getAddress()
      },
      {
        beaconType: 'InvestorV1',
        beaconAddress: await investorBeacon.getAddress()
      }
    ]

    const deployments = []

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

    cashRemunerationEip712Proxy = await ethers.getContractAt(
      'CashRemunerationEIP712',
      contractAddresses.get('CashRemunerationEIP712')
    )
    investorV1Proxy = await ethers.getContractAt('InvestorV1', contractAddresses.get('InvestorV1'))
  })

  it('Should initialize contracts properly', async () => {
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

  it('Should mint SHER to user if they earned SHER', async () => {
    chainId = (await ethers.provider.getNetwork()).chainId
    verifyingContract = await cashRemunerationEip712Proxy.getAddress()

    domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract
    }

    types = {
      Wage: [
        { name: 'hourlyRate', type: 'uint256' },
        { name: 'tokenAddress', type: 'address' }
      ],
      WageClaim: [
        { name: 'employeeAddress', type: 'address' },
        { name: 'hoursWorked', type: 'uint8' },
        { name: 'wages', type: 'Wage[]' },
        { name: 'date', type: 'uint256' }
      ]
    }

    const wageClaim = {
      employeeAddress: addr1.address,
      hoursWorked: 5,
      wages: [
        {
          hourlyRate: BigInt(20 * 1e6),
          tokenAddress: await investorV1Proxy.getAddress()
        }
      ],
      date: Math.floor(Date.now() / 1000)
    }

    const signature = await owner.signTypedData(domain, types, wageClaim)
    const signatureHash = ethers.keccak256(signature)
    const tx = await cashRemunerationEip712Proxy.connect(addr1).withdraw(wageClaim, signature)

    const amountSher = BigInt(wageClaim.hoursWorked) * wageClaim.wages[0].hourlyRate

    await expect(tx)
      .to.emit(cashRemunerationEip712Proxy, 'WithdrawToken')
      .withArgs(addr1.address, await investorV1Proxy.getAddress(), amountSher)
    const paidWageClaim = await cashRemunerationEip712Proxy.paidWageClaims(signatureHash)
    expect(paidWageClaim).to.be.equal(true)
    expect(await investorV1Proxy.balanceOf(addr1.address)).to.be.equal(amountSher)
  })

  it("Should revert if address trying to mint doesn't have minter role", async () => {
    await expect(
      investorV1Proxy.connect(addr1).individualMint(owner.address, 20 * 1e6)
    ).to.be.revertedWithCustomError(investorV1Proxy, 'AccessControlUnauthorizedAccount')
  })
})

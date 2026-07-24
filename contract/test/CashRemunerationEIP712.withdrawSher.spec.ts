import { expect } from 'chai'
import { ethers, initializeHardhat, upgrades } from './hardhat-context.js'
import type { SignerWithAddress } from './hardhat-context.js'
import type {
  Officer,
  Beacon,
  CashRemunerationEIP712,
  Investor,
  FeeCollector
} from '../typechain-types/index.js'
import { Investor__factory, CashRemunerationEIP712__factory } from '../typechain-types/index.js'

before(initializeHardhat)
import { ZeroAddress } from 'ethers'

describe('Cash Remuneration - Withdraw SHER', function () {
  let officer: Officer
  let investor: Investor__factory
  let investorBeacon: Beacon
  let investorProxy: Investor
  let cashRemunerationEIP712: CashRemunerationEIP712__factory
  let cashRemunerationEIP712Beacon: Beacon
  let cashRemunerationEIP712Proxy: CashRemunerationEIP712
  let owner: SignerWithAddress
  let addr1: SignerWithAddress
  let feeCollector: FeeCollector

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

    const FeeCollector = await ethers.getContractFactory('FeeCollector')
    feeCollector = (await upgrades.deployProxy(FeeCollector, [owner.address, [], []], {
      initializer: 'initialize',
      unsafeAllow: ['constructor']
    })) as unknown as FeeCollector

    // Deploy implementation contracts
    investor = await ethers.getContractFactory('Investor')
    investorBeacon = (await upgrades.deployBeacon(investor, {
      unsafeAllow: ['constructor']
    })) as unknown as Beacon

    cashRemunerationEIP712 = await ethers.getContractFactory('CashRemunerationEIP712')
    cashRemunerationEIP712Beacon = (await upgrades.deployBeacon(cashRemunerationEIP712, {
      unsafeAllow: ['constructor']
    })) as unknown as Beacon

    const beaconConfigs: Array<{ beaconType: string; beaconAddress: string }> = [
      {
        beaconType: 'CashRemunerationEIP712',
        beaconAddress: await cashRemunerationEIP712Beacon.getAddress()
      },
      {
        beaconType: 'Investor',
        beaconAddress: await investorBeacon.getAddress()
      }
    ]

    const deployments = []

    deployments.push({
      contractType: 'CashRemunerationEIP712',
      initializerData: cashRemunerationEIP712.interface.encodeFunctionData('initialize', [
        ZeroAddress,
        []
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

    const contractAddresses = new Map()

    for (const contract of deployedContracts) {
      const contractType = 'contractType' in contract ? contract.contractType : contract[0]
      const contractAddress = 'contractAddress' in contract ? contract.contractAddress : contract[1]
      contractAddresses.set(contractType, contractAddress)
    }

    cashRemunerationEIP712Proxy = await ethers.getContractAt(
      'CashRemunerationEIP712',
      contractAddresses.get('CashRemunerationEIP712')
    )
    investorProxy = await ethers.getContractAt('Investor', contractAddresses.get('Investor'))

    chainId = (await ethers.provider.getNetwork()).chainId
    verifyingContract = await cashRemunerationEIP712Proxy.getAddress()

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
        { name: 'minutesWorked', type: 'uint16' },
        { name: 'wages', type: 'Wage[]' },
        { name: 'date', type: 'uint256' }
      ]
    }
  })

  it('Should initialize contracts properly', async () => {
    expect((await cashRemunerationEIP712Proxy.getOfficerAddress()).toLocaleLowerCase()).to.be.equal(
      (await officer.getAddress()).toLocaleLowerCase()
    )
    expect((await cashRemunerationEIP712Proxy.owner()).toLocaleLowerCase()).to.be.equal(
      owner.address.toLocaleLowerCase()
    )
    expect(
      await cashRemunerationEIP712Proxy.isTokenSupported(await investorProxy.getAddress())
    ).to.be.equal(true)

    expect((await investorProxy.owner()).toLocaleLowerCase()).to.be.equal(
      owner.address.toLocaleLowerCase()
    )
    expect(
      await investorProxy.hasRole(
        await investorProxy.MINTER_ROLE(),
        await cashRemunerationEIP712Proxy.getAddress()
      )
    ).to.be.equal(true)
    expect(
      await investorProxy.hasRole(await investorProxy.MINTER_ROLE(), owner.address)
    ).to.be.equal(true)
    expect(
      await investorProxy.hasRole(await investorProxy.DEFAULT_ADMIN_ROLE(), owner.address)
    ).to.be.equal(true)
  })

  it('Should mint SHER to user if they earned SHER', async () => {
    const wageClaim = {
      employeeAddress: addr1.address,
      minutesWorked: 300,
      wages: [
        {
          hourlyRate: BigInt(20 * 1e6),
          tokenAddress: await investorProxy.getAddress()
        }
      ],
      date: Math.floor(Date.now() / 1000)
    }

    const signature = await owner.signTypedData(domain, types, wageClaim)
    const signatureHash = ethers.keccak256(signature)
    const tx = await cashRemunerationEIP712Proxy.connect(addr1).withdraw(wageClaim, signature)

    const amountSher = (BigInt(wageClaim.minutesWorked) * wageClaim.wages[0].hourlyRate) / 60n

    await expect(tx)
      .to.emit(cashRemunerationEIP712Proxy, 'WithdrawToken')
      .withArgs(addr1.address, await investorProxy.getAddress(), amountSher)
    const paidWageClaim = await cashRemunerationEIP712Proxy.getPaidWageClaim(signatureHash)
    expect(paidWageClaim).to.be.equal(true)
    expect(await investorProxy.balanceOf(addr1.address)).to.be.equal(amountSher)
  })

  it("Should revert if address trying to mint doesn't have minter role", async () => {
    await expect(
      investorProxy.connect(addr1).individualMint(owner.address, 20 * 1e6)
    ).to.be.revertedWithCustomError(investorProxy, 'AccessControlUnauthorizedAccount')
  })

  it('Should disable claims so the user cannot withdraw SHER', async () => {
    const wageClaim = {
      employeeAddress: addr1.address,
      minutesWorked: 300,
      wages: [
        {
          hourlyRate: BigInt(20 * 1e6),
          tokenAddress: await investorProxy.getAddress()
        }
      ],
      date: Math.floor(Date.now() / 1000)
    }

    const signature = await owner.signTypedData(domain, types, wageClaim)
    const signatureHash = ethers.keccak256(signature)
    const tx = await cashRemunerationEIP712Proxy.connect(owner).disableClaim(signatureHash)

    await expect(tx)
      .to.emit(cashRemunerationEIP712Proxy, 'WageClaimDisabled')
      .withArgs(signatureHash)

    await expect(
      cashRemunerationEIP712Proxy.connect(addr1).withdraw(wageClaim, signature)
    ).to.be.revertedWithCustomError(
      cashRemunerationEIP712Proxy,
      'CashRemunerationEIP712__ClaimIsDisabled'
    )
  })

  it('Should enable claims so the user can withdraw SHER again', async () => {
    const wageClaim = {
      employeeAddress: addr1.address,
      minutesWorked: 300,
      wages: [
        {
          hourlyRate: BigInt(20 * 1e6),
          tokenAddress: await investorProxy.getAddress()
        }
      ],
      date: Math.floor(Date.now() / 1000)
    }

    const signature = await owner.signTypedData(domain, types, wageClaim)
    const signatureHash = ethers.keccak256(signature)

    let tx = await cashRemunerationEIP712Proxy.connect(owner).enableClaim(signatureHash)

    await expect(tx)
      .to.emit(cashRemunerationEIP712Proxy, 'WageClaimEnabled')
      .withArgs(signatureHash)

    tx = await cashRemunerationEIP712Proxy.connect(addr1).withdraw(wageClaim, signature)

    const amountSher = (BigInt(wageClaim.minutesWorked) * wageClaim.wages[0].hourlyRate) / 60n

    await expect(tx)
      .to.emit(cashRemunerationEIP712Proxy, 'WithdrawToken')
      .withArgs(addr1.address, await investorProxy.getAddress(), amountSher)
    const paidWageClaim = await cashRemunerationEIP712Proxy.getPaidWageClaim(signatureHash)
    expect(paidWageClaim).to.be.equal(true)
    expect(await investorProxy.balanceOf(addr1.address)).to.be.equal(amountSher)
  })

  it('Should set officer address during deployment', async () => {
    expect((await cashRemunerationEIP712Proxy.getOfficerAddress()).toLocaleLowerCase()).to.be.equal(
      (await officer.getAddress()).toLocaleLowerCase()
    )
  })

  it('Should prevent replay of the same SHER mint signature (EIP-712 replay protection)', async () => {
    const wageClaim = {
      employeeAddress: addr1.address,
      minutesWorked: 300,
      wages: [
        {
          hourlyRate: BigInt(20 * 1e6),
          tokenAddress: await investorProxy.getAddress()
        }
      ],
      date: Math.floor(Date.now() / 1000)
    }

    const signature = await owner.signTypedData(domain, types, wageClaim)
    const signatureHash = ethers.keccak256(signature)

    // First invocation mints SHER successfully
    await cashRemunerationEIP712Proxy.connect(addr1).withdraw(wageClaim, signature)
    expect(await cashRemunerationEIP712Proxy.getPaidWageClaim(signatureHash)).to.equal(true)

    const amountSher = (BigInt(wageClaim.minutesWorked) * wageClaim.wages[0].hourlyRate) / 60n
    expect(await investorProxy.balanceOf(addr1.address)).to.equal(amountSher)

    // Replay attempt with identical signature/claim must revert with WageAlreadyPaid
    await expect(cashRemunerationEIP712Proxy.connect(addr1).withdraw(wageClaim, signature))
      .to.be.revertedWithCustomError(
        cashRemunerationEIP712Proxy,
        'CashRemunerationEIP712__WageAlreadyPaid'
      )
      .withArgs(signatureHash)

    // Balance unchanged after failed replay
    expect(await investorProxy.balanceOf(addr1.address)).to.equal(amountSher)
  })

  it('Should prevent replay once a claim has been disabled after use', async () => {
    const wageClaim = {
      employeeAddress: addr1.address,
      minutesWorked: 120,
      wages: [
        {
          hourlyRate: BigInt(10 * 1e6),
          tokenAddress: await investorProxy.getAddress()
        }
      ],
      date: Math.floor(Date.now() / 1000) + 1
    }

    const signature = await owner.signTypedData(domain, types, wageClaim)
    const signatureHash = ethers.keccak256(signature)

    // Use the claim once
    await cashRemunerationEIP712Proxy.connect(addr1).withdraw(wageClaim, signature)

    // Owner disables it afterwards
    await cashRemunerationEIP712Proxy.connect(owner).disableClaim(signatureHash)

    // Replay: WageAlreadyPaid is checked first in the contract, so it should hit that error
    await expect(
      cashRemunerationEIP712Proxy.connect(addr1).withdraw(wageClaim, signature)
    ).to.be.revertedWithCustomError(
      cashRemunerationEIP712Proxy,
      'CashRemunerationEIP712__WageAlreadyPaid'
    )
  })
})

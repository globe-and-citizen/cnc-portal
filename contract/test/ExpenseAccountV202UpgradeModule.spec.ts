import { expect } from 'chai'
import hre from 'hardhat'
import { ContractFactory, keccak256, parseEther } from 'ethers'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { verifyBeaconUpgrade } from '../scripts/lib/beacon-upgrade-verification.js'

describe('ExpenseAccountV202UpgradeModule', function () {
  async function fixture() {
    const connection = await hre.network.create({ network: 'hardhat', override: { chainId: 137 } })
    const [beaconOwner, owner, member] = await connection.ethers.getSigners()
    const artifact = JSON.parse(
      readFileSync(
        new URL(
          '../ignition/deployments/chain-137/artifacts/ExpenseAccountEIP712Module%23ExpenseAccountEIP712.json',
          import.meta.url
        ),
        'utf8'
      )
    )
    const legacy = await new ContractFactory(artifact.abi, artifact.bytecode, beaconOwner).deploy()
    await legacy.waitForDeployment()
    const factory = await connection.ethers.getContractFactory('FactoryBeacon')
    const beacon = await factory.deploy(await legacy.getAddress())
    await beacon.waitForDeployment()
    const token = await (
      await connection.ethers.getContractFactory('MockERC20')
    ).deploy('Test', 'TEST')
    await token.waitForDeployment()
    const current = await connection.ethers.getContractFactory('ExpenseAccountEIP712')
    const initData = current.interface.encodeFunctionData('initialize', [
      owner.address,
      [await token.getAddress()]
    ])
    const receipt = await (await beacon.createBeaconProxy(initData)).wait()
    const event = receipt!.logs
      .map((log) => {
        try {
          return beacon.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((log) => log?.name === 'BeaconProxyCreated')!
    const proxy = await connection.ethers.getContractAt('ExpenseAccountEIP712', event.args[0])
    await token.mint(await proxy.getAddress(), parseEther('10'))
    return { connection, owner, member, beacon, token, proxy }
  }

  const previousChain = process.env.CNC_UPGRADE_CHAIN_ID
  before(() => {
    process.env.CNC_UPGRADE_CHAIN_ID = '137'
  })
  after(() => {
    if (previousChain === undefined) delete process.env.CNC_UPGRADE_CHAIN_ID
    else process.env.CNC_UPGRADE_CHAIN_ID = previousChain
  })

  it('executes the recipe from released 2.0.0 and preserves a signed approval across upgrade', async () => {
    const { connection, owner, member, beacon, token, proxy } = await fixture()
    const manifestDirectory = mkdtempSync(path.join(os.tmpdir(), 'expense-rollback-'))
    const manifestPath = path.join(manifestDirectory, 'before.json')
    try {
      expect(await proxy.version()).to.equal('2.0.0')
      const now = (await connection.ethers.provider.getBlock('latest'))!.timestamp
      const budget = {
        amount: parseEther('5'),
        frequencyType: 2,
        customFrequency: 0,
        startDate: now - 10,
        endDate: now + 86400,
        tokenAddress: await token.getAddress(),
        approvedAddress: member.address
      }
      const signature = await owner.signTypedData(
        {
          name: 'CNCExpenseAccount',
          version: '1',
          chainId: 137,
          verifyingContract: await proxy.getAddress()
        },
        {
          BudgetLimit: [
            { name: 'amount', type: 'uint256' },
            { name: 'frequencyType', type: 'uint8' },
            { name: 'customFrequency', type: 'uint256' },
            { name: 'startDate', type: 'uint256' },
            { name: 'endDate', type: 'uint256' },
            { name: 'tokenAddress', type: 'address' },
            { name: 'approvedAddress', type: 'address' }
          ]
        },
        budget
      )
      await proxy.connect(member).transfer(member.address, parseEther('1'), budget, signature)
      const hash = keccak256(signature)
      await proxy.connect(owner).deactivateApproval(hash)
      const usage = await proxy.getExpenseBalance(hash)
      const balance = await token.balanceOf(await proxy.getAddress())
      const registry = { 'ExpenseAccountEIP712Module#FactoryBeacon': await beacon.getAddress() }
      const [before] = await verifyBeaconUpgrade(connection, {
        target: 'ExpenseAccountEIP712',
        expectedVersions: ['2.0.0'],
        deploymentAddresses: registry,
        manifestPath
      })
      const rollbackManifest = readFileSync(manifestPath, 'utf8')
      expect(JSON.parse(rollbackManifest).targets[0].implementation).to.equal(before.implementation)
      const module = (
        await import('../ignition/modules/upgrades/v2.0.2/ExpenseAccountUpgradeModule.js')
      ).default
      const deployed = await connection.ignition.deploy(module, {
        parameters: {
          ExpenseAccountV202UpgradeModule: { factoryBeaconAddress: await beacon.getAddress() }
        }
      })
      const [after] = await verifyBeaconUpgrade(connection, {
        target: 'ExpenseAccountEIP712',
        expectedVersions: ['2.0.2'],
        deploymentAddresses: registry
      })
      expect(after.implementation).to.equal(
        await deployed.newExpenseAccountImplementation.getAddress()
      )
      expect(after.implementation).not.to.equal(before.implementation)
      await expect(
        verifyBeaconUpgrade(connection, {
          target: 'ExpenseAccountEIP712',
          expectedVersions: ['2.0.2'],
          deploymentAddresses: registry,
          manifestPath
        })
      ).to.be.rejectedWith('EEXIST')
      expect(readFileSync(manifestPath, 'utf8')).to.equal(rollbackManifest)
      expect(await proxy.version()).to.equal('2.0.2')
      expect(await proxy.owner()).to.equal(owner.address)
      expect(await proxy.getSupportedTokens()).to.deep.equal([await token.getAddress()])
      expect(await proxy.getExpenseBalance(hash)).to.deep.equal(usage)
      expect(await token.balanceOf(await proxy.getAddress())).to.equal(balance)
      await expect(
        proxy.connect(member).transfer(member.address, parseEther('1'), budget, signature)
      ).to.be.revertedWithCustomError(proxy, 'ExpenseAccountEIP712__ApprovalInactive')
      expect(await token.balanceOf(await proxy.getAddress())).to.equal(balance)
      await proxy.connect(owner).activateApproval(hash)
      await proxy.connect(member).transfer(member.address, parseEther('1'), budget, signature)
      expect(await token.balanceOf(await proxy.getAddress())).to.equal(balance - parseEther('1'))
      expect((await proxy.getExpenseBalance(hash)).totalWithdrawn).to.equal(parseEther('2'))
    } finally {
      rmSync(manifestDirectory, { recursive: true, force: true })
      await connection.close()
    }
  })

  it('rejects a wrong chain, a non-owner signer, or an unexpected deployed version during preflight', async () => {
    const { connection, owner, beacon } = await fixture()
    try {
      const options = {
        target: 'ExpenseAccountEIP712',
        expectedVersions: ['2.0.2'],
        deploymentAddresses: {
          'ExpenseAccountEIP712Module#FactoryBeacon': await beacon.getAddress()
        }
      }
      await expect(verifyBeaconUpgrade(connection, options)).to.be.rejectedWith('expected 2.0.2')
      await beacon.transferOwnership(owner.address)
      await expect(
        verifyBeaconUpgrade(connection, { ...options, expectedVersions: ['2.0.0'] })
      ).to.be.rejectedWith('not owned by the configured upgrade signer')
      const wrongChain = await hre.network.create('hardhat')
      try {
        await expect(verifyBeaconUpgrade(wrongChain, options)).to.be.rejectedWith('does not match')
      } finally {
        await wrongChain.close()
      }
    } finally {
      await connection.close()
    }
  })
})

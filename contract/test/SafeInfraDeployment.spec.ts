import { expect } from 'chai'
import type { EventLog, Log } from 'ethers'
import { ethers, initializeHardhat } from './hardhat-context.js'
import SafeL2Artifact from '@safe-global/safe-contracts/build/artifacts/contracts/SafeL2.sol/SafeL2.json' with { type: 'json' }
import SafeProxyFactoryArtifact from '@safe-global/safe-contracts/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json' with { type: 'json' }
import CompatibilityFallbackHandlerArtifact from '@safe-global/safe-contracts/build/artifacts/contracts/handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json' with { type: 'json' }

before(initializeHardhat)

// Exercises the exact on-chain path the app's ABI-based Safe deployment
// composable relies on (see app/src/composables/safe/useSafeDeployment.ts):
// a manually encoded setup() initializer passed to
// SafeProxyFactory.createProxyWithNonce. These contracts aren't compiled by
// this project — they're deployed here from the official prebuilt
// @safe-global/safe-contracts artifacts, the same ones
// ignition/modules/SafeInfraModule.ts deploys for local dev.
describe('Safe infra deployment (SafeProxyFactory + manual setup() initializer)', function () {
  async function deployInfraFixture() {
    const [deployer, owner1, owner2, owner3] = await ethers.getSigners()

    const singleton = await new ethers.ContractFactory(
      SafeL2Artifact.abi,
      SafeL2Artifact.bytecode,
      deployer
    ).deploy()
    await singleton.waitForDeployment()

    const proxyFactoryDeployment = await new ethers.ContractFactory(
      SafeProxyFactoryArtifact.abi,
      SafeProxyFactoryArtifact.bytecode,
      deployer
    ).deploy()
    await proxyFactoryDeployment.waitForDeployment()
    // Re-wrapped as a plain ethers.Contract: this artifact isn't compiled by
    // this project, so there's no typechain type for it, and BaseContract's
    // static type doesn't expose ABI-derived methods like createProxyWithNonce.
    const proxyFactory = new ethers.Contract(
      await proxyFactoryDeployment.getAddress(),
      SafeProxyFactoryArtifact.abi,
      deployer
    )

    const fallbackHandler = await new ethers.ContractFactory(
      CompatibilityFallbackHandlerArtifact.abi,
      CompatibilityFallbackHandlerArtifact.bytecode,
      deployer
    ).deploy()
    await fallbackHandler.waitForDeployment()

    return { deployer, owner1, owner2, owner3, singleton, proxyFactory, fallbackHandler }
  }

  function encodeSetup(
    singleton: Awaited<ReturnType<typeof deployInfraFixture>>['singleton'],
    fallbackHandlerAddress: string,
    owners: string[],
    threshold: number
  ): string {
    return singleton.interface.encodeFunctionData('setup', [
      owners,
      threshold,
      ethers.ZeroAddress,
      '0x',
      fallbackHandlerAddress,
      ethers.ZeroAddress,
      0,
      ethers.ZeroAddress
    ])
  }

  async function deployProxyAndGetAddress(
    proxyFactory: Awaited<ReturnType<typeof deployInfraFixture>>['proxyFactory'],
    singletonAddress: string,
    initializer: string,
    saltNonce: number
  ): Promise<string> {
    const tx = await proxyFactory.createProxyWithNonce(singletonAddress, initializer, saltNonce)
    const receipt = await tx.wait()

    const event = (receipt!.logs as Array<EventLog | Log>)
      .map((log) => {
        try {
          return proxyFactory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed?.name === 'ProxyCreation')

    if (!event) throw new Error('ProxyCreation event not found in deployment receipt')
    return event.args.proxy as string
  }

  it('deploys a 1-of-1 Safe whose owner/threshold match the manually encoded setup() call', async () => {
    const { owner1, singleton, proxyFactory, fallbackHandler } = await deployInfraFixture()
    const singletonAddress = await singleton.getAddress()
    const initializer = encodeSetup(
      singleton,
      await fallbackHandler.getAddress(),
      [owner1.address],
      1
    )

    const safeAddress = await deployProxyAndGetAddress(
      proxyFactory,
      singletonAddress,
      initializer,
      1
    )

    const safe = new ethers.Contract(safeAddress, SafeL2Artifact.abi, owner1)
    expect(await safe.getThreshold()).to.equal(1n)
    expect(await safe.getOwners()).to.have.members([owner1.address])
  })

  it('deploys a 2-of-3 Safe whose owners/threshold match the manually encoded setup() call', async () => {
    const { owner1, owner2, owner3, singleton, proxyFactory, fallbackHandler } =
      await deployInfraFixture()
    const owners = [owner1.address, owner2.address, owner3.address]
    const initializer = encodeSetup(singleton, await fallbackHandler.getAddress(), owners, 2)

    const safeAddress = await deployProxyAndGetAddress(
      proxyFactory,
      await singleton.getAddress(),
      initializer,
      2
    )

    const safe = new ethers.Contract(safeAddress, SafeL2Artifact.abi, owner1)
    expect(await safe.getThreshold()).to.equal(2n)
    expect(await safe.getOwners()).to.have.members(owners)
  })

  it('produces different Safe addresses for different saltNonce values given the same owners/threshold', async () => {
    const { owner1, singleton, proxyFactory, fallbackHandler } = await deployInfraFixture()
    const singletonAddress = await singleton.getAddress()
    const initializer = encodeSetup(
      singleton,
      await fallbackHandler.getAddress(),
      [owner1.address],
      1
    )

    const addressA = await deployProxyAndGetAddress(proxyFactory, singletonAddress, initializer, 1)
    const addressB = await deployProxyAndGetAddress(proxyFactory, singletonAddress, initializer, 2)

    expect(addressA).to.not.equal(addressB)
  })

  it('reverts when threshold exceeds the owner count', async () => {
    const { owner1, singleton, proxyFactory, fallbackHandler } = await deployInfraFixture()
    const initializer = encodeSetup(
      singleton,
      await fallbackHandler.getAddress(),
      [owner1.address],
      2
    )

    // Safe's proxy factory swallows the nested setup() revert reason (it
    // reverts the outer call with empty returndata), so only a bare revert
    // is observable here — the important thing is that a broken initializer
    // never silently produces a live Safe.
    await expect(
      proxyFactory.createProxyWithNonce(await singleton.getAddress(), initializer, 1)
    ).to.be.revert(ethers)
  })

  it('reverts when owners is empty', async () => {
    const { singleton, proxyFactory, fallbackHandler } = await deployInfraFixture()
    const initializer = encodeSetup(singleton, await fallbackHandler.getAddress(), [], 1)

    await expect(
      proxyFactory.createProxyWithNonce(await singleton.getAddress(), initializer, 1)
    ).to.be.revert(ethers)
  })

  it('reverts when the same saltNonce + initializer pair is reused', async () => {
    const { owner1, singleton, proxyFactory, fallbackHandler } = await deployInfraFixture()
    const singletonAddress = await singleton.getAddress()
    const initializer = encodeSetup(
      singleton,
      await fallbackHandler.getAddress(),
      [owner1.address],
      1
    )

    await deployProxyAndGetAddress(proxyFactory, singletonAddress, initializer, 7)

    await expect(
      proxyFactory.createProxyWithNonce(singletonAddress, initializer, 7)
    ).to.be.revertedWith('Create2 call failed')
  })
})

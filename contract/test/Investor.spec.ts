import { expect } from 'chai'
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

// --- Minimal Merkle helper (sorted-pair hashing, compatible with OpenZeppelin
// MerkleProof.verify). Leaf encoding mirrors the contract:
// keccak256(bytes.concat(keccak256(abi.encode(address, uint256)))).
const abi = ethers.AbiCoder.defaultAbiCoder()

function leafOf(account: string, amount: bigint): string {
  return ethers.keccak256(ethers.keccak256(abi.encode(['address', 'uint256'], [account, amount])))
}

function hashPair(a: string, b: string): string {
  return BigInt(a) < BigInt(b)
    ? ethers.keccak256(ethers.concat([a, b]))
    : ethers.keccak256(ethers.concat([b, a]))
}

function buildLayers(leaves: string[]): string[][] {
  const layers: string[][] = [leaves]
  let layer = leaves
  while (layer.length > 1) {
    const next: string[] = []
    for (let i = 0; i < layer.length; i += 2) {
      next.push(i + 1 === layer.length ? layer[i] : hashPair(layer[i], layer[i + 1]))
    }
    layers.push(next)
    layer = next
  }
  return layers
}

function proofOf(layers: string[][], index: number): string[] {
  const proof: string[] = []
  let idx = index
  for (let l = 0; l < layers.length - 1; l++) {
    const sibling = idx ^ 1
    if (sibling < layers[l].length) proof.push(layers[l][sibling])
    idx = Math.floor(idx / 2)
  }
  return proof
}

type Entry = { account: string; amount: bigint }

function buildTree(entries: Entry[]) {
  const leaves = entries.map((e) => leafOf(e.account, e.amount))
  const layers = buildLayers(leaves)
  return {
    root: layers[layers.length - 1][0],
    proof: (i: number) => proofOf(layers, i)
  }
}

async function deployFixture() {
  const [owner, addr1, addr2, addr3, bankSigner] = await ethers.getSigners()

  const MockOfficerFactory = await ethers.getContractFactory('MockOfficer')
  const mockOfficer = await MockOfficerFactory.deploy()

  const InvestorFactory = await ethers.getContractFactory('Investor')
  const investorImpl = await InvestorFactory.deploy()

  const BeaconFactory = await ethers.getContractFactory('Beacon')
  const beacon = await BeaconFactory.deploy(await investorImpl.getAddress())

  const initData = investorImpl.interface.encodeFunctionData('initialize', [
    'Bitcoin',
    'BTC',
    owner.address
  ])

  const investorAddress = await mockOfficer.deployBeaconProxy.staticCall(
    await beacon.getAddress(),
    initData,
    'Investor'
  )
  await mockOfficer.deployBeaconProxy(await beacon.getAddress(), initData, 'Investor')

  const investor = await ethers.getContractAt('Investor', investorAddress)
  await mockOfficer.setDeployedContract('Bank', bankSigner.address)

  return { investor, mockOfficer, owner, addr1, addr2, addr3, bankSigner }
}

describe('Investor — Merkle-pull migration', () => {
  let investor: Awaited<ReturnType<typeof deployFixture>>['investor']
  let owner: SignerWithAddress
  let addr1: SignerWithAddress
  let addr2: SignerWithAddress
  let addr3: SignerWithAddress
  let bankSigner: SignerWithAddress
  let entries: Entry[]
  let tree: ReturnType<typeof buildTree>

  beforeEach(async () => {
    ;({ investor, owner, addr1, addr2, addr3, bankSigner } = await deployFixture())
    entries = [
      { account: addr1.address, amount: 100n },
      { account: addr2.address, amount: 50n },
      { account: addr3.address, amount: 25n }
    ]
    tree = buildTree(entries)
  })

  describe('setMigrationRoot', () => {
    it('sets the root and emits', async () => {
      await expect(investor.setMigrationRoot(tree.root))
        .to.emit(investor, 'MigrationRootSet')
        .withArgs(tree.root)
      expect(await investor.migrationRoot()).to.equal(tree.root)
    })

    it('reverts for a non-owner', async () => {
      await expect(
        investor.connect(addr1).setMigrationRoot(tree.root)
      ).to.be.revertedWithCustomError(investor, 'OwnableUnauthorizedAccount')
    })
  })

  describe('claim', () => {
    it('mints the caller their snapshot balance against a valid proof', async () => {
      await investor.setMigrationRoot(tree.root)
      await expect(investor.connect(addr1).claim(100n, tree.proof(0)))
        .to.emit(investor, 'MigrationClaimed')
        .withArgs(addr1.address, 100n)
      expect(await investor.balanceOf(addr1.address)).to.equal(100n)
      expect(await investor.migrationClaimed(addr1.address)).to.equal(true)
    })

    it('reverts when the root is not set', async () => {
      await expect(
        investor.connect(addr1).claim(100n, tree.proof(0))
      ).to.be.revertedWithCustomError(investor, 'MigrationRootNotSet')
    })

    it('reverts on an invalid proof', async () => {
      await investor.setMigrationRoot(tree.root)
      await expect(
        investor.connect(addr1).claim(100n, tree.proof(1))
      ).to.be.revertedWithCustomError(investor, 'InvalidProof')
    })

    it('reverts on a tampered amount', async () => {
      await investor.setMigrationRoot(tree.root)
      await expect(
        investor.connect(addr1).claim(999n, tree.proof(0))
      ).to.be.revertedWithCustomError(investor, 'InvalidProof')
    })

    it('reverts on a double claim', async () => {
      await investor.setMigrationRoot(tree.root)
      await investor.connect(addr1).claim(100n, tree.proof(0))
      await expect(
        investor.connect(addr1).claim(100n, tree.proof(0))
      ).to.be.revertedWithCustomError(investor, 'AlreadyMigrated')
    })
  })

  describe('bulkClaim (owner sweep)', () => {
    it('mints unclaimed holders and skips already-claimed ones', async () => {
      await investor.setMigrationRoot(tree.root)
      await investor.connect(addr1).claim(100n, tree.proof(0))

      await investor.bulkClaim(
        [addr1.address, addr2.address, addr3.address],
        [100n, 50n, 25n],
        [tree.proof(0), tree.proof(1), tree.proof(2)]
      )

      expect(await investor.balanceOf(addr1.address)).to.equal(100n) // not double-minted
      expect(await investor.balanceOf(addr2.address)).to.equal(50n)
      expect(await investor.balanceOf(addr3.address)).to.equal(25n)
      expect(await investor.totalSupply()).to.equal(175n)
    })

    it('reverts on mismatched array lengths', async () => {
      await investor.setMigrationRoot(tree.root)
      await expect(
        investor.bulkClaim([addr1.address], [100n, 50n], [tree.proof(0)])
      ).to.be.revertedWithCustomError(investor, 'LengthMismatch')
    })

    it('reverts for a non-owner', async () => {
      await investor.setMigrationRoot(tree.root)
      await expect(
        investor.connect(addr1).bulkClaim([addr2.address], [50n], [tree.proof(1)])
      ).to.be.revertedWithCustomError(investor, 'OwnableUnauthorizedAccount')
    })
  })

  describe('completeMigration', () => {
    it('closes claims once complete', async () => {
      await investor.setMigrationRoot(tree.root)
      await investor.connect(addr1).claim(100n, tree.proof(0))
      await expect(investor.completeMigration()).to.emit(investor, 'MigrationCompleted')

      await expect(investor.connect(addr2).claim(50n, tree.proof(1))).to.be.revertedWithCustomError(
        investor,
        'MigrationAlreadyComplete'
      )
    })
  })

  describe('dividend freeze during migration', () => {
    it('freezes distribution while a migration is in progress and unfreezes on completion', async () => {
      await investor.setMigrationRoot(tree.root)
      await investor.connect(addr1).claim(100n, tree.proof(0))

      await expect(
        investor.connect(bankSigner).distributeNativeDividends(100n, { value: 100n })
      ).to.be.revertedWithCustomError(investor, 'DividendsFrozenDuringMigration')

      await investor.completeMigration()

      await expect(
        investor.connect(bankSigner).distributeNativeDividends(100n, { value: 100n })
      ).to.emit(investor, 'DividendDistributed')
    })
  })

  describe('pausable transfers', () => {
    it('blocks transfers while paused', async () => {
      await investor.setMigrationRoot(tree.root)
      await investor.connect(addr1).claim(100n, tree.proof(0))

      await investor.pause()
      await expect(
        investor.connect(addr1).transfer(addr2.address, 10n)
      ).to.be.revertedWithCustomError(investor, 'EnforcedPause')

      await investor.unpause()
      await investor.connect(addr1).transfer(addr2.address, 10n)
      expect(await investor.balanceOf(addr2.address)).to.equal(10n)
    })
  })

  describe('burn', () => {
    it('lets a holder burn their own shares', async () => {
      await investor.setMigrationRoot(tree.root)
      await investor.connect(addr1).claim(100n, tree.proof(0))

      await investor.connect(addr1).burn(40n)
      expect(await investor.balanceOf(addr1.address)).to.equal(60n)
      expect(await investor.totalSupply()).to.equal(60n)
    })
  })
})

import hre from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'

/**
 * Snapshot a team's deployed `InvestorV1` cap table and build the Merkle tree
 * that the new `Investor` migrates from (see contract/contracts/Investor/Investor.sol
 * and issue #2286).
 *
 * Usage:  INVESTOR_ADDRESS=0x... npm run snapshot-migration -- --network polygon
 *
 * What it does:
 *   1. Reads `getShareholders()` + `totalSupply()` from the given InvestorV1 at the
 *      current block (no archive node needed — this IS the snapshot moment).
 *   2. Verifies sum(shareholder amounts) == totalSupply() — catches `_shareholderSet`
 *      drift before it becomes a bad migration root.
 *   3. Builds a `StandardMerkleTree` over `(address, uint256)` leaves — the same
 *      double-hashed encoding `Investor._migrate` verifies on-chain.
 *   4. Writes an auditable `snapshot.json` (human-readable cap table) and a
 *      `tree.json` (OZ tree dump — root + every proof, reloadable via
 *      `StandardMerkleTree.load()`) to migration-snapshots/<address>/.
 *
 * This script only reads on-chain state; it never sends a transaction. Posting
 * the resulting root (`setMigrationRoot`) and pausing the old contract are separate,
 * deliberate owner actions — not automated here.
 */

const KNOWN_NETWORKS = new Set(['polygon', 'localhost'])

function resolveNetwork(): string {
  const network = hre.network.name
  if (network === 'hardhat') {
    throw new Error(
      'No network selected. Pass `--network <name>` (e.g. polygon, localhost). ' +
        'The in-memory hardhat network holds no real InvestorV1 deployment.'
    )
  }
  if (!KNOWN_NETWORKS.has(network)) {
    console.warn(
      `warning: network "${network}" is not in the known list — using it anyway, but double-check the --network flag`
    )
  }
  return network
}

type Shareholder = { shareholder: string; amount: bigint }

async function main() {
  const network = resolveNetwork()

  const investorAddress = process.env.INVESTOR_ADDRESS
  if (!investorAddress || !hre.ethers.isAddress(investorAddress)) {
    throw new Error(
      'Set INVESTOR_ADDRESS to the deployed InvestorV1 contract address to snapshot ' +
        '(e.g. INVESTOR_ADDRESS=0x... npm run snapshot-migration -- --network polygon).'
    )
  }

  const investor = await hre.ethers.getContractAt('InvestorV1', investorAddress)

  const [rawShareholders, totalSupply, block] = await Promise.all([
    investor.getShareholders(),
    investor.totalSupply(),
    hre.ethers.provider.getBlock('latest')
  ])
  if (!block) throw new Error('Could not fetch the latest block from the provider.')

  const shareholders: Shareholder[] = rawShareholders.map((s) => ({
    shareholder: s.shareholder,
    amount: s.amount
  }))

  if (shareholders.length === 0) {
    throw new Error(`InvestorV1 at ${investorAddress} has no shareholders — nothing to migrate.`)
  }

  const sum = shareholders.reduce((acc, s) => acc + s.amount, 0n)
  if (sum !== totalSupply) {
    throw new Error(
      `Snapshot integrity check failed: sum(shareholder amounts) = ${sum} != totalSupply() = ${totalSupply}. ` +
        'This indicates _shareholderSet drift on the source contract — do not build a migration root from this snapshot.'
    )
  }

  const tree = StandardMerkleTree.of(
    shareholders.map((s) => [s.shareholder, s.amount]),
    ['address', 'uint256']
  )

  const outDir =
    process.env.OUT_DIR ?? path.join(__dirname, '..', 'migration-snapshots', investorAddress)
  fs.mkdirSync(outDir, { recursive: true })

  const snapshotPath = path.join(outDir, 'snapshot.json')
  const treePath = path.join(outDir, 'tree.json')

  const chainId = (await hre.ethers.provider.getNetwork()).chainId

  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        network,
        chainId: chainId.toString(),
        investorV1Address: investorAddress,
        blockNumber: block.number,
        blockTimestamp: block.timestamp,
        totalSupply: totalSupply.toString(),
        shareholderCount: shareholders.length,
        merkleRoot: tree.root,
        shareholders: shareholders.map((s) => ({
          shareholder: s.shareholder,
          amount: s.amount.toString()
        }))
      },
      null,
      2
    ) + '\n'
  )

  fs.writeFileSync(treePath, JSON.stringify(tree.dump(), null, 2) + '\n')

  console.log(
    `Snapshot OK — ${shareholders.length} shareholders, sum matches totalSupply (${totalSupply}).`
  )
  console.log(`Block ${block.number} on ${network} (chainId ${chainId}).`)
  console.log(`Merkle root: ${tree.root}`)
  console.log(`\nWritten:\n  ${snapshotPath}\n  ${treePath}`)
  console.log(
    '\nNext: call setMigrationRoot(root) on the new Investor deployment, then serve each ' +
      'shareholder their proof from tree.json (StandardMerkleTree.load(...).getProof(i)).'
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

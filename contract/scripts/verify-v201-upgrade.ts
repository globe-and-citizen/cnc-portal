import { Contract } from 'ethers'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import hre from 'hardhat'
import {
  getUpgradeChainId,
  loadDeploymentAddresses,
  requireDeploymentAddress
} from '../ignition/lib/deployment-addresses.js'

type UpgradeTarget = {
  id: string
  beaconKey: string
  feeCollectorKey?: string
}

type VerificationResult = {
  target: string
  beacon: string
  beaconOwner: string
  implementation: string
  version: string
}

const TARGETS: UpgradeTarget[] = [
  {
    id: 'CashRemunerationEIP712',
    beaconKey: 'CashRemunerationEIP712Module#FactoryBeacon'
  },
  {
    id: 'ExpenseAccountEIP712',
    beaconKey: 'ExpenseAccountEIP712Module#FactoryBeacon'
  },
  {
    id: 'Investor',
    beaconKey: 'InvestorBeaconModule#Beacon'
  },
  {
    id: 'Officer',
    beaconKey: 'Officer#FactoryBeacon',
    feeCollectorKey: 'FeeCollectorModule#FeeCollector'
  }
]

function selectedTargets(): UpgradeTarget[] {
  const requestedTarget = process.env.CNC_UPGRADE_TARGET ?? 'all'
  if (requestedTarget === 'all') return TARGETS

  const target = TARGETS.find(({ id }) => id === requestedTarget)
  if (!target) {
    throw new Error(
      `Unknown CNC_UPGRADE_TARGET "${requestedTarget}"; expected all or ${TARGETS.map(({ id }) => id).join(', ')}`
    )
  }

  return [target]
}

function expectedVersions(): Set<string> {
  const versions = (process.env.CNC_EXPECTED_VERSIONS ?? '2.0.0,2.0.1')
    .split(',')
    .map((version) => version.trim())
    .filter(Boolean)

  if (versions.length === 0) throw new Error('CNC_EXPECTED_VERSIONS cannot be empty')
  return new Set(versions)
}

function gitRevision(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'unavailable'
  }
}

async function main() {
  const configuredChainId = getUpgradeChainId()
  const connection = await hre.network.getOrCreate()
  const network = await connection.ethers.provider.getNetwork()
  const actualChainId = Number(network.chainId)

  if (actualChainId !== configuredChainId) {
    throw new Error(
      `Connected chain ${actualChainId} does not match CNC_UPGRADE_CHAIN_ID ${configuredChainId}`
    )
  }

  const [upgradeSigner] = await connection.ethers.getSigners()
  const upgradeSignerAddress = await upgradeSigner.getAddress()
  const deployedAddresses = loadDeploymentAddresses(configuredChainId)
  const allowedVersions = expectedVersions()
  const results: VerificationResult[] = []

  for (const target of selectedTargets()) {
    const beaconAddress = requireDeploymentAddress(deployedAddresses, target.beaconKey)
    const beacon = new Contract(
      beaconAddress,
      [
        'function owner() view returns (address)',
        'function implementation() view returns (address)'
      ],
      upgradeSigner
    )
    const beaconOwner = (await beacon.owner()) as string
    if (beaconOwner.toLowerCase() !== upgradeSignerAddress.toLowerCase()) {
      throw new Error(`${target.id} beacon is not owned by the configured upgrade signer`)
    }

    const implementation = (await beacon.implementation()) as string
    if ((await connection.ethers.provider.getCode(implementation)) === '0x') {
      throw new Error(`${target.id} beacon points to an address without contract code`)
    }

    const implementationContract = new Contract(
      implementation,
      [
        'function version() view returns (string)',
        'function getFeeCollector() view returns (address)'
      ],
      connection.ethers.provider
    )
    const version = (await implementationContract.version()) as string
    if (!allowedVersions.has(version)) {
      throw new Error(
        `${target.id} implementation reports version ${version}; expected ${Array.from(allowedVersions).join(' or ')}`
      )
    }

    if (target.feeCollectorKey) {
      const expectedFeeCollector = requireDeploymentAddress(
        deployedAddresses,
        target.feeCollectorKey
      )
      const actualFeeCollector = (await implementationContract.getFeeCollector()) as string
      if (actualFeeCollector.toLowerCase() !== expectedFeeCollector.toLowerCase()) {
        throw new Error('Officer implementation does not use the canonical FeeCollector proxy')
      }
    }

    results.push({
      target: target.id,
      beacon: beaconAddress,
      beaconOwner,
      implementation,
      version
    })
    console.log(`OK ${target.id}: implementation version ${version}`)
  }

  const manifestPath = process.env.CNC_UPGRADE_MANIFEST_PATH
  if (manifestPath) {
    const resolvedManifestPath = path.resolve(manifestPath)
    fs.mkdirSync(path.dirname(resolvedManifestPath), { recursive: true })
    fs.writeFileSync(
      resolvedManifestPath,
      `${JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          chainId: actualChainId,
          gitRevision: gitRevision(),
          upgradeSigner: upgradeSignerAddress,
          targets: results
        },
        null,
        2
      )}\n`
    )
    console.log(`Saved pre-upgrade state to ${resolvedManifestPath}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

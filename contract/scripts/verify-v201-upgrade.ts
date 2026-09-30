import hre from 'hardhat'
import { verifyV201Upgrade } from './lib/v201-upgrade-verification.js'

function expectedVersions(): string[] {
  return (process.env.CNC_EXPECTED_VERSIONS ?? '2.0.0,2.0.1')
    .split(',')
    .map((version) => version.trim())
    .filter(Boolean)
}

async function main() {
  const connection = await hre.network.getOrCreate()
  await verifyV201Upgrade(connection, {
    target: process.env.CNC_UPGRADE_TARGET,
    expectedVersions: expectedVersions(),
    manifestPath: process.env.CNC_UPGRADE_MANIFEST_PATH
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

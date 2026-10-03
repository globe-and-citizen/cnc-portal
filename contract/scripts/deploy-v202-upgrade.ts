import hre from 'hardhat'
import { execFileSync } from 'node:child_process'
import ExpenseAccountUpgradeModule from '../ignition/modules/upgrades/v2.0.2/ExpenseAccountUpgradeModule.js'
import { verifyBeaconUpgrade } from './lib/beacon-upgrade-verification.js'

async function main() {
  if (process.env.CNC_CONFIRM_POLYGON_V202_UPGRADE !== 'upgrade-polygon-v2.0.2') {
    throw new Error(
      'Refusing upgrade without CNC_CONFIRM_POLYGON_V202_UPGRADE=upgrade-polygon-v2.0.2'
    )
  }
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    encoding: 'utf8'
  })
  if (status.trim()) throw new Error('Refusing upgrade from a dirty worktree')
  const manifestPath = process.env.CNC_UPGRADE_MANIFEST_PATH
  if (!manifestPath) throw new Error('CNC_UPGRADE_MANIFEST_PATH is required')

  const connection = await hre.network.getOrCreate()
  const target = 'ExpenseAccountEIP712'
  await verifyBeaconUpgrade(connection, {
    target,
    expectedVersions: ['2.0.0', '2.0.1', '2.0.2'],
    manifestPath
  })
  if (process.env.CNC_PREPARE_ONLY === '1') {
    console.log('Preparation passed. No upgrade transaction was broadcast.')
    return
  }
  const deployed = await connection.ignition.deploy(ExpenseAccountUpgradeModule, {
    displayUi: true
  })
  const [verified] = await verifyBeaconUpgrade(connection, { target, expectedVersions: ['2.0.2'] })
  const expectedImplementation = await deployed.newExpenseAccountImplementation.getAddress()
  if (verified.implementation.toLowerCase() !== expectedImplementation.toLowerCase()) {
    throw new Error(
      'Expense Account beacon does not point to the implementation deployed by this recipe'
    )
  }
  console.log(`Expense Account upgrade verified. Rollback inputs: ${manifestPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

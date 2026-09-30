import hre from 'hardhat'
import { execFileSync } from 'node:child_process'
import CashRemunerationUpgradeModule from '../ignition/modules/upgrades/v2.0.1/CashRemunerationUpgradeModule.js'
import ExpenseAccountUpgradeModule from '../ignition/modules/upgrades/v2.0.1/ExpenseAccountUpgradeModule.js'
import InvestorUpgradeModule from '../ignition/modules/upgrades/v2.0.1/InvestorUpgradeModule.js'
import OfficerUpgradeModule from '../ignition/modules/upgrades/v2.0.1/OfficerUpgradeModule.js'
import { verifyV201Upgrade } from './lib/v201-upgrade-verification.js'

function requireReleaseGuards(): string {
  if (process.env.CNC_CONFIRM_POLYGON_V201_UPGRADE !== 'upgrade-polygon-v2.0.1') {
    throw new Error(
      'Refusing Polygon upgrade without CNC_CONFIRM_POLYGON_V201_UPGRADE=upgrade-polygon-v2.0.1'
    )
  }

  const worktreeStatus = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    encoding: 'utf8'
  })
  if (worktreeStatus.trim() && process.env.CNC_ALLOW_DIRTY_UPGRADE_WORKTREE !== '1') {
    throw new Error('Refusing Polygon upgrade from a dirty worktree')
  }

  const manifestPath = process.env.CNC_UPGRADE_MANIFEST_PATH
  if (!manifestPath) {
    throw new Error('CNC_UPGRADE_MANIFEST_PATH is required before running the live preflight')
  }

  return manifestPath
}

async function main() {
  const manifestPath = requireReleaseGuards()
  const connection = await hre.network.getOrCreate()

  console.log('Verifying beacon ownership and recording rollback inputs...')
  await verifyV201Upgrade(connection, {
    expectedVersions: ['2.0.0', '2.0.1'],
    manifestPath
  })

  if (process.env.CNC_PREPARE_ONLY === '1') {
    console.log('Preparation checks passed. No upgrade transaction was broadcast.')
    return
  }

  async function verifyTarget(target: string) {
    await verifyV201Upgrade(connection, {
      target,
      expectedVersions: ['2.0.1']
    })
  }

  console.log('Upgrading CashRemunerationEIP712...')
  await connection.ignition.deploy(CashRemunerationUpgradeModule, { displayUi: true })
  await verifyTarget('CashRemunerationEIP712')

  console.log('Upgrading ExpenseAccountEIP712...')
  await connection.ignition.deploy(ExpenseAccountUpgradeModule, { displayUi: true })
  await verifyTarget('ExpenseAccountEIP712')

  console.log('Upgrading Investor...')
  await connection.ignition.deploy(InvestorUpgradeModule, { displayUi: true })
  await verifyTarget('Investor')

  console.log('Upgrading Officer...')
  await connection.ignition.deploy(OfficerUpgradeModule, { displayUi: true })
  await verifyTarget('Officer')

  console.log('Verifying the complete Polygon 2.0.1 implementation set...')
  await verifyV201Upgrade(connection, { expectedVersions: ['2.0.1'] })
  console.log(
    `Upgrade complete. Pre-upgrade implementation addresses are stored in ${manifestPath}`
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

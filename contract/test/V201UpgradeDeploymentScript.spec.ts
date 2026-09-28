import { expect } from 'chai'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const contractRoot = path.resolve(import.meta.dirname, '..')
const deploymentScript = path.join(contractRoot, 'deploy-upgrade-v2.0.1.sh')

describe('Polygon 2.0.1 deployment script', function () {
  it('has valid Bash syntax and strict failure handling', function () {
    const syntaxCheck = spawnSync('bash', ['-n', deploymentScript], { encoding: 'utf8' })
    expect(syntaxCheck.status, syntaxCheck.stderr).to.equal(0)
    expect(readFileSync(deploymentScript, 'utf8')).to.include('set -euo pipefail')
  })

  it('refuses Polygon without the exact release confirmation', function () {
    const environment = { ...process.env }
    delete environment.CNC_CONFIRM_POLYGON_V201_UPGRADE

    const result = spawnSync('bash', [deploymentScript, 'polygon'], {
      cwd: contractRoot,
      env: environment,
      encoding: 'utf8'
    })

    expect(result.status).to.equal(1)
    expect(result.stderr).to.include('Refusing Polygon upgrade without')
  })

  it('rejects networks that do not need the production upgrade', function () {
    const result = spawnSync('bash', [deploymentScript, 'localhost'], {
      cwd: contractRoot,
      env: process.env,
      encoding: 'utf8'
    })

    expect(result.status).to.equal(1)
    expect(result.stderr).to.include('Usage:')
    expect(result.stderr).to.include('[polygon]')
  })

  it('uses release-specific modules, upgrades Investor before Officer, and verifies each transition', function () {
    const source = readFileSync(deploymentScript, 'utf8')
    expect(source).to.include(
      'deploy_and_verify CashRemunerationEIP712 ignition/modules/CashRemunerationV201UpgradeModule.ts'
    )
    expect(source).to.include(
      'deploy_and_verify ExpenseAccountEIP712 ignition/modules/ExpenseAccountV201UpgradeModule.ts'
    )
    const investorUpgrade = source.indexOf(
      'deploy_and_verify Investor ignition/modules/InvestorV201UpgradeModule.ts'
    )
    const officerUpgrade = source.indexOf(
      'deploy_and_verify Officer ignition/modules/OfficerV201UpgradeModule.ts'
    )

    expect(investorUpgrade).to.be.greaterThan(-1)
    expect(officerUpgrade).to.be.greaterThan(investorUpgrade)
    expect(source).to.include('CNC_EXPECTED_VERSIONS=2.0.1')
    expect(source).to.include('CNC_UPGRADE_MANIFEST_PATH="$manifest_path"')
    expect(source).to.include('CNC_STORAGE_BASELINE_NETWORK=polygon')
    expect(source).to.not.include('localhost')
    expect(source).to.not.match(
      /ignition\/modules\/(?:CashRemuneration|ExpenseAccount|Investor|Officer)UpgradeModule\.ts/
    )
  })
})

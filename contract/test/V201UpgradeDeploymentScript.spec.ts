import { expect } from 'chai'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

const contractRoot = path.resolve(import.meta.dirname, '..')
const deploymentScript = path.join(contractRoot, 'deploy-upgrade-v2.0.1.sh')
const deploymentOrchestrator = path.join(contractRoot, 'scripts', 'deploy-v201-upgrade.ts')

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
    const source = readFileSync(deploymentOrchestrator, 'utf8')
    expect(source).to.include(
      '../ignition/modules/upgrades/v2.0.1/CashRemunerationUpgradeModule.js'
    )
    expect(source).to.include('../ignition/modules/upgrades/v2.0.1/ExpenseAccountUpgradeModule.js')
    const investorUpgrade = source.indexOf('connection.ignition.deploy(InvestorUpgradeModule')
    const officerUpgrade = source.indexOf('connection.ignition.deploy(OfficerUpgradeModule')

    expect(investorUpgrade).to.be.greaterThan(-1)
    expect(officerUpgrade).to.be.greaterThan(investorUpgrade)
    expect(source.match(/connection\.ignition\.deploy\(/g)).to.have.length(4)
    expect(source).to.include('await verifyTarget')
    expect(source).to.include("expectedVersions: ['2.0.1']")
    expect(source).to.include("process.env.CNC_PREPARE_ONLY === '1'")
    expect(source).to.include('CNC_CONFIRM_POLYGON_V201_UPGRADE')
    expect(source).to.include('CNC_UPGRADE_MANIFEST_PATH is required')
    expect(source).to.include("['status', '--porcelain', '--untracked-files=no']")
    expect(source).to.not.include('localhost')
    expect(source).to.not.include('V201UpgradeModule.ts')
  })

  it('groups static validation without production secrets and opens Polygon only for preflight', function () {
    const fakeBin = mkdtempSync(path.join(os.tmpdir(), 'cnc-v201-upgrade-'))
    const commandLog = path.join(fakeBin, 'commands.log')
    const fakeNpx = path.join(fakeBin, 'npx')
    writeFileSync(
      fakeNpx,
      [
        '#!/usr/bin/env bash',
        'printf "%s|baseline=%s|contracts=%s|target=%s|expected=%s|polygon_url=%s|private_key=%s\\n" "$*" "${CNC_STORAGE_BASELINE_NETWORK:-}" "${CONTRACTS:-}" "${CNC_UPGRADE_TARGET:-}" "${CNC_EXPECTED_IMPLEMENTATION_VERSION:-}" "${POLYGON_URL-unset}" "${PRIVATE_KEY-unset}" >> "$CNC_COMMAND_LOG"'
      ].join('\n')
    )
    chmodSync(fakeNpx, 0o755)

    const environment = {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
      CNC_ALLOW_DIRTY_UPGRADE_WORKTREE: '1',
      CNC_COMMAND_LOG: commandLog,
      CNC_CONFIRM_POLYGON_V201_UPGRADE: 'upgrade-polygon-v2.0.1',
      CNC_PREPARE_ONLY: '1',
      POLYGON_URL: 'must-not-reach-static-validation',
      PRIVATE_KEY: 'must-not-reach-static-validation'
    }

    try {
      const result = spawnSync('bash', [deploymentScript, 'polygon'], {
        cwd: contractRoot,
        env: environment,
        encoding: 'utf8'
      })

      expect(result.status, result.stderr).to.equal(0)
      expect(readFileSync(commandLog, 'utf8').trim().split('\n')).to.deep.equal([
        'hardhat run scripts/validate-upgrade.ts --network hardhat|baseline=polygon|contracts=CashRemunerationEIP712,ExpenseAccountEIP712,Investor,Officer|target=|expected=2.0.1|polygon_url=unset|private_key=unset',
        'hardhat run scripts/deploy-v201-upgrade.ts --network polygon|baseline=|contracts=|target=|expected=|polygon_url=must-not-reach-static-validation|private_key=must-not-reach-static-validation'
      ])
    } finally {
      rmSync(fakeBin, { recursive: true, force: true })
    }
  })

  it('uses one Polygon Hardhat process for the complete live deployment', function () {
    const source = readFileSync(deploymentScript, 'utf8')
    expect(source.match(/npx hardhat run scripts\/deploy-v201-upgrade\.ts/g)).to.have.length(1)
    expect(source).to.not.include('npx hardhat ignition deploy')
    expect(source).to.not.include('deploy_and_verify')
  })
})

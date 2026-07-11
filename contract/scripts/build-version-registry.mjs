#!/usr/bin/env node
//
// Rebuild contract/versions/registry.json from the per-version deployed_addresses.
// beacons/implementations are DERIVED from each version's own addresses, so a
// contract not deployed in a version is correctly absent. Run after
// regenerate-version.sh has (re)written the version folders.
//
//   node contract/scripts/build-version-registry.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..')
const VERSIONS_DIR = join(REPO, 'contract/versions')

// Per-version metadata (deploy commit + on-chain deploy date + on-chain version()
// range for future runtime resolution). Add a row here when cutting a new version.
const VERSIONS = {
  '0.0.0': { commit: '44cd9eb12', deployedAt: '2026-04-02', min: '0.0.0', max: '0.0.999' },
  '0.1.0': {
    commit: '41c1ea08c',
    deployedAt: '2026-04-04',
    min: '0.1.0',
    max: '0.1.999',
    // in-place beacon upgrade → live impl is the upgrade record
    implOverride: {
      ExpenseAccountEIP712: 'ExpenseAccountUpgradeModule#ExpenseAccountEIP712',
      CashRemunerationEIP712: 'CashRemunerationUpgradeModule#CashRemunerationEIP712'
    }
  },
  '1.0.1': { commit: '9613f0882', deployedAt: '2026-04-24', min: '1.0.0', max: '1.999.999' }
}
const CURRENT = '1.0.1'

// Canonical contractType -> Ignition module key. Entries whose key is absent from a
// given version's deployed_addresses are dropped for that version.
const BEACONS = {
  Officer: 'Officer#FactoryBeacon',
  Bank: 'BankBeaconModule#Beacon',
  BoardOfDirectors: 'BoardOfDirectorsModule#Beacon',
  Proposals: 'ProposalBeaconModule#Beacon',
  Elections: 'ElectionsBeaconModule#Beacon',
  InvestorV1: 'InvestorsV1BeaconModule#Beacon',
  Voting: 'VotingBeaconModule#Beacon',
  ExpenseAccountEIP712: 'ExpenseAccountEIP712Module#FactoryBeacon',
  CashRemunerationEIP712: 'CashRemunerationEIP712Module#FactoryBeacon',
  SafeDepositRouter: 'SafeDepositRouterBeaconModule#Beacon',
  Vesting: 'VestingBeaconModule#Beacon',
  FixedReturn: 'FixedReturnBeaconModule#Beacon'
}
const IMPLEMENTATIONS = {
  Officer: 'Officer#Officer',
  Bank: 'BankBeaconModule#Bank',
  BoardOfDirectors: 'BoardOfDirectorsModule#BoardOfDirectors',
  Proposals: 'ProposalBeaconModule#Proposals',
  Elections: 'ElectionsBeaconModule#Elections',
  InvestorV1: 'InvestorsV1BeaconModule#InvestorV1',
  Voting: 'VotingBeaconModule#Voting',
  ExpenseAccountEIP712: 'ExpenseAccountEIP712Module#ExpenseAccountEIP712',
  CashRemunerationEIP712: 'CashRemunerationEIP712Module#CashRemunerationEIP712',
  SafeDepositRouter: 'SafeDepositRouterBeaconModule#SafeDepositRouter',
  Vesting: 'VestingModule#Vesting',
  FixedReturn: 'FixedReturnBeaconModule#FixedReturn',
  FeeCollector: 'FeeCollectorModule#FeeCollector'
}

const filterMap = (map, keys, override = {}) => {
  const out = {}
  for (const [type, moduleKey] of Object.entries(map)) {
    const preferred = override[type]
    if (preferred && keys.has(preferred)) out[type] = preferred
    else if (keys.has(moduleKey)) out[type] = moduleKey
  }
  return out
}

const folders = {}
for (const [version, meta] of Object.entries(VERSIONS)) {
  const addrFile = join(VERSIONS_DIR, version, 'deployed_addresses/chain-137.json')
  if (!existsSync(addrFile)) throw new Error(`missing ${addrFile} — run regenerate-version.sh ${version} <commit>`)
  const addr = JSON.parse(readFileSync(addrFile, 'utf8'))
  const keys = new Set(Object.keys(addr))
  folders[version] = {
    officer: addr['Officer#Officer'],
    commit: meta.commit,
    deployedAt: meta.deployedAt,
    officerVersions: [],
    onchainVersionMin: meta.min,
    onchainVersionMax: meta.max,
    beacons: filterMap(BEACONS, keys),
    implementations: filterMap(IMPLEMENTATIONS, keys, meta.implOverride ?? {})
  }
}

const registry = {
  $comment:
    "Deployment-aligned contract-artifact versions on Polygon. Each folder (contract/versions/<version>/) is a snapshot of the ABIs (recompiled at the deploy commit) + deployed_addresses (copied from git history) for a real POL deployment — see `officer`/`commit`/`deployedAt`. `officerVersions` (backend TeamOfficer.version tags) is left empty for now: runtime per-team resolution is not wired yet, and 0.0.0/0.1.0 share the same Officer (0.1.0 is an in-place beacon upgrade of ExpenseAccount + CashRemuneration). Distributed to consumers as 'version-registry.json' via `npm run mc`. FLAT string maps keep prettier width-stable across consumers. See contract/versions/README.md and UPGRADE_STRATEGY.md.",
  current: CURRENT,
  folders
}
writeFileSync(join(VERSIONS_DIR, 'registry.json'), JSON.stringify(registry, null, 2) + '\n')
console.log(`registry.json written: ${Object.keys(folders).join(', ')} (current ${CURRENT})`)

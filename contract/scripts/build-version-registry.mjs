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
// The three real prod Officer#FactoryBeacon generations (with live teams),
// identified from prod detection across teams — NOT the raw git deploy log
// (deployed_addresses was hand-edited across branches, so it's unreliable).
const VERSIONS = {
  V0: { commit: 'a8c6f815b', deployedAt: '2026-02-20', min: '0.0.0', max: '0.0.999' },
  'V0.1': { commit: 'd79baeaaf', deployedAt: '2026-04-24', min: '0.1.0', max: '0.1.999' },
  V1: { commit: '9613f0882', deployedAt: '2026-04-24', min: '1.0.0', max: '1.999.999' }
}
const CURRENT = 'V1'

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
  if (!existsSync(addrFile))
    throw new Error(`missing ${addrFile} — run regenerate-version.sh ${version} <commit>`)
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
    "Deployment-aligned contract-artifact versions on Polygon, matched to the three real prod Officer#FactoryBeacon generations (detected across teams). Each folder (contract/versions/<version>/) snapshots the ABIs (recompiled at the deploy commit) + deployed_addresses (from git) for one deployment — see `officer`/`commit`/`deployedAt`. V0/V0.1/V1 are three DISTINCT full redeployments (each a new Officer + factory). `officerVersions` (backend TeamOfficer.version tags) is left empty: runtime per-team resolution is not wired yet — but each folder's `officer`/`beacons.Officer` is the concrete on-chain identifier a team maps to. Distributed to consumers as 'version-registry.json' via `npm run mc`. FLAT string maps keep prettier width-stable across consumers. See contract/versions/README.md.",
  current: CURRENT,
  folders
}
writeFileSync(join(VERSIONS_DIR, 'registry.json'), JSON.stringify(registry, null, 2) + '\n')
console.log(`registry.json written: ${Object.keys(folders).join(', ')} (current ${CURRENT})`)

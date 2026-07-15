#!/usr/bin/env node
//
// Distribute the canonical versioned artifacts (contract/versions/<V>/) to every
// consumer. contract/versions/ is the single source of truth; run this after it
// changes (or after build-version-registry.mjs).
//
//   node contract/scripts/distribute-versions.mjs
//
// - app + dashboard + ponder: <V>/json/*.json (flat ABIs) + deployed_addresses/<V>/chain-137.json
// - backend:                   <V>/<hand-maintained-name>.json (its 6 named raw-ABI files)
// The legacy lowercase `v1` snapshot is migrated to `V1` out-of-band via `git rm`
// (a case-insensitive FS makes an in-script rm of v1 unsafe once V1 exists).
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..')
const VERSIONS = join(REPO, 'contract/versions')
const folders = Object.keys(
  JSON.parse(readFileSync(join(VERSIONS, 'registry.json'), 'utf8')).folders
)

// Consumers that take the canonical flat json ABIs + chain-137 addresses, keyed by
// version folder. Their on-disk parents differ (app/dashboard nest under `abi/`,
// ponder under `abis/`), so each names its own abi + address base.
// Only the JSON is packaged — the typed `.ts` wrappers ponder's config imports are a
// deferred runtime concern (hand-maintained, divergent format); these version folders
// are for tracking/audit, matching app + dashboard.
const JSON_CONSUMERS = [
  { abiBase: 'app/src/artifacts/abi', addrBase: 'app/src/artifacts/deployed_addresses' },
  {
    abiBase: 'dashboard/app/artifacts/abi',
    addrBase: 'dashboard/app/artifacts/deployed_addresses'
  },
  { abiBase: 'ponder/abis', addrBase: 'ponder/artifacts/deployed_addresses' }
]

// Backend keeps 6 hand-named raw-ABI files → the contract each maps to.
const BACKEND_MAP = {
  'officer_abi.json': 'Officer',
  'cash_remuneration_eip712_abi.json': 'CashRemunerationEIP712',
  'bod.json': 'BoardOfDirectors',
  'elections.json': 'Elections',
  'expense-account-eip712.json': 'ExpenseAccountEIP712',
  'fixed-return.json': 'FixedReturn'
}
const BACKEND = 'backend/src/artifacts'

const copy = (from, to) => {
  mkdirSync(dirname(to), { recursive: true })
  writeFileSync(to, readFileSync(from))
}

for (const v of folders) {
  const srcAbi = join(VERSIONS, v, 'abi')
  const srcAddr = join(VERSIONS, v, 'deployed_addresses/chain-137.json')
  const abiFiles = readdirSync(srcAbi).filter((f) => f.endsWith('.json'))

  for (const { abiBase, addrBase } of JSON_CONSUMERS) {
    const abiDir = join(REPO, abiBase, v, 'json')
    rmSync(abiDir, { recursive: true, force: true })
    for (const f of abiFiles) copy(join(srcAbi, f), join(abiDir, f))
    copy(srcAddr, join(REPO, addrBase, v, 'chain-137.json'))
  }

  const backendDir = join(REPO, BACKEND, v)
  rmSync(backendDir, { recursive: true, force: true })
  let n = 0
  for (const [file, contract] of Object.entries(BACKEND_MAP)) {
    const abi = join(srcAbi, `${contract}.json`)
    if (existsSync(abi)) {
      copy(abi, join(backendDir, file))
      n++
    }
  }
  console.log(`  ${v}: ${abiFiles.length} abi -> app/dashboard/ponder, ${n} -> backend`)
}

console.log(`distributed ${folders.join(', ')} to app, dashboard, ponder, backend`)

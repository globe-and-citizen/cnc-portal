#!/usr/bin/env node
//
// Distribute the canonical versioned artifacts (contract/versions/<V>/) to every
// consumer. contract/versions/ is the single source of truth; run this after it
// changes (or after build-version-registry.mjs).
//
//   node contract/scripts/distribute-versions.mjs
//
// - app + dashboard: abi/<V>/json/*.json (flat ABIs) + deployed_addresses/<V>/chain-137.json
// - backend:         <V>/<hand-maintained-name>.json (its 6 named raw-ABI files)
// - Removes the legacy lowercase `v1` snapshot from each consumer.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..')
const VERSIONS = join(REPO, 'contract/versions')
const folders = Object.keys(
  JSON.parse(readFileSync(join(VERSIONS, 'registry.json'), 'utf8')).folders
)

// Consumers whose ABI layout mirrors the canonical flat json + deployed_addresses.
const JSON_CONSUMERS = ['app/src/artifacts', 'dashboard/app/artifacts']

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

  for (const base of JSON_CONSUMERS) {
    const abiDir = join(REPO, base, 'abi', v, 'json')
    rmSync(abiDir, { recursive: true, force: true })
    for (const f of abiFiles) copy(join(srcAbi, f), join(abiDir, f))
    copy(srcAddr, join(REPO, base, 'deployed_addresses', v, 'chain-137.json'))
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
  console.log(`  ${v}: ${abiFiles.length} abi -> app/dashboard, ${n} -> backend`)
}

console.log(`distributed ${folders.join(', ')} to app, dashboard, backend`)

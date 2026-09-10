#!/usr/bin/env node

/**
 * Generate the frontend's typed historical ABI modules from the canonical
 * deployment snapshots under contract/versions/<version>/abi.
 *
 * The current ABI keeps its separate Hardhat -> wagmi pipeline. Historical
 * Solidity stays in Git at the commit recorded by versions/registry.json; the
 * committed JSON snapshots are the stable input for this deterministic
 * JSON -> TypeScript packaging step.
 *
 * Usage:
 *   node scripts/versioned-abi-modules.mjs
 *   node scripts/versioned-abi-modules.mjs --check
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { format } from 'prettier'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..')
const VERSIONS_ROOT = join(REPO, 'contract/versions')
const APP_ABI_ROOT = join(REPO, 'app/src/artifacts/abi')
const REGISTRY_FILE = join(VERSIONS_ROOT, 'registry.json')

// Keep export names aligned with the wagmi-generated naming convention. Investor
// changed its source name across generations, but callers use one stable name.
// FixedReturn is optional because it was introduced after the oldest snapshots.
export const FRONTEND_ABI_EXPORTS = [
  { sources: ['AdCampaignManager'], exportName: 'adCampaignManagerAbi' },
  { sources: ['Bank'], exportName: 'bankAbi' },
  { sources: ['BoardOfDirectors'], exportName: 'boardOfDirectorsAbi' },
  { sources: ['CashRemunerationEIP712'], exportName: 'cashRemunerationEip712Abi' },
  { sources: ['Elections'], exportName: 'electionsAbi' },
  { sources: ['ExpenseAccountEIP712'], exportName: 'expenseAccountEip712Abi' },
  { sources: ['FactoryBeacon'], exportName: 'factoryBeaconAbi' },
  { sources: ['FeeCollector'], exportName: 'feeCollectorAbi' },
  { sources: ['FixedReturn'], exportName: 'fixedReturnAbi', optional: true },
  { sources: ['Investor', 'InvestorV1'], exportName: 'investorAbi' },
  { sources: ['Officer'], exportName: 'officerAbi' },
  { sources: ['Proposals'], exportName: 'proposalsAbi' },
  { sources: ['SafeDepositRouter'], exportName: 'safeDepositRouterAbi' },
  { sources: ['Vesting'], exportName: 'vestingAbi' },
  { sources: ['Voting'], exportName: 'votingAbi' }
]

function resolveAbiSource(abiDir, descriptor) {
  for (const sourceName of descriptor.sources) {
    const sourceFile = join(abiDir, `${sourceName}.json`)
    if (existsSync(sourceFile)) return { sourceFile, sourceName }
  }
  if (descriptor.optional) return null
  throw new Error(
    `Missing ${descriptor.sources.join(' or ')} ABI in ${abiDir}; regenerate the canonical snapshot first.`
  )
}

export async function renderVersionedAbiModule(version) {
  const abiDir = join(VERSIONS_ROOT, version, 'abi')
  if (!existsSync(abiDir)) throw new Error(`Missing canonical ABI directory: ${abiDir}`)

  const sections = []
  for (const descriptor of FRONTEND_ABI_EXPORTS) {
    const source = resolveAbiSource(abiDir, descriptor)
    if (!source) continue
    const abi = JSON.parse(readFileSync(source.sourceFile, 'utf8'))
    if (!Array.isArray(abi)) throw new Error(`${source.sourceFile} must contain an ABI array.`)
    sections.push(
      `//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////\n` +
        `// ${source.sourceName}\n` +
        `//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////\n\n` +
        `export const ${descriptor.exportName} = ${JSON.stringify(abi, null, 2)} as const`
    )
  }

  const banner =
    `// This file is generated from contract/versions/${version}/abi by ` +
    `contract/scripts/versioned-abi-modules.mjs. Do not edit it manually.\n\n`
  return format(`${banner}${sections.join('\n\n')}\n`, {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
    printWidth: 100,
    trailingComma: 'none'
  })
}

function frontendJsonDirectories(directory = APP_ABI_ROOT) {
  if (!existsSync(directory)) return []
  const directories = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const child = join(directory, entry.name)
    if (entry.name === 'json') directories.push(child)
    else directories.push(...frontendJsonDirectories(child))
  }
  return directories
}

export async function generateVersionedAbiModules({ check = false } = {}) {
  const registry = JSON.parse(readFileSync(REGISTRY_FILE, 'utf8'))
  const versions = Object.keys(registry.folders)
  const failures = []

  for (const version of versions) {
    const outputFile = join(APP_ABI_ROOT, version, 'generated.ts')
    const expected = await renderVersionedAbiModule(version)
    if (check) {
      const actual = existsSync(outputFile) ? readFileSync(outputFile, 'utf8') : null
      if (actual !== expected) failures.push(`${outputFile} is missing or stale`)
      continue
    }
    mkdirSync(dirname(outputFile), { recursive: true })
    writeFileSync(outputFile, expected)
    console.log(`  wrote app/src/artifacts/abi/${version}/generated.ts`)
  }

  for (const jsonDir of frontendJsonDirectories()) {
    if (check) {
      if (existsSync(jsonDir) && readdirSync(jsonDir).some((file) => file.endsWith('.json'))) {
        failures.push(`${jsonDir} still contains frontend ABI JSON artifacts`)
      }
    } else {
      rmSync(jsonDir, { recursive: true, force: true })
    }
  }

  if (failures.length > 0) throw new Error(failures.join('\n'))
  if (check) console.log(`Versioned ABI modules are current: ${versions.join(', ')}`)
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const args = process.argv.slice(2)
  const unknown = args.filter((arg) => arg !== '--check')
  if (unknown.length > 0) throw new Error(`Unknown argument(s): ${unknown.join(', ')}`)
  await generateVersionedAbiModules({ check: args.includes('--check') })
}

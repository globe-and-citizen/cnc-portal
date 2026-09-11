#!/usr/bin/env node

/**
 * Extract flat ABI arrays from a Hardhat artifact tree.
 *
 * This intentionally understands the artifact JSON shape rather than relying
 * on a version-specific Hardhat exporter plugin. It can therefore package
 * artifacts compiled at old Git commits with their original toolchain.
 *
 * Usage:
 *   node scripts/extract-compiled-abis.mjs <artifact-root> <output-directory>
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

function artifactFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) files.push(...artifactFiles(path))
    else if (entry.endsWith('.json') && !entry.endsWith('.dbg.json')) files.push(path)
  }
  return files
}

export function extractCompiledAbis(artifactRoot, outputDirectory) {
  const sourceRoot = resolve(artifactRoot)
  const destination = resolve(outputDirectory)
  if (!existsSync(sourceRoot))
    throw new Error(`Hardhat artifact directory not found: ${sourceRoot}`)

  const abis = new Map()
  for (const file of artifactFiles(sourceRoot)) {
    let artifact
    try {
      artifact = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      continue
    }
    if (!Array.isArray(artifact.abi) || artifact.abi.length === 0) continue

    const contractName = artifact.contractName ?? basename(file, '.json')
    // Historical Hardhat versions may emit the same imported interface under
    // several source paths, sometimes with context-dependent ABI fragments.
    // The canonical snapshots never expose interface-only artifacts. Names such
    // as Initializable and InvestorV1 remain included because the second letter
    // is lowercase.
    if (/^I[A-Z]/.test(contractName)) continue
    const serialized = JSON.stringify(artifact.abi, null, 2) + '\n'
    const existing = abis.get(contractName)
    if (existing && existing !== serialized) {
      throw new Error(
        `Ambiguous compiled artifacts for ${contractName}; narrow the historical source tree.`
      )
    }
    abis.set(contractName, serialized)
  }

  if (abis.size === 0) throw new Error(`No ABI-bearing Hardhat artifacts found under ${sourceRoot}`)
  rmSync(destination, { recursive: true, force: true })
  mkdirSync(destination, { recursive: true })
  for (const [contractName, abi] of [...abis].sort(([a], [b]) => a.localeCompare(b))) {
    writeFileSync(join(destination, `${contractName}.json`), abi)
  }
  return abis.size
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , artifactRoot, outputDirectory, ...extra] = process.argv
  if (!artifactRoot || !outputDirectory || extra.length > 0) {
    throw new Error(
      'Usage: node scripts/extract-compiled-abis.mjs <artifact-root> <output-directory>'
    )
  }
  const count = extractCompiledAbis(artifactRoot, outputDirectory)
  console.log(`Extracted ${count} ABI files into ${resolve(outputDirectory)}`)
}

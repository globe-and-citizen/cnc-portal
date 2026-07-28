import * as fs from 'node:fs'
import * as path from 'node:path'

// ⚠️ DRIFT WARNING — do not run `npm run update-abi` without reconciling first.
// The typed ABI wrappers actually on disk (app/src/artifacts/abi/*.ts) are
// HAND-MAINTAINED (18 files) in the `import X from './json/X.json'; export const
// X_ABI = X as Abi` form, fed by the abiExporter `json/` output. This script
// instead emits a DIVERGENT inline `as const satisfies Abi` format for only the
// 12 contracts listed below, with kebab names that don't all match the
// hand-written filenames — so running it would clobber/duplicate wrappers.
// The frozen version snapshots (abi/vN/) are produced by scripts/freeze-version.ts,
// which copies the hand-written wrappers verbatim. Reconciling this generator
// (match the JSON-import wrapper format + the full wrapper set, or retire it in
// favour of freeze-version.ts) is tracked as a follow-up. See
// contract/versions/registry.json and the plan in .claude/plans.

// Configuration: list of contracts to copy ABIs for
const contracts = [
  'AdCampaignManager',
  'Bank',
  'BoardOfDirectors',
  'CashRemunerationEIP712',
  'Elections',
  'ExpenseAccountEIP712',
  'Investor',
  'Officer',
  'Proposals',
  'Vesting',
  'SafeDepositRouter'
]

// Source directory for compiled artifacts
const artifactsDir = path.join(import.meta.dirname, '../artifacts/contracts')

// Destination directory for generated TypeScript ABI files
const destinationDir = path.resolve(import.meta.dirname, '../../app/src/artifacts/abi')

// Ensure destination directory exists
if (!fs.existsSync(destinationDir)) {
  fs.mkdirSync(destinationDir, { recursive: true })
}

// Helper function to convert contract name to kebab-case filename
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

// Helper function to convert contract name to constant name
function toConstantName(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase() + '_ABI'
}

// Function to find the correct artifact file for a contract
function findContractArtifact(contractName: string): string | null {
  const possiblePaths = [
    path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`),
    path.join(artifactsDir, `${contractName}`, `${contractName}.sol`, `${contractName}.json`),
    // Check subdirectories
    path.join(artifactsDir, 'expense-account', `${contractName}.sol`, `${contractName}.json`),
    path.join(artifactsDir, 'Elections', `${contractName}.sol`, `${contractName}.json`),
    path.join(artifactsDir, 'Investor', `${contractName}.sol`, `${contractName}.json`),
    path.join(artifactsDir, 'Proposals', `${contractName}.sol`, `${contractName}.json`),
    path.join(artifactsDir, 'Voting', `${contractName}.sol`, `${contractName}.json`),
    path.join(artifactsDir, 'SafeDepositRouter', `${contractName}.sol`, `${contractName}.json`)
  ]

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      return possiblePath
    }
  }

  return null
}

// Function to copy and convert a single contract ABI
function copyContractAbi(contractName: string): void {
  const artifactPath = findContractArtifact(contractName)

  if (!artifactPath) {
    console.warn(`Warning: Could not find artifact for contract ${contractName}`)
    return
  }

  try {
    // Read the compiled artifact
    const artifactContent = fs.readFileSync(artifactPath, 'utf8')
    const artifact = JSON.parse(artifactContent)

    if (!artifact.abi) {
      console.warn(`Warning: No ABI found in artifact for contract ${contractName}`)
      return
    }

    // Generate TypeScript content
    const constantName = toConstantName(contractName)
    const fileName = toKebabCase(contractName)
    const abiContent = JSON.stringify(artifact.abi, null, 2)

    const tsContent = `import type { Abi } from "viem";

export const ${constantName} = ${abiContent} as const satisfies Abi;
`

    // Write to destination file
    const destFilePath = path.join(destinationDir, `${fileName}.ts`)
    fs.writeFileSync(destFilePath, tsContent, 'utf8')

    console.log(`✓ Generated ${destFilePath}`)
  } catch (error) {
    console.error(`Error processing contract ${contractName}:`, error)
  }
}

// Main function
function copyAbis(): void {
  console.log('Starting ABI copy process...')
  console.log(`Source directory: ${artifactsDir}`)
  console.log(`Destination directory: ${destinationDir}`)
  console.log()

  let successCount = 0
  const totalCount = contracts.length

  for (const contractName of contracts) {
    copyContractAbi(contractName)
    successCount++
  }

  console.log()
  console.log(`✓ ABI copy process completed: ${successCount}/${totalCount} contracts processed`)
}

// Run the script
copyAbis()

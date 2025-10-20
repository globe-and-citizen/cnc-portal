import * as fs from 'fs'
import * as path from 'path'

// Configuration: list of contracts to copy ABIs for
const contracts = [
  'AdCampaignManager',
  'Bank',
  'BoardOfDirectors',
  'CashRemunerationEIP712',
  'Elections',
  'ExpenseAccountEIP712',
  // 'ExpenseAccount',
  'InvestorV1',
  // 'Investor',
  'Officer',
  'Proposals',
  // 'Tips',
  'Vesting',
  'Voting'
]

// Source directory for compiled artifacts
const artifactsDir = path.join(__dirname, '../artifacts/contracts')

// Destination directory for generated TypeScript ABI files
const destinationDir = path.resolve(__dirname, '../../app/src/artifacts/abi')

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
    path.join(artifactsDir, 'Voting', `${contractName}.sol`, `${contractName}.json`)
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

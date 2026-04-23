import * as fs from 'fs'
import * as path from 'path'

type HardhatArtifact = {
  _format?: string
  contractName?: string
  sourceName?: string
  abi?: unknown
}

const artifactsDir = path.resolve(__dirname, '../artifacts/contracts')
const destinationDir = path.resolve(__dirname, '../../app/src/artifacts/abi/json')

function walkJsonFiles(dir: string, acc: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      walkJsonFiles(fullPath, acc)
      continue
    }

    if (!entry.name.endsWith('.json') || entry.name.endsWith('.dbg.json')) {
      continue
    }

    acc.push(fullPath)
  }

  return acc
}

function isContractArtifact(artifact: HardhatArtifact): artifact is Required<Pick<HardhatArtifact, 'contractName' | 'abi'>> {
  return (
    typeof artifact.contractName === 'string' &&
    Array.isArray(artifact.abi) &&
    typeof artifact._format === 'string' &&
    artifact._format.startsWith('hh-sol-artifact-')
  )
}

function shouldSkipContract(contractName: string): boolean {
  // Keep parity with abi-exporter config that excludes interfaces.
  return /^I[A-Z].*/.test(contractName)
}

function ensureDestinationDir() {
  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir, { recursive: true })
  }
}

function clearDestinationJsonFiles() {
  const entries = fs.readdirSync(destinationDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      fs.unlinkSync(path.join(destinationDir, entry.name))
    }
  }
}

function moveAbiJson() {
  const shouldClear = process.argv.includes('--clear')

  if (!fs.existsSync(artifactsDir)) {
    throw new Error(`Artifacts directory not found: ${artifactsDir}`)
  }

  ensureDestinationDir()
  if (shouldClear) {
    clearDestinationJsonFiles()
  }

  const files = walkJsonFiles(artifactsDir).sort()
  const seen = new Set<string>()
  let written = 0
  let skipped = 0

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8')
    const artifact = JSON.parse(raw) as HardhatArtifact

    if (!isContractArtifact(artifact)) {
      continue
    }

    if (shouldSkipContract(artifact.contractName)) {
      skipped++
      continue
    }

    const outputFileName = `${artifact.contractName}.json`
    const outputPath = path.join(destinationDir, outputFileName)
    const abiJson = `${JSON.stringify(artifact.abi, null, 2)}\n`

    if (seen.has(outputFileName)) {
      // If duplicates exist, last write wins deterministically due to sorted input.
      console.warn(`Duplicate contract name detected, overwriting: ${outputFileName}`)
    }

    fs.writeFileSync(outputPath, abiJson, 'utf8')
    seen.add(outputFileName)
    written++
  }

  console.log(`ABI JSON sync complete.`)
  console.log(`Artifacts scanned: ${files.length}`)
  console.log(`Files written: ${written}`)
  console.log(`Interfaces skipped: ${skipped}`)
  console.log(`Clear mode: ${shouldClear ? 'enabled' : 'disabled'}`)
  console.log(`Destination: ${destinationDir}`)
}

moveAbiJson()

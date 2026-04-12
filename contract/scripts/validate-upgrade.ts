import hre from 'hardhat'
import { upgrades } from 'hardhat'
import fs from 'fs'
import path from 'path'

type ContractConfig = {
  name: string
  /** Constructor args to pass to validateImplementation for contracts that have
   *  a non-empty constructor (marked `@custom:oz-upgrades-unsafe-allow constructor`). */
  constructorArgs?: unknown[]
}

const UPGRADEABLE_CONTRACTS: ContractConfig[] = [
  { name: 'Bank' },
  { name: 'BoardOfDirectors' },
  { name: 'CashRemunerationEIP712' },
  { name: 'Elections' },
  { name: 'ExpenseAccountEIP712' },
  { name: 'FeeCollector' },
  { name: 'InvestorV1' },
  { name: 'Officer', constructorArgs: ['0x0000000000000000000000000000000000000000'] },
  { name: 'Proposals' },
  { name: 'SafeDepositRouter' },
  { name: 'Tips' },
  { name: 'Vesting' },
  { name: 'Voting' }
]

const BASELINE_ROOT = path.join(__dirname, '..', 'storage-baselines')

/** Networks we accept as real targets. `hardhat` (the in-memory one that hardhat
 *  defaults to when --network is omitted) is rejected so that users can't bake a
 *  baseline against an ephemeral network by mistake. */
const KNOWN_NETWORKS = new Set(['polygon', 'mainnet', 'sepolia', 'amoy', 'localhost'])

function resolveNetwork(): string {
  const network = hre.network.name
  if (network === 'hardhat') {
    throw new Error(
      'No network selected. Pass `--network <name>` (e.g. polygon, localhost). ' +
        'The in-memory hardhat network is not a valid baseline target.'
    )
  }
  if (!KNOWN_NETWORKS.has(network)) {
    console.warn(
      `warning: network "${network}" is not in the known list — using it anyway, but double-check the --network flag`
    )
  }
  return network
}

function baselineDir(network: string): string {
  return path.join(BASELINE_ROOT, network)
}

function baselinePath(network: string, contractName: string): string {
  return path.join(baselineDir(network), `${contractName}.json`)
}

type StorageEntry = {
  label: string
  offset: number
  slot: string
  type: string
  contract?: string
}

type StorageLayout = {
  storage: StorageEntry[]
  types: Record<string, { label: string; encoding?: string; numberOfBytes?: string }> | null
}

async function getStorageLayout(contractName: string): Promise<StorageLayout> {
  const allNames = await hre.artifacts.getAllFullyQualifiedNames()
  const fqn = allNames.find((n) => n.endsWith(':' + contractName))
  if (!fqn) throw new Error(`Contract ${contractName} not found in artifacts`)

  const buildInfo = await hre.artifacts.getBuildInfo(fqn)
  if (!buildInfo) throw new Error(`No build info for ${contractName} — run \`npx hardhat compile\``)

  const [sourceName, name] = fqn.split(':')
  const contractOutput = (buildInfo.output as { contracts: Record<string, Record<string, { storageLayout?: StorageLayout }>> }).contracts[sourceName]?.[name]
  if (!contractOutput?.storageLayout) {
    throw new Error(
      `No storageLayout for ${contractName}. The OpenZeppelin hardhat-upgrades plugin should enable this automatically — check that it is imported in hardhat.config.ts.`
    )
  }
  return contractOutput.storageLayout
}

function resolveType(layout: StorageLayout, typeId: string): string {
  return layout.types?.[typeId]?.label ?? typeId
}

type LayoutDiff = {
  level: 'error' | 'warning'
  message: string
}

function compareLayouts(oldLayout: StorageLayout, newLayout: StorageLayout): LayoutDiff[] {
  const diffs: LayoutDiff[] = []
  const oldStorage = oldLayout.storage ?? []
  const newStorage = newLayout.storage ?? []

  for (let i = 0; i < oldStorage.length; i++) {
    const oldEntry = oldStorage[i]
    const newEntry = newStorage[i]

    if (!newEntry) {
      diffs.push({
        level: 'error',
        message: `slot ${oldEntry.slot} (${oldEntry.label}) was removed`
      })
      continue
    }

    if (oldEntry.slot !== newEntry.slot || oldEntry.offset !== newEntry.offset) {
      diffs.push({
        level: 'error',
        message: `slot ${oldEntry.slot} (${oldEntry.label}) moved to slot ${newEntry.slot}:${newEntry.offset}`
      })
    }

    const oldType = resolveType(oldLayout, oldEntry.type)
    const newType = resolveType(newLayout, newEntry.type)
    if (oldType !== newType) {
      diffs.push({
        level: 'error',
        message: `slot ${oldEntry.slot} (${oldEntry.label}): type changed from \`${oldType}\` to \`${newType}\``
      })
    }

    if (oldEntry.label !== newEntry.label) {
      diffs.push({
        level: 'warning',
        message: `slot ${oldEntry.slot}: renamed \`${oldEntry.label}\` → \`${newEntry.label}\` (OK if intentional, but confirm it's the same variable)`
      })
    }
  }

  const appended = newStorage.slice(oldStorage.length)
  for (const entry of appended) {
    diffs.push({
      level: 'warning',
      message: `new slot ${entry.slot} (${entry.label}: ${resolveType(newLayout, entry.type)}) — appended, compatible`
    })
  }

  return diffs
}

type ValidationResult = {
  name: string
  ok: boolean
  errors: string[]
  warnings: string[]
  skipped?: string
}

async function validateContract(
  config: ContractConfig,
  network: string
): Promise<ValidationResult> {
  const contractName = config.name
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const Factory = await hre.ethers.getContractFactory(contractName)
    await upgrades.validateImplementation(Factory, {
      kind: 'beacon',
      constructorArgs: config.constructorArgs ?? []
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(`OZ safety check failed:\n      ${msg.split('\n').join('\n      ')}`)
  }

  const baseline = baselinePath(network, contractName)
  if (!fs.existsSync(baseline)) {
    const relPath = path.relative(process.cwd(), baseline)
    return {
      name: contractName,
      ok: errors.length === 0,
      errors,
      warnings,
      skipped: `no baseline at ${relPath} — run \`BAKE=1 CONTRACT=${contractName} npm run validate-upgrade -- --network ${network}\` to create it`
    }
  }

  try {
    const baselineLayout: StorageLayout = JSON.parse(fs.readFileSync(baseline, 'utf8'))
    const current = await getStorageLayout(contractName)
    const diffs = compareLayouts(baselineLayout, current)
    for (const d of diffs) {
      if (d.level === 'error') errors.push(d.message)
      else warnings.push(d.message)
    }
  } catch (e) {
    errors.push(`storage layout comparison failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  return {
    name: contractName,
    ok: errors.length === 0,
    errors,
    warnings
  }
}

async function bakeBaseline(contractName: string, network: string) {
  const dir = baselineDir(network)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const layout = await getStorageLayout(contractName)
  const outPath = baselinePath(network, contractName)
  fs.writeFileSync(outPath, JSON.stringify(layout, null, 2) + '\n')
  const rel = path.relative(process.cwd(), outPath)
  console.log(`  baked ${contractName} → ${rel}`)
}

type Status = 'ok' | 'warn' | 'skip' | 'fail'

function statusOf(r: ValidationResult): Status {
  if (!r.ok) return 'fail'
  if (r.skipped) return 'skip'
  if (r.warnings.length > 0) return 'warn'
  return 'ok'
}

function printResult(r: ValidationResult) {
  const s = statusOf(r)
  switch (s) {
    case 'ok':
      console.log(`  OK    ${r.name}`)
      return
    case 'skip':
      console.log(`  SKIP  ${r.name}  (${r.skipped})`)
      return
    case 'warn':
      console.log(`  OK    ${r.name}  (${r.warnings.length} warning${r.warnings.length === 1 ? '' : 's'})`)
      for (const w of r.warnings) console.log(`          ! ${w}`)
      return
    case 'fail':
      console.log(`  FAIL  ${r.name}`)
      for (const e of r.errors) console.log(`          x ${e}`)
      for (const w of r.warnings) console.log(`          ! ${w}`)
      return
  }
}

async function main() {
  const network = resolveNetwork()
  await hre.run('compile', { quiet: true })

  const bakeMode = process.env.BAKE === '1'
  const target = process.env.CONTRACT
  const targets: ContractConfig[] = target
    ? [UPGRADEABLE_CONTRACTS.find((c) => c.name === target) ?? { name: target }]
    : UPGRADEABLE_CONTRACTS

  if (bakeMode) {
    console.log(`\nBaking storage baselines for ${targets.length} contract(s) on network "${network}"...\n`)
    for (const { name } of targets) {
      try {
        await bakeBaseline(name, network)
      } catch (e) {
        console.error(`  FAIL ${name}: ${e instanceof Error ? e.message : String(e)}`)
        process.exitCode = 1
      }
    }
    return
  }

  console.log(`\nValidating ${targets.length} upgradeable contract(s) on network "${network}"...\n`)
  const results: ValidationResult[] = []
  for (const cfg of targets) {
    try {
      results.push(await validateContract(cfg, network))
    } catch (e) {
      results.push({
        name: cfg.name,
        ok: false,
        errors: [e instanceof Error ? e.message : String(e)],
        warnings: []
      })
    }
  }

  for (const r of results) printResult(r)

  const counts = { ok: 0, warn: 0, skip: 0, fail: 0 }
  for (const r of results) counts[statusOf(r)]++

  console.log('')
  console.log(
    `  ${counts.ok + counts.warn} ok, ${counts.skip} skipped, ${counts.fail} failed`
  )

  if (counts.fail > 0) {
    console.log(
      '\nSome contracts cannot be upgraded in place. See UPGRADE_STRATEGY.md for how to decide between upgrade and redeploy.'
    )
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

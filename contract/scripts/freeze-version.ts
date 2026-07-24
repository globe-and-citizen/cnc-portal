import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Freeze the CURRENT top-level artifact set into a versioned snapshot folder
 * (`<version>/`) across every consumer, so an older contract version keeps
 * working for production teams that haven't migrated.
 *
 * Usage:  npm run freeze -- V1
 *
 * Run this BEFORE compiling/deploying the next version (see the release runbook
 * in .claude/plans and contract/UPGRADE_STRATEGY.md). It never compiles — it
 * only copies already-generated artifacts, so the frozen `<version>/` folders
 * are siblings of the `json/` dirs that `abiExporter` wipes with `clear:true`.
 *
 * What it snapshots per consumer:
 *   - ABIs:      the flat `json/*.json` set + the typed wrapper `*.ts` files.
 *   - Addresses: the real-network deployed_addresses (chain-137/11155111/80002);
 *                chain-31337 (local hardhat, per-machine) is intentionally skipped.
 *   - Backend:   its 6 hand-maintained ABI JSONs (raw arrays).
 *
 * It only ever copies files VERBATIM, so every frozen file is byte-identical to
 * a source that already passes its consumer's format/lint gate. It deliberately
 * does NOT generate an index/barrel: that file's style (quotes, semicolons) is
 * consumer-specific, so each consumer's version-aware resolver PR creates its own
 * entry point in its own style.
 */

const rawVersion = process.argv[2]
const versionMatch = rawVersion?.match(/^v?(\d+(?:\.\d+)?)$/i)
if (!versionMatch) {
  console.error('Usage: npm run freeze -- <VN>   (e.g. npm run freeze -- V1)')
  process.exit(1)
}
const version = `V${versionMatch[1]}`

const repoRoot = path.resolve(import.meta.dirname, '../..')

// deployed_addresses to freeze: real networks only. chain-31337 is a per-machine
// local snapshot and meaningless as a historical reference.
const FREEZE_CHAINS = ['chain-137.json', 'chain-11155111.json', 'chain-80002.json']

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

// Copy every file matching `filter` from src into dest (non-recursive; the ABI
// json/ dirs are flat). Returns the copied basenames.
function copyFiles(src: string, dest: string, filter: (f: string) => boolean): string[] {
  if (!fs.existsSync(src)) return []
  ensureDir(dest)
  const copied: string[] = []
  for (const entry of fs.readdirSync(src)) {
    const from = path.join(src, entry)
    if (!fs.statSync(from).isFile() || !filter(entry)) continue
    fs.copyFileSync(from, path.join(dest, entry))
    copied.push(entry)
  }
  return copied
}

// Freeze an ABI dir that holds a flat `json/` folder + sibling wrapper `.ts`
// files (app, dashboard, ponder). Wrappers are copied verbatim: their relative
// `./json/*.json` imports stay valid because json/ is copied alongside them.
// An existing index.ts (a resolver barrel) is intentionally not re-copied — the
// resolver owns it per version.
function freezeAbiDir(abiRoot: string): void {
  if (!fs.existsSync(abiRoot)) {
    console.warn(`  skip (absent): ${path.relative(repoRoot, abiRoot)}`)
    return
  }
  const dest = path.join(abiRoot, version)
  copyFiles(path.join(abiRoot, 'json'), path.join(dest, 'json'), (f) => f.endsWith('.json'))
  const wrappers = copyFiles(abiRoot, dest, (f) => f.endsWith('.ts') && f !== 'index.ts')
  console.log(`  froze ${path.relative(repoRoot, dest)} (${wrappers.length} wrappers)`)
}

// Freeze a deployed_addresses dir (real networks only): copy the top-level
// chain-*.json into the `<version>/` subfolder.
function freezeAddressDir(addrRoot: string): void {
  if (!fs.existsSync(addrRoot)) {
    console.warn(`  skip (absent): ${path.relative(repoRoot, addrRoot)}`)
    return
  }
  const dest = path.join(addrRoot, version)
  const copied = copyFiles(addrRoot, dest, (f) => FREEZE_CHAINS.includes(f))
  console.log(`  froze ${path.relative(repoRoot, dest)} (${copied.length} networks)`)
}

console.log(`Freezing current artifacts as "${version}"...`)

// app
freezeAbiDir(path.join(repoRoot, 'app/src/artifacts/abi'))
freezeAddressDir(path.join(repoRoot, 'app/src/artifacts/deployed_addresses'))

// dashboard
freezeAbiDir(path.join(repoRoot, 'dashboard/app/artifacts/abi'))
freezeAddressDir(path.join(repoRoot, 'dashboard/app/artifacts/deployed_addresses'))

// ponder
freezeAbiDir(path.join(repoRoot, 'ponder/abis'))
freezeAddressDir(path.join(repoRoot, 'ponder/artifacts/deployed_addresses'))

// backend: 6 hand-maintained raw-array ABI JSONs (no wrappers, no json/ subdir).
// version-registry.json also lives here (synced by moveConstants) — it is NOT an
// ABI and must never be frozen into a version folder, so exclude it.
const backendArtifacts = path.join(repoRoot, 'backend/src/artifacts')
const backendDest = path.join(backendArtifacts, version)
const backendCopied = copyFiles(
  backendArtifacts,
  backendDest,
  (f) => f.endsWith('.json') && f !== 'version-registry.json'
)
console.log(
  `  froze ${path.relative(repoRoot, backendDest)} (${backendCopied.length} backend ABIs)`
)

console.log(`Done. Snapshot "${version}" written. Remember to commit the ${version}/ folders.`)

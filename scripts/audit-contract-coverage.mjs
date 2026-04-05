#!/usr/bin/env node
/**
 * audit-contract-coverage.mjs
 *
 * Auto-discovers every contract slug under app/src/composables/* (each having
 * reads.ts and/or writes.ts) and audits whether each contract function has:
 *   - a matching composable
 *   - a mock entry in tests/mocks/contract.mock.ts
 *   - a vi.mock entry in tests/setup/<slug>.setup.ts
 *   - a composable test inside composables/<slug>/__tests__
 *   - consumer components (with/without their own tests)
 *
 * Outputs:
 *   - scripts/out/contract-coverage.json
 *   - scripts/audit-contract-coverage.html (standalone, JSON inlined)
 *
 * Usage:
 *   node scripts/audit-contract-coverage.mjs
 *   node scripts/audit-contract-coverage.mjs --contract=bank
 *   node scripts/audit-contract-coverage.mjs --verbose
 */

import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  mkdirSync,
  existsSync
} from 'fs'
import { join, relative, basename, dirname, extname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const APP_SRC = join(ROOT, 'app/src')
const COMPOSABLES_DIR = join(APP_SRC, 'composables')
const ABI_JSON_DIR = join(APP_SRC, 'artifacts/abi/json')
const MOCKS_FILE = join(APP_SRC, 'tests/mocks/contract.mock.ts')
const SETUP_DIR = join(APP_SRC, 'tests/setup')
const OUT_DIR = join(__dirname, 'out')
const OUT_JSON = join(OUT_DIR, 'contract-coverage.json')
const OUT_HTML = join(__dirname, 'audit-contract-coverage.html')

const VERBOSE = process.argv.includes('--verbose')
const CONTRACT_FILTER = (() => {
  const arg = process.argv.find((a) => a.startsWith('--contract='))
  return arg ? arg.slice('--contract='.length) : null
})()

// ── Manifests ────────────────────────────────────────────────────────────────

/** composable slug → ABI JSON filename (without .json) */
const ABI_JSON_MAP = {
  bank: 'Bank',
  bod: 'BoardOfDirectors',
  investor: 'InvestorV1',
  erc20: 'ERC20',
  elections: 'Elections',
  safeDepositRouter: 'SafeDepositRouter',
  cashRemuneration: 'CashRemunerationEIP712',
  expenseAccount: 'ExpenseAccountEIP712',
  vesting: 'Vesting'
}

/** composable slug → mock namespace prefix used in contract.mock.ts */
const MOCK_NAMESPACE_MAP = {
  bank: 'Bank',
  bod: 'BOD',
  investor: 'Investor',
  erc20: 'Erc20',
  elections: 'Elections',
  safeDepositRouter: 'SafeDepositRouter',
  cashRemuneration: 'CashRemuneration',
  expenseAccount: 'ExpenseAccount',
  vesting: 'Vesting'
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function readIfExists(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : null
}

function walkDir(dir, exts, skipDirs = ['__tests__', 'tests', 'node_modules', '__mocks__']) {
  const results = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (skipDirs.includes(entry)) continue
      results.push(...walkDir(full, exts, skipDirs))
    } else if (exts.includes(extname(entry))) {
      results.push(full)
    }
  }
  return results
}

function walkDirIncluding(dir, exts, onlyInside = '__tests__') {
  const results = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...walkDirIncluding(full, exts, onlyInside))
    } else if (exts.includes(extname(entry))) {
      if (full.split('/').includes(onlyInside)) results.push(full)
    }
  }
  return results
}

const rel = (p) => relative(ROOT, p)

// ── Load abitype (resolved from app/node_modules) ───────────────────────────

async function loadFormatAbiItem() {
  const abitypePath = join(
    ROOT,
    'app/node_modules/abitype/dist/esm/exports/index.js'
  )
  if (!existsSync(abitypePath)) {
    console.warn('⚠ abitype not found at', abitypePath, '— using inline signature formatter')
    return (item) => {
      if (item.type !== 'function') return item.name
      const inputs = (item.inputs || [])
        .map((i) => `${i.type}${i.name ? ' ' + i.name : ''}`)
        .join(', ')
      const outputs = (item.outputs || []).map((o) => o.type).join(', ')
      const mut = item.stateMutability ? ` ${item.stateMutability}` : ''
      return `function ${item.name}(${inputs})${mut}${outputs ? ' returns (' + outputs + ')' : ''}`
    }
  }
  const mod = await import(pathToFileURL(abitypePath).href)
  return mod.formatAbiItem
}

// ── 1. Auto-discover contracts ──────────────────────────────────────────────

function discoverSlugs() {
  const slugs = []
  for (const entry of readdirSync(COMPOSABLES_DIR)) {
    const full = join(COMPOSABLES_DIR, entry)
    if (!statSync(full).isDirectory()) continue
    if (['__tests__', '__mocks__', 'contracts', 'transactions'].includes(entry)) continue
    const hasReads = existsSync(join(full, 'reads.ts'))
    const hasWrites = existsSync(join(full, 'writes.ts'))
    if (hasReads || hasWrites) slugs.push({ slug: entry, hasReads, hasWrites })
  }
  return slugs
}

// ── 2. Extract contract functions from JSON ABI ─────────────────────────────

function loadAbiFunctions(slug, formatAbiItem) {
  const abiName = ABI_JSON_MAP[slug]
  if (!abiName) return { reads: [], writes: [], abiFile: null, error: 'unmapped' }
  const abiFile = join(ABI_JSON_DIR, `${abiName}.json`)
  if (!existsSync(abiFile)) {
    return { reads: [], writes: [], abiFile: rel(abiFile), error: 'abi-missing' }
  }
  const abi = JSON.parse(readFileSync(abiFile, 'utf8'))
  const reads = []
  const writes = []
  for (const item of abi) {
    if (item.type !== 'function') continue
    const signature = formatAbiItem(item)
    const entry = {
      name: item.name,
      signature,
      stateMutability: item.stateMutability,
      inputs: (item.inputs || []).map((i) => ({ name: i.name, type: i.type }))
    }
    if (item.stateMutability === 'view' || item.stateMutability === 'pure') {
      reads.push(entry)
    } else {
      writes.push(entry)
    }
  }
  return { reads, writes, abiFile: rel(abiFile), error: null }
}

// ── 3. Parse composables ────────────────────────────────────────────────────

/**
 * Returns array of { name, kind, contractFn, file }.
 * Splits the file on `export function useXxx(` boundaries, then looks for
 * `functionName: '<fnName>'` or `functionName: <CONST>.<KEY>` inside the block.
 */
function parseComposables(filePath, kind) {
  const src = readIfExists(filePath)
  if (!src) return []

  // 1. Resolve any `const NAMES = { KEY: 'value', ... }` objects in the file
  const constMaps = {}
  const constRe = /const\s+([A-Z_][A-Z0-9_]*)\s*=\s*\{([\s\S]*?)\}\s*as\s+const/g
  let cm
  while ((cm = constRe.exec(src))) {
    const name = cm[1]
    const body = cm[2]
    const map = {}
    const entryRe = /([A-Z_][A-Z0-9_]*)\s*:\s*['"]([^'"]+)['"]/g
    let em
    while ((em = entryRe.exec(body))) map[em[1]] = em[2]
    constMaps[name] = map
  }

  // 2. Split on each exported `use...` function
  const composables = []
  const exportRe = /export\s+(?:function|const)\s+(use[A-Z][A-Za-z0-9_]*)/g
  const positions = []
  let em
  while ((em = exportRe.exec(src))) {
    positions.push({ name: em[1], index: em.index })
  }
  for (let i = 0; i < positions.length; i++) {
    const { name, index } = positions[i]
    const nextIndex = i + 1 < positions.length ? positions[i + 1].index : src.length
    const block = src.slice(index, nextIndex)
    let contractFn = null

    // functionName: 'xxx'
    const m1 = block.match(/functionName\s*:\s*['"]([^'"]+)['"]/)
    if (m1) contractFn = m1[1]

    // functionName: CONST.KEY
    if (!contractFn) {
      const m2 = block.match(/functionName\s*:\s*([A-Z_][A-Z0-9_]*)\.([A-Z_][A-Z0-9_]*)/)
      if (m2 && constMaps[m2[1]] && constMaps[m2[1]][m2[2]]) {
        contractFn = constMaps[m2[1]][m2[2]]
      }
    }

    composables.push({ name, kind, contractFn, file: rel(filePath) })
  }
  return composables
}

// ── 4. Parse mocks (contract.mock.ts) ───────────────────────────────────────

function parseMocks(slug) {
  const src = readIfExists(MOCKS_FILE)
  if (!src) return { reads: {}, writes: {} }
  const ns = MOCK_NAMESPACE_MAP[slug]
  if (!ns) return { reads: {}, writes: {} }

  const extract = (objName) => {
    const re = new RegExp(
      `export\\s+const\\s+${objName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`,
      'm'
    )
    const m = src.match(re)
    if (!m) return null
    const body = m[1]
    const keys = {}
    const keyRe = /^\s*([A-Za-z_$][\w$]*)\s*:/gm
    let km
    while ((km = keyRe.exec(body))) {
      keys[km[1]] = `${objName}.${km[1]}`
    }
    return keys
  }

  return {
    reads: extract(`mock${ns}Reads`) || {},
    writes: extract(`mock${ns}Writes`) || {}
  }
}

// ── 5. Parse setup file ─────────────────────────────────────────────────────

function parseSetup(slug) {
  const setupFile = join(SETUP_DIR, `${slug}.setup.ts`)
  const src = readIfExists(setupFile)
  if (!src) return { file: null, mocked: new Set() }
  const mocked = new Set()
  // vi.mock('@/composables/<slug>/(reads|writes)', () => ({ useXxx: ..., useYyy: ... }))
  const blockRe = new RegExp(
    `vi\\.mock\\(\\s*['"]@/composables/${slug}/(?:reads|writes)['"][\\s\\S]*?=>\\s*\\(\\{([\\s\\S]*?)\\}\\)\\s*\\)`,
    'g'
  )
  let bm
  while ((bm = blockRe.exec(src))) {
    const body = bm[1]
    const keyRe = /\b(use[A-Z][A-Za-z0-9_]*)\s*:/g
    let km
    while ((km = keyRe.exec(body))) mocked.add(km[1])
  }
  return { file: rel(setupFile), mocked }
}

// ── 6. Scan composable tests ────────────────────────────────────────────────

function scanComposableTests(slug) {
  const dir = join(COMPOSABLES_DIR, slug)
  const testFiles = walkDirIncluding(dir, ['.ts'], '__tests__').filter(
    (f) => /\.(spec|test)\.ts$/.test(f)
  )
  const tested = {} // composableName -> [files]
  for (const tf of testFiles) {
    const src = readFileSync(tf, 'utf8')
    const re = /\b(use[A-Z][A-Za-z0-9_]*)\s*\(/g
    let m
    const seen = new Set()
    while ((m = re.exec(src))) seen.add(m[1])
    for (const name of seen) {
      if (!tested[name]) tested[name] = []
      tested[name].push(rel(tf))
    }
  }
  return tested
}

// ── 7. Find consumer components + their tests ──────────────────────────────

function buildAppCorpus() {
  const files = walkDir(APP_SRC, ['.vue', '.ts', '.js'])
  const corpus = new Map()
  for (const f of files) corpus.set(f, readFileSync(f, 'utf8'))
  return corpus
}

function findTestFileFor(file) {
  const dir = dirname(file)
  const base = basename(file, extname(file))
  const candidates = [
    join(dir, `${base}.spec.ts`),
    join(dir, `${base}.test.ts`),
    join(dir, `${base}.spec.js`),
    join(dir, `${base}.test.js`),
    join(dir, '__tests__', `${base}.spec.ts`),
    join(dir, '__tests__', `${base}.test.ts`)
  ]
  return candidates.find((p) => existsSync(p)) || null
}

function hasSkipMarker(src) {
  return /\b(describe|it|test)\.skip\b/.test(src)
}

function findUsages(composableName, corpus, composableFile) {
  const usages = []
  const re = new RegExp(`\\b${composableName}\\s*\\(`)
  const importRe = new RegExp(`\\b${composableName}\\b`)
  for (const [file, content] of corpus) {
    // Skip the composable definition file + its __tests__
    if (file.endsWith(composableFile.replace(/^app\//, 'app/'))) continue
    if (file.includes('/composables/')) continue
    if (file.includes('/__tests__/') || file.includes('/tests/')) continue
    if (!importRe.test(content)) continue
    if (!re.test(content)) continue
    const testFile = findTestFileFor(file)
    let skipped = false
    if (testFile) skipped = hasSkipMarker(readFileSync(testFile, 'utf8'))
    usages.push({
      file: rel(file),
      hasTest: !!testFile,
      testFile: testFile ? rel(testFile) : null,
      skipped
    })
  }
  return usages
}

// ── 8. Assemble report for one contract ────────────────────────────────────

function auditContract(slug, info, corpus, formatAbiItem) {
  const composablesFile = {
    reads: join(COMPOSABLES_DIR, slug, 'reads.ts'),
    writes: join(COMPOSABLES_DIR, slug, 'writes.ts')
  }
  const abi = loadAbiFunctions(slug, formatAbiItem)
  const composables = [
    ...(info.hasReads ? parseComposables(composablesFile.reads, 'read') : []),
    ...(info.hasWrites ? parseComposables(composablesFile.writes, 'write') : [])
  ]
  const mocks = parseMocks(slug)
  const setup = parseSetup(slug)
  const testedComposables = scanComposableTests(slug)

  // Index composables by contract function name
  const byContractFn = new Map() // fn -> array of composable entries
  const composablesWithoutFn = []
  for (const c of composables) {
    if (c.contractFn) {
      if (!byContractFn.has(c.contractFn)) byContractFn.set(c.contractFn, [])
      byContractFn.get(c.contractFn).push(c)
    } else {
      composablesWithoutFn.push(c)
    }
  }

  const usedContractFns = new Set(byContractFn.keys())
  const functions = []

  const buildEntry = (fn, kind) => {
    const matched = byContractFn.get(fn.name) || []
    // pick the one matching kind if multiple
    const composable = matched.find((c) => c.kind === kind) || matched[0] || null

    const mockTable = kind === 'read' ? mocks.reads : mocks.writes
    // Match mock by contractFn name, or by normalized alias
    const mockKey = findMockKey(fn.name, mockTable)

    const setupPresent = composable ? setup.mocked.has(composable.name) : false
    const composableTest = composable
      ? {
          tested: !!testedComposables[composable.name],
          files: testedComposables[composable.name] || []
        }
      : { tested: false, files: [] }

    const usages = composable ? findUsages(composable.name, corpus, composable.file) : []

    // Derive status
    let status = 'ok'
    if (!composable) status = 'missing'
    else {
      const usableUsages = usages.filter((u) => u.hasTest && !u.skipped)
      if (!mockKey || !setupPresent || !composableTest.tested) status = 'partial'
      else if (usages.length > 0 && usableUsages.length === 0) status = 'partial'
    }

    return {
      name: fn.name,
      kind,
      signature: fn.signature,
      stateMutability: fn.stateMutability,
      composable: composable
        ? { name: composable.name, file: composable.file }
        : null,
      mock: { present: !!mockKey, key: mockKey || null },
      setup: { present: setupPresent, file: setup.file },
      composableTest,
      usages,
      status
    }
  }

  for (const fn of abi.reads) functions.push(buildEntry(fn, 'read'))
  for (const fn of abi.writes) functions.push(buildEntry(fn, 'write'))

  // Orphans
  const knownFns = new Set([...abi.reads, ...abi.writes].map((f) => f.name))
  const orphans = {
    composablesWithoutFunction: [
      ...composablesWithoutFn.map((c) => ({ name: c.name, kind: c.kind, file: c.file })),
      ...composables
        .filter((c) => c.contractFn && !knownFns.has(c.contractFn))
        .map((c) => ({ name: c.name, kind: c.kind, contractFn: c.contractFn, file: c.file }))
    ],
    mocksWithoutComposable: [
      ...Object.keys(mocks.reads).filter(
        (k) => !knownFns.has(k) && !aliasMatchesAny(k, abi.reads)
      ).map((k) => mocks.reads[k]),
      ...Object.keys(mocks.writes).filter(
        (k) => !knownFns.has(k) && !aliasMatchesAny(k, abi.writes)
      ).map((k) => mocks.writes[k])
    ],
    setupEntriesWithoutComposable: [...setup.mocked].filter(
      (n) => !composables.some((c) => c.name === n)
    )
  }

  return {
    slug,
    abiFile: abi.abiFile,
    abiError: abi.error,
    readsFile: info.hasReads ? rel(composablesFile.reads) : null,
    writesFile: info.hasWrites ? rel(composablesFile.writes) : null,
    setupFile: setup.file,
    counts: {
      totalFunctions: functions.length,
      ok: functions.filter((f) => f.status === 'ok').length,
      partial: functions.filter((f) => f.status === 'partial').length,
      missing: functions.filter((f) => f.status === 'missing').length,
      usedContractFns: usedContractFns.size
    },
    functions,
    orphans
  }
}

// Mock key aliasing (handle cases like depositToken → deposit)
function findMockKey(fnName, mockTable) {
  if (mockTable[fnName]) return mockTable[fnName]
  // alias: strip "Token"/"Native" suffixes
  const aliases = [
    fnName.replace(/Token$/, ''),
    fnName.replace(/Native$/, ''),
    fnName.replace(/NativeDividends$/, 'NativeDividend'),
    fnName.replace(/TokenDividends$/, 'TokenDividend')
  ]
  for (const a of aliases) {
    if (a !== fnName && mockTable[a]) return mockTable[a]
  }
  return null
}

function aliasMatchesAny(mockKey, abiFns) {
  // Does some ABI function name alias to this mock key?
  for (const fn of abiFns) {
    if (fn.name === mockKey) return true
    if (fn.name.replace(/Token$/, '') === mockKey) return true
    if (fn.name.replace(/Native$/, '') === mockKey) return true
  }
  return false
}

// ── Console rendering ──────────────────────────────────────────────────────

function printSummary(report) {
  console.log('━'.repeat(72))
  console.log(`  Contract coverage audit`)
  console.log(`  Generated: ${report.generatedAt}`)
  console.log('━'.repeat(72))
  for (const c of report.contracts) {
    const { counts } = c
    const pct =
      counts.totalFunctions === 0
        ? 100
        : Math.round((counts.ok / counts.totalFunctions) * 100)
    console.log(
      `  ${c.slug.padEnd(22)} ${String(counts.ok).padStart(3)}/${String(counts.totalFunctions).padEnd(3)} ok  (${pct}%)  partial:${counts.partial} missing:${counts.missing}`
    )
    if (VERBOSE) {
      for (const f of c.functions) {
        const marks =
          (f.composable ? '✓' : '✗') +
          (f.mock.present ? '✓' : '✗') +
          (f.setup.present ? '✓' : '✗') +
          (f.composableTest.tested ? '✓' : '✗')
        console.log(
          `     [${marks}] ${f.kind.padEnd(5)} ${f.name.padEnd(32)} → ${f.composable?.name || '—'} (${f.status})`
        )
      }
      if (c.orphans.composablesWithoutFunction.length) {
        console.log('     orphan composables:')
        for (const o of c.orphans.composablesWithoutFunction)
          console.log(`       - ${o.name} (${o.contractFn || 'no fn'})`)
      }
    }
  }
  console.log('━'.repeat(72))
}

// ── HTML rendering ─────────────────────────────────────────────────────────

function renderHtml(report) {
  const json = JSON.stringify(report, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
  return HTML_TEMPLATE.replace('__REPORT_JSON__', json)
}

const HTML_TEMPLATE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Contract Coverage Audit</title>
<style>
  :root { --ok:#22c55e; --partial:#f59e0b; --missing:#ef4444; --fg:#0f172a; --mut:#64748b; --bg:#f8fafc; --card:#fff; --bd:#e2e8f0; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin:0; background:var(--bg); color:var(--fg); }
  header { padding: 20px 24px; background: #fff; border-bottom:1px solid var(--bd); position:sticky; top:0; z-index:10; }
  h1 { margin:0 0 8px; font-size:20px; }
  .meta { color:var(--mut); font-size:12px; }
  main { padding: 24px; max-width: 1400px; margin:0 auto; }
  .controls { display:flex; gap:12px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
  select, input[type="search"] { padding:8px 10px; border:1px solid var(--bd); border-radius:6px; font-size:14px; background:#fff; }
  .card { background:var(--card); border:1px solid var(--bd); border-radius:10px; padding:16px; margin-bottom:16px; }
  .stats { display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:12px; margin-bottom:16px; }
  .stat { background:var(--card); border:1px solid var(--bd); border-radius:10px; padding:12px 14px; }
  .stat .v { font-size:22px; font-weight:700; }
  .stat .l { font-size:11px; color:var(--mut); text-transform:uppercase; letter-spacing:0.04em; }
  table { width:100%; border-collapse: collapse; font-size:13px; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--bd); vertical-align:top; }
  th { background:#f1f5f9; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:var(--mut); position:sticky; top:0; }
  tr:hover td { background:#f8fafc; }
  .mark { display:inline-block; width:18px; text-align:center; font-weight:700; border-radius:4px; padding:2px 4px; }
  .mark.ok { color:var(--ok); }
  .mark.bad { color:var(--missing); }
  .mark.warn { color:var(--partial); }
  .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; }
  .pill.ok { background:#dcfce7; color:#166534; }
  .pill.partial { background:#fef3c7; color:#92400e; }
  .pill.missing { background:#fee2e2; color:#991b1b; }
  .pill.read { background:#dbeafe; color:#1e40af; }
  .pill.write { background:#f3e8ff; color:#6b21a8; }
  .muted { color:var(--mut); font-size:11px; }
  details { margin-top:8px; }
  summary { cursor:pointer; font-size:12px; color:var(--mut); }
  code { font-family: ui-monospace, "SF Mono", Monaco, Consolas, monospace; font-size:11px; background:#f1f5f9; padding:1px 4px; border-radius:3px; }
  .usage-list { margin:4px 0 0; padding-left:18px; font-size:12px; }
  .tag { font-size:10px; padding:1px 5px; border-radius:3px; background:#e2e8f0; color:#475569; margin-left:4px; }
  .tag.skip { background:#fef3c7; color:#92400e; }
  .tag.no-test { background:#fee2e2; color:#991b1b; }
  .tag.tested { background:#dcfce7; color:#166534; }
</style>
</head>
<body>
<header>
  <h1>Contract Coverage Audit</h1>
  <div class="meta" id="meta"></div>
</header>
<main>
  <div class="controls">
    <label>Contract: <select id="contract-select"></select></label>
    <label>Status: <select id="status-filter">
      <option value="all">All</option>
      <option value="ok">OK only</option>
      <option value="partial">Partial</option>
      <option value="missing">Missing</option>
      <option value="not-ok">Not OK (partial+missing)</option>
    </select></label>
    <input type="search" id="search" placeholder="filter by function name..." />
  </div>
  <div id="content"></div>
</main>
<script id="report" type="application/json">__REPORT_JSON__</script>
<script>
  const report = JSON.parse(document.getElementById('report').textContent);
  document.getElementById('meta').textContent =
    'Generated ' + report.generatedAt + ' · ' + report.contracts.length + ' contract(s)';

  const sel = document.getElementById('contract-select');
  sel.innerHTML = '<option value="__all__">(all contracts)</option>' +
    report.contracts.map(c => '<option value="' + c.slug + '">' + c.slug + ' (' + c.counts.ok + '/' + c.counts.totalFunctions + ')</option>').join('');
  const status = document.getElementById('status-filter');
  const search = document.getElementById('search');
  const content = document.getElementById('content');

  function mark(ok) { return ok ? '<span class="mark ok">✓</span>' : '<span class="mark bad">✗</span>'; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c])); }

  function renderContract(c, filters) {
    const fns = c.functions.filter(f => {
      if (filters.status === 'ok' && f.status !== 'ok') return false;
      if (filters.status === 'partial' && f.status !== 'partial') return false;
      if (filters.status === 'missing' && f.status !== 'missing') return false;
      if (filters.status === 'not-ok' && f.status === 'ok') return false;
      if (filters.search && !f.name.toLowerCase().includes(filters.search)) return false;
      return true;
    });

    const rows = fns.map(f => {
      const usages = (f.usages || []).map(u => {
        const tag = !u.hasTest ? '<span class="tag no-test">no test</span>'
                  : u.skipped ? '<span class="tag skip">skipped</span>'
                  : '<span class="tag tested">tested</span>';
        return '<li><code>' + esc(u.file) + '</code>' + tag + '</li>';
      }).join('');
      return \`
      <tr>
        <td><strong>\${esc(f.name)}</strong><div class="muted"><code>\${esc(f.signature)}</code></div></td>
        <td><span class="pill \${f.kind}">\${f.kind}</span></td>
        <td>\${mark(!!f.composable)}\${f.composable ? '<div class="muted">' + esc(f.composable.name) + '</div>' : ''}</td>
        <td>\${mark(f.mock.present)}\${f.mock.key ? '<div class="muted">' + esc(f.mock.key) + '</div>' : ''}</td>
        <td>\${mark(f.setup.present)}</td>
        <td>\${mark(f.composableTest.tested)}\${f.composableTest.files.length ? '<div class="muted">' + esc(f.composableTest.files[0]) + '</div>' : ''}</td>
        <td>\${(f.usages||[]).length === 0 ? '<span class="muted">—</span>' : '<details><summary>' + f.usages.length + ' usage(s)</summary><ul class="usage-list">' + usages + '</ul></details>'}</td>
        <td><span class="pill \${f.status}">\${f.status}</span></td>
      </tr>\`;
    }).join('');

    const orphans = c.orphans;
    const hasOrphans = orphans.composablesWithoutFunction.length || orphans.mocksWithoutComposable.length || orphans.setupEntriesWithoutComposable.length;

    return \`
    <div class="card">
      <h2 style="margin:0 0 10px;font-size:16px;">\${esc(c.slug)} <span class="muted">· \${esc(c.abiFile || '?')}</span></h2>
      <div class="stats">
        <div class="stat"><div class="v">\${c.counts.totalFunctions}</div><div class="l">Functions</div></div>
        <div class="stat"><div class="v" style="color:var(--ok)">\${c.counts.ok}</div><div class="l">OK</div></div>
        <div class="stat"><div class="v" style="color:var(--partial)">\${c.counts.partial}</div><div class="l">Partial</div></div>
        <div class="stat"><div class="v" style="color:var(--missing)">\${c.counts.missing}</div><div class="l">Missing</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Function</th><th>Kind</th><th>Composable</th><th>Mock</th><th>Setup</th><th>Comp. test</th><th>Used in</th><th>Status</th>
        </tr></thead>
        <tbody>\${rows || '<tr><td colspan="8" class="muted">No functions match filter.</td></tr>'}</tbody>
      </table>
      \${hasOrphans ? \`
      <details style="margin-top:12px">
        <summary><strong>Orphans</strong> (composables/mocks/setup entries not tied to an ABI function)</summary>
        <div style="margin-top:8px; font-size:12px;">
          \${orphans.composablesWithoutFunction.length ? '<p><strong>Composables without contract fn:</strong> ' + orphans.composablesWithoutFunction.map(o=>esc(o.name)+(o.contractFn?' → <code>'+esc(o.contractFn)+'</code>':'')).join(', ') + '</p>' : ''}
          \${orphans.mocksWithoutComposable.length ? '<p><strong>Mocks without matching fn:</strong> ' + orphans.mocksWithoutComposable.map(esc).join(', ') + '</p>' : ''}
          \${orphans.setupEntriesWithoutComposable.length ? '<p><strong>Setup entries without composable:</strong> ' + orphans.setupEntriesWithoutComposable.map(esc).join(', ') + '</p>' : ''}
        </div>
      </details>\` : ''}
    </div>\`;
  }

  function render() {
    const slug = sel.value;
    const filters = { status: status.value, search: search.value.toLowerCase().trim() };
    const list = slug === '__all__' ? report.contracts : report.contracts.filter(c => c.slug === slug);
    content.innerHTML = list.map(c => renderContract(c, filters)).join('');
  }
  sel.addEventListener('change', render);
  status.addEventListener('change', render);
  search.addEventListener('input', render);
  render();
</script>
</body>
</html>
`

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const formatAbiItem = await loadFormatAbiItem()
  const allSlugs = discoverSlugs()
  const slugs = CONTRACT_FILTER
    ? allSlugs.filter((s) => s.slug === CONTRACT_FILTER)
    : allSlugs
  console.log(`Discovered ${allSlugs.length} contract(s):`, allSlugs.map((s) => s.slug).join(', '))
  if (CONTRACT_FILTER) console.log(`Filter: --contract=${CONTRACT_FILTER}`)

  const corpus = buildAppCorpus()
  console.log(`Scanning ${corpus.size} source files for consumer usages...\n`)

  const contracts = slugs.map((info) =>
    auditContract(info.slug, info, corpus, formatAbiItem)
  )

  const report = {
    generatedAt: new Date().toISOString(),
    root: rel(ROOT) || '.',
    contracts
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2))
  writeFileSync(OUT_HTML, renderHtml(report))

  printSummary(report)
  console.log(`\nJSON: ${rel(OUT_JSON)}`)
  console.log(`HTML: ${rel(OUT_HTML)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

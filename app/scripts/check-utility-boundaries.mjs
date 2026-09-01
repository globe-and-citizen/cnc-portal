#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, posix, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const APP_DIRECTORY = dirname(SCRIPT_DIRECTORY)
const SOURCE_DIRECTORY = join(APP_DIRECTORY, 'src')

const TEST_PATH_PATTERN = /(^|\/)(__tests__|__mocks__|tests)(\/|$)|\.(spec|test)\.[^.]+$/
const SOURCE_EXTENSION_PATTERN = /\.(ts|tsx|vue)$/
const IMPORT_PATTERN =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
const FORBIDDEN_RUNTIME_IMPORTS = [
  '@/stores',
  '@/composables',
  '@/queries',
  '@/api',
  '@/lib',
  '@/wagmi.config',
  '@wagmi/core',
  '@wagmi/vue',
  'axios'
]

const isProductionSource = (path) =>
  SOURCE_EXTENSION_PATTERN.test(path) && !TEST_PATH_PATTERN.test(path)

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const extractImportRecords = (source) =>
  [...stripComments(source).matchAll(IMPORT_PATTERN)]
    .map((match) => ({
      specifier: match[1] ?? match[2],
      typeOnly: /^(?:import|export)\s+type\b/.test(match[0])
    }))
    .filter((record) => Boolean(record.specifier))

const extractImports = (source) => extractImportRecords(source).map(({ specifier }) => specifier)

const extractRuntimeImports = (source) =>
  extractImportRecords(source)
    .filter(({ typeOnly }) => !typeOnly)
    .map(({ specifier }) => specifier)

const resolvesToForbiddenBoundary = (specifier) =>
  FORBIDDEN_RUNTIME_IMPORTS.some(
    (boundary) => specifier === boundary || specifier.startsWith(`${boundary}/`)
  )

const resolveUtilityImport = (importer, specifier, utilityFiles) => {
  let base
  if (specifier.startsWith('@/utils/')) {
    base = `src/utils/${specifier.slice('@/utils/'.length)}`
  } else if (specifier.startsWith('.')) {
    base = posix.normalize(posix.join(posix.dirname(importer), specifier))
  } else {
    return null
  }

  const candidates = extname(base) ? [base] : [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]
  return candidates.find((candidate) => utilityFiles.has(candidate)) ?? null
}

const findCycles = (graph) => {
  const visited = new Set()
  const active = new Set()
  const stack = []
  const cycles = new Set()

  const visit = (node) => {
    visited.add(node)
    active.add(node)
    stack.push(node)

    for (const dependency of graph.get(node) ?? []) {
      if (!visited.has(dependency)) {
        visit(dependency)
      } else if (active.has(dependency)) {
        const start = stack.indexOf(dependency)
        const cycle = [...stack.slice(start), dependency]
        cycles.add(cycle.join(' -> '))
      }
    }

    stack.pop()
    active.delete(node)
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) visit(node)
  }

  return [...cycles]
}

export const validateUtilityBoundaries = (files) => {
  const violations = []
  const productionFiles = new Map(
    [...files].filter(([path]) => path.startsWith('src/') && isProductionSource(path))
  )
  const utilityFiles = new Map(
    [...productionFiles].filter(([path]) => path.startsWith('src/utils/'))
  )

  for (const [path, source] of productionFiles) {
    if (extractImports(source).includes('@/utils')) {
      violations.push(
        `${path}: import the owning utility module instead of the global @/utils barrel`
      )
    }
  }

  for (const [path, source] of utilityFiles) {
    const relativePath = path.slice('src/utils/'.length)
    if (!relativePath.includes('/')) {
      violations.push(`${path}: production utilities must belong to a domain directory`)
    }
    if (/Util\.(ts|tsx)$/i.test(relativePath)) {
      violations.push(`${path}: use a responsibility-based filename instead of *Util`)
    }

    for (const specifier of extractRuntimeImports(source)) {
      if (resolvesToForbiddenBoundary(specifier)) {
        violations.push(`${path}: utilities cannot depend on runtime boundary ${specifier}`)
      }
    }

    const executableSource = stripComments(source).replace(/(['"])(?:\\.|(?!\1).)*\1/g, '')
    if (
      /\b(?:window|document|navigator|localStorage|sessionStorage)\s*(?:\.|\[)/.test(
        executableSource
      ) ||
      /\bfetch\s*\(/.test(executableSource)
    ) {
      violations.push(`${path}: browser and HTTP I/O belong in a composable, query, or lib module`)
    }
  }

  const graph = new Map()
  const utilityPaths = new Set(utilityFiles.keys())
  for (const [path, source] of utilityFiles) {
    const dependencies = extractRuntimeImports(source)
      .map((specifier) => resolveUtilityImport(path, specifier, utilityPaths))
      .filter(Boolean)
    graph.set(path, new Set(dependencies))
  }

  for (const cycle of findCycles(graph)) {
    violations.push(`utility import cycle: ${cycle}`)
  }

  return violations.sort()
}

const collectFiles = async (directory, files = new Map()) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(absolutePath, files)
    } else if (SOURCE_EXTENSION_PATTERN.test(entry.name)) {
      const path = relative(APP_DIRECTORY, absolutePath).split(posix.sep).join('/')
      files.set(path, await readFile(absolutePath, 'utf8'))
    }
  }
  return files
}

const main = async () => {
  const violations = validateUtilityBoundaries(await collectFiles(SOURCE_DIRECTORY))
  if (violations.length > 0) {
    console.error('Utility boundary violations:')
    violations.forEach((violation) => console.error(`- ${violation}`))
    process.exitCode = 1
    return
  }

  console.log('Utility boundaries are valid.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}

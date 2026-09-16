#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateAcceptanceCriteriaTraceability } from './lib/acceptance-criteria-traceability.mjs'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

function trackedPaths() {
  return execFileSync('git', ['ls-files'], { cwd: repositoryRoot, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
}

function readDocuments(paths) {
  return paths.map((path) => ({
    path,
    content: readFileSync(resolve(repositoryRoot, path), 'utf8')
  }))
}

const paths = trackedPaths()
const featurePaths = paths.filter(
  (path) =>
    /^docs\/features\/(?:.+\/)?README\.md$/.test(path) &&
    !['docs/features/README.md', 'docs/features/backoffice/README.md'].includes(path)
)
const testPaths = paths.filter((path) =>
  /(?:^|\/)(?:__tests__\/.*|[^/]+\.(?:spec|test))\.[cm]?[jt]sx?$/.test(path)
)
const result = validateAcceptanceCriteriaTraceability({
  featureDocuments: readDocuments(featurePaths),
  testDocuments: readDocuments(testPaths)
})

if (result.errors.length > 0) {
  console.error('Acceptance-criterion traceability failed:')
  for (const error of result.errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  const referencedIds = new Set(result.references.map((reference) => reference.id))
  console.log(
    `Acceptance-criterion traceability is valid: ${result.criteria.length} criteria across ${featurePaths.length} feature documents; ${referencedIds.size} criteria referenced by representative tests.`
  )
}


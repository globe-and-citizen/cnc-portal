#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  summarizeAcceptanceCriterionCoverage,
  validateAcceptanceCriteriaTraceability
} from './lib/acceptance-criteria-traceability.mjs'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

function trackedPaths() {
  return execFileSync('git', ['ls-files'], {
    cwd: repositoryRoot,
    encoding: 'utf8'
  })
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

function featureFilter() {
  const index = process.argv.indexOf('--feature')
  if (index === -1) return null
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error('Expected a feature slug after --feature.')
  }
  return value
}

function coverageMark(paths) {
  return paths.length === 0 ? '—' : `✅ ${paths.length}`
}

function renderFeatureCoverage(document, coverage) {
  const title = document.content.match(/^# (.+?) — User Stories/m)?.[1] ?? document.path
  const rows = coverage.filter((criterion) => criterion.documentPath === document.path)
  const lines = [
    `## ${title}`,
    '',
    '| Acceptance Criterion | Implemented | Frontend | Backend | Contract | E2E |',
    '| -------------------- | ----------- | -------- | ------- | -------- | --- |'
  ]

  for (const criterion of rows) {
    lines.push(
      `| ${criterion.id} | ${criterion.checked ? '✅' : '❌'} | ${coverageMark(criterion.layers.frontend)} | ${coverageMark(criterion.layers.backend)} | ${coverageMark(criterion.layers.contract)} | ${coverageMark(criterion.layers.e2e)} |`
    )
  }

  const evidence = rows.flatMap((criterion) =>
    Object.entries(criterion.layers).flatMap(([layer, paths]) =>
      paths.map((path) => `- \`${criterion.id}\` — ${layer}: \`${path}\``)
    )
  )
  if (evidence.length > 0) lines.push('', '### Representative evidence', '', ...evidence)

  return lines.join('\n')
}

const paths = trackedPaths()
const requestedFeature = featureFilter()
const allFeaturePaths = paths.filter(
  (path) =>
    /^docs\/features\/(?:.+\/)?README\.md$/.test(path) &&
    !['docs/features/README.md', 'docs/features/backoffice/README.md'].includes(path)
)
const featurePaths = requestedFeature
  ? allFeaturePaths.filter((path) => path === `docs/features/${requestedFeature}/README.md`)
  : allFeaturePaths

if (featurePaths.length === 0) {
  throw new Error(`No canonical feature document found for ${requestedFeature ?? 'the request'}.`)
}

const testPaths = paths.filter(
  (path) =>
    path !== 'scripts/acceptance-criteria-traceability.test.mjs' &&
    /(?:^|\/)(?:__tests__\/.*|[^/]+\.(?:spec|test))\.[cm]?[jt]sx?$/.test(path)
)
const featureDocuments = readDocuments(allFeaturePaths)
const result = validateAcceptanceCriteriaTraceability({
  featureDocuments,
  testDocuments: readDocuments(testPaths)
})

if (result.errors.length > 0) {
  throw new Error(`Acceptance-criterion traceability is invalid:\n${result.errors.join('\n')}`)
}

const coverage = summarizeAcceptanceCriterionCoverage(result.criteria, result.references)
const requestedDocuments = featureDocuments.filter((document) =>
  featurePaths.includes(document.path)
)
const report = [
  '# Acceptance-Criterion Test Coverage',
  '',
  `**Generated:** ${new Date().toISOString()}`,
  '',
  'Generated from representative `AC-US-*` references. Counts identify evidence by repository layer; they do not prove exhaustive coverage or a passing latest run.',
  '',
  requestedDocuments.map((document) => renderFeatureCoverage(document, coverage)).join('\n\n'),
  ''
].join('\n')
const reportName = requestedFeature
  ? `${requestedFeature.replaceAll('/', '-')}.md`
  : 'all-features.md'
const reportDirectory = resolve(repositoryRoot, 'reports/acceptance-coverage')
const reportPath = resolve(reportDirectory, reportName)

mkdirSync(reportDirectory, { recursive: true })
writeFileSync(reportPath, report, 'utf8')
console.log(`Acceptance-criterion coverage report written to ${reportPath}`)

#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  TEST_COVERAGE_LAYERS,
  summarizeAcceptanceCriterionCoverage,
  summarizeTestFileInventory,
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

function featureTitle(document) {
  return document.content.match(/^# (.+?) — User Stories/m)?.[1] ?? document.path
}

function renderStoryCoverage(storyId, rows) {
  const lines = [
    `### ${storyId}`,
    '',
    '| Acceptance Criterion | Implemented | Integrated E2E | Mocked Browser | Frontend | Backend | Contract | Dashboard |',
    '| -------------------- | ----------- | -------------- | -------------- | -------- | ------- | -------- | --------- |'
  ]

  for (const criterion of rows) {
    lines.push(
      `| ${criterion.id} | ${criterion.checked ? '✅' : '❌'} | ${coverageMark(criterion.e2eModes.integrated)} | ${coverageMark(criterion.e2eModes.mocked)} | ${coverageMark(criterion.layers.frontend)} | ${coverageMark(criterion.layers.backend)} | ${coverageMark(criterion.layers.contract)} | ${coverageMark(criterion.layers.dashboard)} |`
    )
  }

  return lines.join('\n')
}

function renderFeatureCoverage(document, coverage, inventory) {
  const title = featureTitle(document)
  const rows = coverage.filter((criterion) => criterion.documentPath === document.path)
  const rowsByStory = new Map()
  for (const criterion of rows) {
    const storyRows = rowsByStory.get(criterion.storyId) ?? []
    storyRows.push(criterion)
    rowsByStory.set(criterion.storyId, storyRows)
  }
  const lines = [
    `## ${title}`,
    '',
    ...[...rowsByStory].flatMap(([storyId, storyRows]) => [renderStoryCoverage(storyId, storyRows), ''])
  ]

  const evidence = rows.flatMap((criterion) =>
    Object.entries(criterion.layers).flatMap(([layer, paths]) =>
      paths.map((path) => `- \`${criterion.id}\` — ${layer}: \`${path}\``)
    )
  )
  if (evidence.length > 0) lines.push('### Representative evidence', '', ...evidence)

  const mappedFiles = inventory.filter((testFile) => testFile.featureDocuments.includes(document.path))
  if (mappedFiles.length > 0) {
    lines.push(
      '',
      '### Mapped test files',
      '',
      '| Layer | Test File | Static Tests | Mapping | User Stories | Acceptance Criteria |',
      '| ----- | --------- | ------------ | ------- | ------------ | ------------------- |',
      ...mappedFiles.map(
        (testFile) =>
          `| ${testFile.layer} | \`${testFile.path}\` | ${testFile.declarations} | ${testFile.mappingSources.join(' + ')} | ${testFile.storyIds.join(', ') || 'Feature support only'} | ${testFile.acceptanceIds.length} |`
      )
    )
  }

  return lines.join('\n')
}

function renderFeatureOverview(featureDocuments, criteria, inventory) {
  const lines = [
    '## Feature Test Coverage Overview',
    '',
    'A file may support more than one feature. Story-linked and AC-evidence counts require direct identifiers in the test; feature-only',
    'support comes from canonical Implementation Evidence and is not presented as story or criterion proof.',
    '',
    '| Feature | US | AC | Files | Story Linked | AC Evidence | Feature Only | Integrated E2E | Mocked E2E | Frontend | Backend | Contract | Dashboard | Other |',
    '| ------- | -- | -- | ----- | ------------ | ----------- | ------------ | -------------- | ---------- | -------- | ------- | -------- | --------- | ----- |'
  ]

  for (const document of featureDocuments) {
    const featureCriteria = criteria.filter((criterion) => criterion.documentPath === document.path)
    const featureStoryIds = new Set(featureCriteria.map((criterion) => criterion.storyId))
    const featureAcceptanceIds = new Set(featureCriteria.map((criterion) => criterion.id))
    const files = inventory.filter((testFile) => testFile.featureDocuments.includes(document.path))
    const storyLinked = files.filter((testFile) =>
      testFile.storyIds.some((storyId) => featureStoryIds.has(storyId))
    )
    const acceptanceLinked = files.filter((testFile) =>
      testFile.acceptanceIds.some((acceptanceId) => featureAcceptanceIds.has(acceptanceId))
    )
    const directlyMapped = new Set([...storyLinked, ...acceptanceLinked].map((testFile) => testFile.path))
    const layerCount = (layer) => files.filter((testFile) => testFile.layer === layer).length
    const e2eModeCount = (mode) => files.filter((testFile) => testFile.e2eMode === mode).length

    lines.push(
      `| ${featureTitle(document)} | ${featureStoryIds.size} | ${featureCriteria.length} | ${files.length} | ${storyLinked.length} | ${acceptanceLinked.length} | ${files.length - directlyMapped.size} | ${e2eModeCount('integrated')} | ${e2eModeCount('mocked')} | ${layerCount('frontend')} | ${layerCount('backend')} | ${layerCount('contract')} | ${layerCount('dashboard')} | ${layerCount('other')} |`
    )
  }

  return lines.join('\n')
}

function renderAuditSnapshot(featureDocuments, criteria, inventory) {
  const totalDeclarations = inventory.reduce((sum, testFile) => sum + testFile.declarations, 0)
  const classifiedFiles = inventory.filter(
    (testFile) => testFile.featureDocuments.length > 0 || testFile.technicalDocuments.length > 0
  )
  const productFiles = inventory.filter((testFile) => testFile.featureDocuments.length > 0)
  const storyIds = new Set(criteria.map((criterion) => criterion.storyId))
  const linkedStoryIds = new Set(inventory.flatMap((testFile) => testFile.storyIds))
  const acceptanceIds = new Set(criteria.map((criterion) => criterion.id))
  const linkedAcceptanceIds = new Set(inventory.flatMap((testFile) => testFile.acceptanceIds))
  const integratedE2e = inventory.filter((testFile) => testFile.e2eMode === 'integrated')
  const mockedE2e = inventory.filter((testFile) => testFile.e2eMode === 'mocked')
  const featureDocumentsWithoutTests = featureDocuments.filter(
    (document) => !inventory.some((testFile) => testFile.featureDocuments.includes(document.path))
  )
  const dashboardFiles = inventory.filter((testFile) => testFile.layer === 'dashboard')

  return [
    '## Coverage Audit Snapshot',
    '',
    `- Inventory: ${classifiedFiles.length}/${inventory.length} tracked test files classified; ${totalDeclarations} static test declarations.`,
    `- Product mapping: ${productFiles.length} files mapped to at least one product feature.`,
    `- Explicit story traceability: ${linkedStoryIds.size}/${storyIds.size} user stories referenced by tests.`,
    `- Representative AC evidence: ${linkedAcceptanceIds.size}/${acceptanceIds.size} acceptance criteria referenced by tests.`,
    `- E2E suites: ${integratedE2e.length} integrated, ${mockedE2e.length} mocked, ${inventory.filter((testFile) => testFile.layer === 'e2e' && testFile.e2eMode === 'unclassified').length} unclassified.`,
    `- Dashboard suites: ${dashboardFiles.length}; ${dashboardFiles.length === 0 ? 'coverage gap recorded' : 'coverage present'}.`,
    `- Features without a mapped test file: ${featureDocumentsWithoutTests.length === 0 ? 'none' : featureDocumentsWithoutTests.map(featureTitle).join(', ')}.`,
    '',
    'Counts describe repository evidence, not a latest passing run. A missing direct ID is a traceability gap; it does not by itself prove',
    'that the behavior is untested.'
  ].join('\n')
}

function renderRepositoryInventory(inventory) {
  const lines = [
    '## Repository Test Inventory',
    '',
    '| Layer | Test Files | Static Tests | Feature Mapped | Technical Only | Unmapped Files |',
    '| ----- | ---------- | ------------ | -------------- | -------------- | -------------- |'
  ]

  for (const layer of TEST_COVERAGE_LAYERS) {
    const files = inventory.filter((testFile) => testFile.layer === layer)
    const featureMapped = files.filter((testFile) => testFile.featureDocuments.length > 0)
    const technicalOnly = files.filter(
      (testFile) => testFile.featureDocuments.length === 0 && testFile.technicalDocuments.length > 0
    )
    const unmapped = files.filter(
      (testFile) => testFile.featureDocuments.length === 0 && testFile.technicalDocuments.length === 0
    )
    lines.push(
      `| ${layer} | ${files.length} | ${files.reduce((sum, testFile) => sum + testFile.declarations, 0)} | ${featureMapped.length} | ${technicalOnly.length} | ${unmapped.length} |`
    )
  }

  const technicalOnly = inventory.filter(
    (testFile) => testFile.featureDocuments.length === 0 && testFile.technicalDocuments.length > 0
  )
  if (technicalOnly.length > 0) {
    lines.push(
      '',
      '### Technical-Only Test Files',
      '',
      'These files are linked from canonical contract or implementation documentation but have no product-feature or US/AC mapping.',
      '',
      ...technicalOnly.map(
        (testFile) =>
          `- \`${testFile.path}\` — ${testFile.declarations} static test declarations; owners: ${testFile.technicalDocuments.map((path) => `\`${path}\``).join(', ')}`
      )
    )
  }

  const unmapped = inventory.filter(
    (testFile) => testFile.featureDocuments.length === 0 && testFile.technicalDocuments.length === 0
  )
  lines.push(
    '',
    '### Unmapped Test Files',
    '',
    ...(unmapped.length === 0
      ? ['No tracked test file is currently unmapped.', '']
      : [
          'These files remain part of the audit checklist. They need either an explicit US/AC mapping or a documented classification as shared',
          'technical coverage; they are not silently counted as product acceptance evidence.',
          ''
        ])
  )

  for (const layer of TEST_COVERAGE_LAYERS) {
    const files = unmapped.filter((testFile) => testFile.layer === layer)
    if (files.length === 0) continue
    lines.push(
      `#### ${layer}`,
      '',
      ...files.map((testFile) => `- [ ] \`${testFile.path}\` — ${testFile.declarations} static test declarations`),
      ''
    )
  }

  return lines.join('\n')
}

const paths = trackedPaths()
const requestedFeature = featureFilter()
const allFeaturePaths = paths.filter(
  (path) =>
    /^docs\/features\/(?:.+\/)?README\.md$/.test(path) &&
    !['docs/features/README.md', 'docs/features/backoffice/README.md'].includes(path)
)
const technicalDocumentPaths = paths.filter(
  (path) =>
    /^(?:docs\/contracts\/features|docs\/implementation)\/(?:.+\/)?README\.md$/.test(path) &&
    path !== 'docs/contracts/features/README.md'
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
const technicalDocuments = readDocuments(technicalDocumentPaths)
const testDocuments = readDocuments(testPaths)
const result = validateAcceptanceCriteriaTraceability({
  featureDocuments,
  testDocuments
})

if (result.errors.length > 0) {
  throw new Error(`Acceptance-criterion traceability is invalid:\n${result.errors.join('\n')}`)
}

const coverage = summarizeAcceptanceCriterionCoverage(result.criteria, result.references)
const inventory = summarizeTestFileInventory(
  result.criteria,
  testDocuments,
  featureDocuments,
  technicalDocuments
)
const requestedDocuments = featureDocuments.filter((document) => featurePaths.includes(document.path))
const report = [
  '# Acceptance-Criterion Test Coverage',
  '',
  `**Generated:** ${new Date().toISOString()}`,
  '',
  'Generated from tracked test declarations plus representative `US-*` and `AC-US-*` references. The inventory keeps unmapped tests visible, while acceptance counts distinguish repository layers, integrated E2E journeys, and mocked browser tests. References do not prove exhaustive coverage or a passing latest run.',
  '',
  renderRepositoryInventory(inventory),
  '',
  renderAuditSnapshot(requestedDocuments, result.criteria, inventory),
  '',
  renderFeatureOverview(requestedDocuments, result.criteria, inventory),
  '',
  requestedDocuments.map((document) => renderFeatureCoverage(document, coverage, inventory)).join('\n\n'),
  ''
].join('\n')
const reportName = requestedFeature ? `${requestedFeature.replaceAll('/', '-')}.md` : 'all-features.md'
const reportDirectory = resolve(repositoryRoot, 'reports/acceptance-coverage')
const reportPath = resolve(reportDirectory, reportName)

mkdirSync(reportDirectory, { recursive: true })
writeFileSync(reportPath, report, 'utf8')
console.log(`Acceptance-criterion coverage report written to ${reportPath}`)

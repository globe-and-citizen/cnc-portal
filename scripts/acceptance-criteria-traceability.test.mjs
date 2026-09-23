import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyE2eCoverageMode,
  classifyTestCoverageLayer,
  countStaticTestDeclarations,
  parseAcceptanceCoverageRows,
  parseAcceptanceCriteria,
  summarizeAcceptanceCriterionCoverage,
  summarizeTestFileInventory,
  validateAcceptanceCriteriaTraceability
} from './lib/acceptance-criteria-traceability.mjs'

const feature = (content, path = 'docs/features/example/README.md') => ({
  path,
  content
})
const testDocument = (content, path = 'app/src/example/__tests__/example.spec.ts') => ({
  path,
  content
})

const validFeature = feature(`# Example — User Stories

## US-EXAMPLE-001: Do Something

### Acceptance Criteria

#### Happy Path

- [x] \`AC-US-EXAMPLE-001-01\` The primary outcome succeeds.

#### Edge & Error Cases

- [ ] \`AC-US-EXAMPLE-001-02\` A failure preserves the previous state.
`)

test('parses acceptance criteria only inside a user story acceptance section', () => {
  assert.deepEqual(parseAcceptanceCriteria(validFeature), [
    {
      documentPath: validFeature.path,
      line: 9,
      storyId: 'US-EXAMPLE-001',
      checked: true,
      id: 'AC-US-EXAMPLE-001-01',
      outcome: 'The primary outcome succeeds.'
    },
    {
      documentPath: validFeature.path,
      line: 13,
      storyId: 'US-EXAMPLE-001',
      checked: false,
      id: 'AC-US-EXAMPLE-001-02',
      outcome: 'A failure preserves the previous state.'
    }
  ])
})

test('accepts structured coverage comments for representative test references', () => {
  const result = validateAcceptanceCriteriaTraceability({
    featureDocuments: [validFeature],
    testDocuments: [
      testDocument(`describe('[US-EXAMPLE-001] Example', () => {
  /**
   * Covers:
   * - [AC-US-EXAMPLE-001-01]
   */
  it('proves the primary outcome', () => {})
})`)
    ]
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.criteria.length, 2)
  assert.equal(result.references.length, 1)
})

test('validates optional per-story coverage targets against representative evidence', () => {
  const documentedCoverage = feature(`${validFeature.content}

### Test Coverage

| Acceptance Criterion | Expected Coverage | Current Coverage | Status |
| -------------------- | ----------------- | ---------------- | ------ |
| \`AC-US-EXAMPLE-001-01\` | Integrated E2E | Integrated E2E | ✅ Met |
| \`AC-US-EXAMPLE-001-02\` | Mocked browser | None linked | ❌ Missing |
`)
  const integratedTest = testDocument(
    `test.describe('journey', { tag: '@integrated' }, () => {
  /**
   * Covers:
   * - [AC-US-EXAMPLE-001-01]
   */
  test('proves the primary outcome', () => {})
})`,
    'app/test/e2e/example.integrated.spec.ts'
  )

  assert.equal(parseAcceptanceCoverageRows(documentedCoverage).length, 2)
  assert.deepEqual(
    validateAcceptanceCriteriaTraceability({
      featureDocuments: [documentedCoverage],
      testDocuments: [integratedTest]
    }).errors,
    []
  )
})

test('rejects stale current coverage and derived status cells', () => {
  const documentedCoverage = feature(`${validFeature.content}

### Test Coverage

| Acceptance Criterion | Expected Coverage | Current Coverage | Status |
| -------------------- | ----------------- | ---------------- | ------ |
| \`AC-US-EXAMPLE-001-01\` | Integrated E2E | Mocked browser | ✅ Met |
| \`AC-US-EXAMPLE-001-02\` | Backend | None linked | ✅ Met |
`)
  const integratedTest = testDocument(
    `test.describe('journey', { tag: '@integrated' }, () => {
  /** Covers: [AC-US-EXAMPLE-001-01] */
  test('proves the primary outcome', () => {})
})`,
    'app/test/e2e/example.integrated.spec.ts'
  )

  assert.deepEqual(
    validateAcceptanceCriteriaTraceability({
      featureDocuments: [documentedCoverage],
      testDocuments: [integratedTest]
    }).errors,
    [
      'docs/features/example/README.md:20 reports Mocked browser for AC-US-EXAMPLE-001-01; current representative coverage is Integrated E2E.',
      'docs/features/example/README.md:21 reports ✅ Met for AC-US-EXAMPLE-001-02; expected ❌ Missing.'
    ]
  )
})

test('classifies representative evidence by repository layer', () => {
  assert.equal(classifyTestCoverageLayer('app/src/example/__tests__/example.spec.ts'), 'frontend')
  assert.equal(classifyTestCoverageLayer('backend/src/example/__tests__/example.test.ts'), 'backend')
  assert.equal(classifyTestCoverageLayer('contract/test/Example.spec.ts'), 'contract')
  assert.equal(classifyTestCoverageLayer('contract/scripts/__tests__/deployment.node.mjs'), 'contract')
  assert.equal(classifyTestCoverageLayer('dashboard/app/example.test.ts'), 'dashboard')
  assert.equal(classifyTestCoverageLayer('app/test/e2e/example.spec.ts'), 'e2e')
  assert.equal(classifyTestCoverageLayer('scripts/example.test.mjs'), 'other')
})

test('classifies E2E evidence by its declared integration mode', () => {
  assert.equal(
    classifyE2eCoverageMode(
      testDocument("test.describe('journey', { tag: '@integrated' }, () => {})", 'app/test/e2e/integrated.spec.ts')
    ),
    'integrated'
  )
  assert.equal(
    classifyE2eCoverageMode(
      testDocument("test.describe('variant', { tag: '@mocked' }, () => {})", 'app/test/e2e/mocked.spec.ts')
    ),
    'mocked'
  )
  assert.equal(
    classifyE2eCoverageMode(testDocument("test('ambiguous', () => {})", 'app/test/e2e/ambiguous.spec.ts')),
    'unclassified'
  )
  assert.equal(classifyE2eCoverageMode(testDocument("test('unit', () => {})")), null)
})

test('summarizes unique representative files for every acceptance criterion', () => {
  const criteria = parseAcceptanceCriteria(validFeature)
  const coverage = summarizeAcceptanceCriterionCoverage(criteria, [
    {
      id: 'AC-US-EXAMPLE-001-01',
      documentPath: 'app/src/example/__tests__/example.spec.ts'
    },
    {
      id: 'AC-US-EXAMPLE-001-01',
      documentPath: 'app/src/example/__tests__/example.spec.ts'
    },
    {
      id: 'AC-US-EXAMPLE-001-01',
      documentPath: 'app/test/e2e/example.spec.ts',
      e2eMode: 'integrated'
    }
  ])

  assert.deepEqual(coverage[0].layers, {
    frontend: ['app/src/example/__tests__/example.spec.ts'],
    backend: [],
    contract: [],
    dashboard: [],
    e2e: ['app/test/e2e/example.spec.ts'],
    other: []
  })
  assert.deepEqual(coverage[0].e2eModes, {
    integrated: ['app/test/e2e/example.spec.ts'],
    mocked: [],
    unclassified: []
  })
  assert.deepEqual(coverage[1].layers, {
    frontend: [],
    backend: [],
    contract: [],
    dashboard: [],
    e2e: [],
    other: []
  })
  assert.deepEqual(coverage[1].e2eModes, {
    integrated: [],
    mocked: [],
    unclassified: []
  })
})

test('inventories every test file and maps explicit story and acceptance references', () => {
  const criteria = parseAcceptanceCriteria(validFeature)
  const inventory = summarizeTestFileInventory(criteria, [
    testDocument(`describe('[US-EXAMPLE-001] Example', () => {
  it('[AC-US-EXAMPLE-001-01] proves the primary outcome', () => {})
})`),
    testDocument("test('covers a technical helper', () => {})", 'contract/test/Helper.spec.ts'),
    testDocument('export const fixture = true', 'app/src/example/__tests__/fixture.ts')
  ])

  assert.equal(
    countStaticTestDeclarations({
      content: "it('one', () => {}); test.each([])('two', () => {})"
    }),
    2
  )
  assert.deepEqual(inventory, [
    {
      path: 'app/src/example/__tests__/example.spec.ts',
      layer: 'frontend',
      declarations: 1,
      acceptanceIds: ['AC-US-EXAMPLE-001-01'],
      storyIds: ['US-EXAMPLE-001'],
      featureDocuments: ['docs/features/example/README.md']
    },
    {
      path: 'contract/test/Helper.spec.ts',
      layer: 'contract',
      declarations: 1,
      acceptanceIds: [],
      storyIds: [],
      featureDocuments: []
    }
  ])
})

test('rejects a criterion without an ID', () => {
  const result = validateAcceptanceCriteriaTraceability({
    featureDocuments: [
      feature(`## US-EXAMPLE-001: Do Something

### Acceptance Criteria

- [x] The primary outcome succeeds.
`)
    ],
    testDocuments: []
  })

  assert.deepEqual(result.errors, [
    'docs/features/example/README.md:5 is missing an acceptance-criterion ID for US-EXAMPLE-001.'
  ])
})

test('rejects an ID owned by another story', () => {
  const result = validateAcceptanceCriteriaTraceability({
    featureDocuments: [
      feature(`## US-EXAMPLE-001: Do Something

### Acceptance Criteria

- [x] \`AC-US-EXAMPLE-002-01\` The primary outcome succeeds.
`)
    ],
    testDocuments: []
  })

  assert.deepEqual(result.errors, [
    'docs/features/example/README.md:5 uses AC-US-EXAMPLE-002-01, which does not belong to US-EXAMPLE-001.'
  ])
})

test('rejects duplicate and incomplete story-local sequences', () => {
  const result = validateAcceptanceCriteriaTraceability({
    featureDocuments: [
      feature(`## US-EXAMPLE-001: Do Something

### Acceptance Criteria

- [x] \`AC-US-EXAMPLE-001-02\` The primary outcome succeeds.
- [x] \`AC-US-EXAMPLE-001-02\` The secondary outcome succeeds.
`)
    ],
    testDocuments: []
  })

  assert.deepEqual(result.errors, [
    'docs/features/example/README.md:6 duplicates AC-US-EXAMPLE-001-02, already used at docs/features/example/README.md:5.',
    'US-EXAMPLE-001 must use each acceptance-criterion sequence from 01 through 01 exactly once; found 02.'
  ])
})

test('rejects a test reference to an unknown criterion', () => {
  const result = validateAcceptanceCriteriaTraceability({
    featureDocuments: [validFeature],
    testDocuments: [testDocument("it('[AC-US-EXAMPLE-001-03] proves an unknown outcome', () => {})")]
  })

  assert.deepEqual(result.errors, [
    'app/src/example/__tests__/example.spec.ts references unknown acceptance criterion AC-US-EXAMPLE-001-03.'
  ])
})

test('rejects a test reference to an unchecked criterion', () => {
  const result = validateAcceptanceCriteriaTraceability({
    featureDocuments: [validFeature],
    testDocuments: [testDocument("it('[AC-US-EXAMPLE-001-02] claims an unfinished outcome', () => {})")]
  })

  assert.deepEqual(result.errors, [
    'app/src/example/__tests__/example.spec.ts references unchecked acceptance criterion AC-US-EXAMPLE-001-02 at docs/features/example/README.md:13.'
  ])
})

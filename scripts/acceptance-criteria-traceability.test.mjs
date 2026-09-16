import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseAcceptanceCriteria,
  validateAcceptanceCriteriaTraceability
} from './lib/acceptance-criteria-traceability.mjs'

const feature = (content, path = 'docs/features/example/README.md') => ({ path, content })
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

test('accepts complete story-local IDs and known representative test references', () => {
  const result = validateAcceptanceCriteriaTraceability({
    featureDocuments: [validFeature],
    testDocuments: [
      testDocument("it('[AC-US-EXAMPLE-001-01] proves the primary outcome', () => {})")
    ]
  })

  assert.deepEqual(result.errors, [])
  assert.equal(result.criteria.length, 2)
  assert.equal(result.references.length, 1)
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
    testDocuments: [
      testDocument("it('[AC-US-EXAMPLE-001-03] proves an unknown outcome', () => {})")
    ]
  })

  assert.deepEqual(result.errors, [
    'app/src/example/__tests__/example.spec.ts references unknown acceptance criterion AC-US-EXAMPLE-001-03.'
  ])
})

test('rejects a test reference to an unchecked criterion', () => {
  const result = validateAcceptanceCriteriaTraceability({
    featureDocuments: [validFeature],
    testDocuments: [
      testDocument("it('[AC-US-EXAMPLE-001-02] claims an unfinished outcome', () => {})")
    ]
  })

  assert.deepEqual(result.errors, [
    'app/src/example/__tests__/example.spec.ts references unchecked acceptance criterion AC-US-EXAMPLE-001-02 at docs/features/example/README.md:13.'
  ])
})

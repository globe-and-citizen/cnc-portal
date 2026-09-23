const STORY_HEADING = /^## (US-[A-Z0-9-]+):\s+/
const SECTION_HEADING = /^### (.+)$/
const CRITERION = /^- \[([ xX])\] (?:`(AC-US-[A-Z0-9-]+-\d{2,})`\s+)?(.+)$/
const ACCEPTANCE_ID_REFERENCE = /\[(AC-US-[A-Z0-9-]+-\d{2,})\]/g

export const TEST_COVERAGE_LAYERS = ['frontend', 'backend', 'contract', 'e2e', 'other']

export function parseAcceptanceCriteria(document) {
  const criteria = []
  let storyId = null
  let inAcceptanceCriteria = false

  for (const [index, line] of document.content.split('\n').entries()) {
    const story = line.match(STORY_HEADING)
    if (story) {
      storyId = story[1]
      inAcceptanceCriteria = false
      continue
    }

    if (line.startsWith('## ')) {
      storyId = null
      inAcceptanceCriteria = false
      continue
    }

    const section = line.match(SECTION_HEADING)
    if (section) {
      inAcceptanceCriteria = storyId !== null && section[1] === 'Acceptance Criteria'
      continue
    }

    if (!storyId || !inAcceptanceCriteria) continue

    const criterion = line.match(CRITERION)
    if (criterion) {
      criteria.push({
        documentPath: document.path,
        line: index + 1,
        storyId,
        checked: criterion[1].toLowerCase() === 'x',
        id: criterion[2] ?? null,
        outcome: criterion[3]
      })
    }
  }

  return criteria
}

export function acceptanceCriterionReferences(document) {
  return [...document.content.matchAll(ACCEPTANCE_ID_REFERENCE)].map((match) => ({
    documentPath: document.path,
    id: match[1]
  }))
}

export function classifyTestCoverageLayer(documentPath) {
  if (/^app\/test\/e2e\//.test(documentPath)) return 'e2e'
  if (/^app\//.test(documentPath)) return 'frontend'
  if (/^backend\//.test(documentPath)) return 'backend'
  if (/^contract\/test\//.test(documentPath)) return 'contract'
  return 'other'
}

export function summarizeAcceptanceCriterionCoverage(criteria, references) {
  const referencesById = new Map()

  for (const reference of references) {
    const layer = classifyTestCoverageLayer(reference.documentPath)
    const layers = referencesById.get(reference.id) ?? new Map()
    const paths = layers.get(layer) ?? new Set()
    paths.add(reference.documentPath)
    layers.set(layer, paths)
    referencesById.set(reference.id, layers)
  }

  return criteria.map((criterion) => {
    const referencesForCriterion = referencesById.get(criterion.id) ?? new Map()
    const layers = Object.fromEntries(
      TEST_COVERAGE_LAYERS.map((layer) => [layer, [...(referencesForCriterion.get(layer) ?? [])]])
    )

    return { ...criterion, layers }
  })
}

export function validateAcceptanceCriteriaTraceability({ featureDocuments, testDocuments }) {
  const errors = []
  const criteria = featureDocuments.flatMap(parseAcceptanceCriteria)
  const criteriaById = new Map()
  const criteriaByStory = new Map()

  for (const criterion of criteria) {
    const location = `${criterion.documentPath}:${criterion.line}`
    if (!criterion.id) {
      errors.push(`${location} is missing an acceptance-criterion ID for ${criterion.storyId}.`)
      continue
    }

    const prefix = `AC-${criterion.storyId}-`
    if (!criterion.id.startsWith(prefix)) {
      errors.push(`${location} uses ${criterion.id}, which does not belong to ${criterion.storyId}.`)
      continue
    }

    const known = criteriaById.get(criterion.id)
    if (known) {
      errors.push(
        `${location} duplicates ${criterion.id}, already used at ${known.documentPath}:${known.line}.`
      )
      continue
    }

    criteriaById.set(criterion.id, criterion)
    const storyCriteria = criteriaByStory.get(criterion.storyId) ?? []
    storyCriteria.push(criterion)
    criteriaByStory.set(criterion.storyId, storyCriteria)
  }

  for (const [storyId, storyCriteria] of criteriaByStory) {
    const actual = storyCriteria
      .map((criterion) => Number(criterion.id.slice(`AC-${storyId}-`.length)))
      .sort((left, right) => left - right)
    const expected = Array.from({ length: storyCriteria.length }, (_, index) => index + 1)
    if (actual.some((value, index) => value !== expected[index])) {
      errors.push(
        `${storyId} must use each acceptance-criterion sequence from 01 through ${String(storyCriteria.length).padStart(2, '0')} exactly once; found ${actual.map((value) => String(value).padStart(2, '0')).join(', ')}.`
      )
    }
  }

  const references = testDocuments.flatMap(acceptanceCriterionReferences)
  for (const reference of references) {
    const criterion = criteriaById.get(reference.id)
    if (!criterion) {
      errors.push(`${reference.documentPath} references unknown acceptance criterion ${reference.id}.`)
    } else if (!criterion.checked) {
      errors.push(
        `${reference.documentPath} references unchecked acceptance criterion ${reference.id} at ${criterion.documentPath}:${criterion.line}.`
      )
    }
  }

  return { errors, criteria, references }
}

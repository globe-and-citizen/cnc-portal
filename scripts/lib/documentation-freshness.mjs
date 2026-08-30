import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, relative, resolve, sep } from 'node:path'

export const DOCUMENTATION_ROOTS = [
  'docs/features',
  'docs/contracts/features',
  'docs/implementation'
]

const BEHAVIORAL_SOURCE_PATTERNS = [
  /^app\/src\/(?:components|composables|queries|router|stores|views)\//,
  /^dashboard\/app\/(?:components|composables|middleware|pages|queries|server|stores)\//,
  /^backend\/src\/(?:controllers|middleware|routes|services|validation)\//,
  /^backend\/prisma\/schema\.prisma$/,
  /^contract\/contracts\//,
  /^ponder\/src\//,
  /^the-graph\/src\//
]

const TEST_SOURCE_PATTERN = /(?:^|\/)(?:__tests__|tests?)(?:\/|$)|\.(?:spec|test)\.[^/]+$/
const MARKDOWN_FILE_PATTERN = /\.md$/i
const IMPLEMENTATION_EVIDENCE_REVISION_LABEL = 'Implementation evidence reviewed against'
const IMPLEMENTATION_EVIDENCE_REVISION_PATTERN = new RegExp(
  `^\\*\\*${IMPLEMENTATION_EVIDENCE_REVISION_LABEL}:\\*\\*\\s*\`([0-9a-f]{40})\`\\s*$`,
  'im'
)
const IMPLEMENTATION_EVIDENCE_REVISION_LINE_PATTERN = new RegExp(
  `^\\*\\*${IMPLEMENTATION_EVIDENCE_REVISION_LABEL}:\\*\\*`,
  'im'
)

function normalizePath(path) {
  return path.split(sep).join('/').replace(/^\.\//, '').replace(/\/$/, '')
}

function isRepositoryPath(path) {
  return (
    path !== '' &&
    !path.startsWith('/') &&
    !path.startsWith('../') &&
    !path.includes('/../') &&
    !path.includes('\\')
  )
}

function stripLineReference(path) {
  return path.replace(/(\.[A-Za-z0-9]+):\d+(?:-\d+)?$/, '$1')
}

function sourcePathFromReference(reference, documentPath, repositoryRoot) {
  let value = reference.trim()

  if (!value || /^(?:[A-Za-z][A-Za-z0-9+.-]*:|#)/.test(value)) return null

  if (value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1)
  } else {
    value = value.split(/\s+['"]/)[0]
  }

  value = stripLineReference(value.split('#', 1)[0])
  if (!value) return null

  try {
    const target = resolve(repositoryRoot, dirname(documentPath), decodeURIComponent(value))
    const repositoryPath = normalizePath(relative(repositoryRoot, target))

    return isRepositoryPath(repositoryPath) ? repositoryPath : null
  } catch {
    return null
  }
}

function sourcePathFromInlineCode(reference) {
  const path = stripLineReference(reference.trim())
  return isRepositoryPath(path) ? path : null
}

export function isBehavioralSourcePath(path) {
  const normalizedPath = normalizePath(path)

  return (
    !MARKDOWN_FILE_PATTERN.test(normalizedPath) &&
    !TEST_SOURCE_PATTERN.test(normalizedPath) &&
    BEHAVIORAL_SOURCE_PATTERNS.some((pattern) => pattern.test(normalizedPath))
  )
}

export function sourcePathsFromMarkdown(markdown, documentPath, repositoryRoot) {
  const paths = new Set()
  const addPath = (path) => {
    if (path && isBehavioralSourcePath(path)) paths.add(path)
  }

  for (const match of markdown.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)) {
    addPath(sourcePathFromReference(match[1], documentPath, repositoryRoot))
  }

  for (const match of markdown.matchAll(/`([^`\n]+)`/g)) {
    const pathMatch = match[1].match(
      /(?:^|[\s(])((?:app|backend|contract|dashboard|ponder|the-graph)\/[^\s`,)]+)/
    )
    if (pathMatch) addPath(sourcePathFromInlineCode(pathMatch[1]))
  }

  return [...paths].sort()
}

export function implementationEvidenceRevisionFromMarkdown(markdown) {
  return markdown.match(IMPLEMENTATION_EVIDENCE_REVISION_PATTERN)?.[1].toLowerCase() ?? null
}

function hasImplementationEvidenceRevisionAttestation(markdown) {
  return IMPLEMENTATION_EVIDENCE_REVISION_LINE_PATTERN.test(markdown)
}

export function buildDocumentationOwners(documents, repositoryRoot) {
  return documents.map((document) => ({
    path: normalizePath(document.path),
    sourcePaths: sourcePathsFromMarkdown(document.content, document.path, repositoryRoot),
    implementationEvidenceRevision: implementationEvidenceRevisionFromMarkdown(document.content),
    hasImplementationEvidenceRevisionAttestation: hasImplementationEvidenceRevisionAttestation(document.content)
  }))
}

function sourceIsOwnedBy(changedPath, declaredPath) {
  return changedPath === declaredPath || changedPath.startsWith(`${declaredPath}/`)
}

export function validateDocumentationFreshness({
  changedPaths,
  documents,
  repositoryRoot,
  implementationEvidenceRevisionStatus = () => 'stale'
}) {
  const owners = buildDocumentationOwners(documents, repositoryRoot)
  const errors = []

  for (const changedPath of [...new Set(changedPaths.map(normalizePath))].sort()) {
    if (!isBehavioralSourcePath(changedPath)) continue

    const sourceOwners = owners.filter((owner) =>
      owner.sourcePaths.some((declaredPath) => sourceIsOwnedBy(changedPath, declaredPath))
    )

    if (sourceOwners.length === 0) {
      errors.push(
        `${changedPath} has no canonical documentation owner; add it to the Implementation Evidence of the owning feature, contract, or implementation README.`
      )
      continue
    }

    for (const owner of sourceOwners) {
      if (!owner.implementationEvidenceRevision) {
        const attestationProblem = owner.hasImplementationEvidenceRevisionAttestation
          ? `has an invalid "${IMPLEMENTATION_EVIDENCE_REVISION_LABEL}" revision`
          : `has no "${IMPLEMENTATION_EVIDENCE_REVISION_LABEL}" revision`

        errors.push(
          `${changedPath} is owned by ${owner.path}, which ${attestationProblem}; review the current source and attest a reachable full commit SHA.`
        )
        continue
      }

      const status = implementationEvidenceRevisionStatus(owner.implementationEvidenceRevision, changedPath)
      if (status === 'current') continue

      const statusProblem = status === 'unreachable' ? 'does not resolve to a reachable commit' : 'predates the changed source'
      errors.push(
        `${changedPath} is owned by ${owner.path}, whose "${IMPLEMENTATION_EVIDENCE_REVISION_LABEL}" revision ${owner.implementationEvidenceRevision} ${statusProblem}; review the current source and refresh the attestation.`
      )
    }
  }

  return errors
}

function gitSucceeds(repositoryRoot, args) {
  try {
    execFileSync('git', args, { cwd: repositoryRoot, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function implementationEvidenceRevisionStatus(repositoryRoot, revision, sourcePath) {
  if (!gitSucceeds(repositoryRoot, ['rev-parse', '--verify', `${revision}^{commit}`])) return 'unreachable'
  if (!gitSucceeds(repositoryRoot, ['merge-base', '--is-ancestor', revision, 'HEAD'])) return 'unreachable'
  if (!gitSucceeds(repositoryRoot, ['cat-file', '-e', `${revision}:${sourcePath}`])) return 'stale'

  const committedSourceIsCurrent = gitSucceeds(repositoryRoot, ['diff', '--quiet', `${revision}..HEAD`, '--', sourcePath])
  const stagedSourceIsCurrent = gitSucceeds(repositoryRoot, ['diff', '--cached', '--quiet', '--', sourcePath])
  const workingTreeSourceIsCurrent = gitSucceeds(repositoryRoot, ['diff', '--quiet', 'HEAD', '--', sourcePath])

  return committedSourceIsCurrent && stagedSourceIsCurrent && workingTreeSourceIsCurrent ? 'current' : 'stale'
}

function walkCanonicalDocuments(directory, repositoryRoot) {
  if (!existsSync(directory)) return []

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = resolve(directory, entry.name)
    if (entry.isDirectory()) return walkCanonicalDocuments(target, repositoryRoot)
    if (!entry.isFile() || !['README.md', 'Readme.md'].includes(entry.name)) return []

    return [
      {
        path: normalizePath(relative(repositoryRoot, target)),
        content: readFileSync(target, 'utf8')
      }
    ]
  })
}

export function readCanonicalDocuments(repositoryRoot) {
  return DOCUMENTATION_ROOTS.flatMap((root) =>
    walkCanonicalDocuments(resolve(repositoryRoot, root), repositoryRoot)
  ).sort((left, right) => left.path.localeCompare(right.path))
}

function git(repositoryRoot, args) {
  return execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' }).trim()
}

export function documentationBaseCommit(repositoryRoot, configuredBase = process.env.DOCS_BASE_COMMIT) {
  if (configuredBase?.trim()) {
    return git(repositoryRoot, ['rev-parse', '--verify', `${configuredBase.trim()}^{commit}`])
  }

  return git(repositoryRoot, ['merge-base', 'HEAD', 'origin/develop'])
}

function splitGitPaths(output) {
  return output ? output.split('\n').filter(Boolean).map(normalizePath) : []
}

function splitDiffSections(diff) {
  return diff
    .split(/^diff --git /m)
    .filter(Boolean)
    .map((section) => `diff --git ${section}`)
}

function pathsFromDiffSection(section) {
  const match = section.match(/^diff --git a\/(.+?) b\/(.+)$/m)

  return match ? { from: normalizePath(match[1]), to: normalizePath(match[2]) } : null
}

function localReferencesFromLine(line) {
  const references = []
  const normalized = line.replace(/(['"])(@\/|\.{1,2}\/)[^'"]*\1/g, (match, quote) => {
    references.push(match.slice(1, -1))
    return `${quote}<local-reference>${quote}`
  })

  return references.length > 0 ? { normalized, references } : null
}

function referencedRepositoryPath(reference, sourcePath, repositoryRoot) {
  if (reference.startsWith('@/')) return `app/src/${reference.slice(2)}`

  const target = resolve(repositoryRoot, dirname(sourcePath), reference)
  const repositoryPath = normalizePath(relative(repositoryRoot, target))

  return isRepositoryPath(repositoryPath) ? repositoryPath : null
}

function defaultImportBinding(line) {
  return line.match(/^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]/)?.[1] ?? null
}

function replaceIdentifier(line, previous, next) {
  return line.replace(new RegExp(`\\b${previous}\\b`, 'g'), next)
}

function onlyRelocationReferencesChanged(section, relocationMap, repositoryRoot) {
  const paths = pathsFromDiffSection(section)
  if (!paths) return null

  const removed = []
  const added = []

  for (const line of section.split('\n')) {
    if (line.startsWith('--- ') || line.startsWith('+++ ')) continue
    if (line.startsWith('-')) removed.push(line.slice(1))
    if (line.startsWith('+')) added.push(line.slice(1))
  }

  if (removed.length === 0 && added.length === 0) {
    return /^rename from /m.test(section) ? paths.to : null
  }

  if (removed.length === 0 || removed.length !== added.length) return null

  const renamedBindings = new Map()

  for (let index = 0; index < removed.length; index += 1) {
    const before = localReferencesFromLine(removed[index])
    const after = localReferencesFromLine(added[index])

    if (!before || !after) continue
    if (before.references.length !== after.references.length) return null

    for (let referenceIndex = 0; referenceIndex < before.references.length; referenceIndex += 1) {
      const previousTarget = referencedRepositoryPath(
        before.references[referenceIndex],
        paths.from,
        repositoryRoot
      )
      const nextTarget = referencedRepositoryPath(
        after.references[referenceIndex],
        paths.to,
        repositoryRoot
      )

      if (
        !previousTarget ||
        !nextTarget ||
        (previousTarget !== nextTarget && relocationMap.get(previousTarget) !== nextTarget)
      ) {
        return null
      }

      if (previousTarget !== nextTarget) {
        const previousBinding = defaultImportBinding(removed[index])
        const nextBinding = defaultImportBinding(added[index])
        if (previousBinding && nextBinding) {
          renamedBindings.set(previousBinding, nextBinding)
        }
      }
    }
  }

  for (let index = 0; index < removed.length; index += 1) {
    const before = localReferencesFromLine(removed[index])
    const after = localReferencesFromLine(added[index])

    let normalizedBefore = before?.normalized ?? removed[index]
    const normalizedAfter = after?.normalized ?? added[index]

    for (const [previousBinding, nextBinding] of renamedBindings) {
      normalizedBefore = replaceIdentifier(normalizedBefore, previousBinding, nextBinding)
    }

    if (normalizedBefore !== normalizedAfter) return null
  }

  return paths.to
}

/**
 * Identifies source paths whose diff only keeps imports, local asset references, and component
 * identifiers valid after a source relocation or rename. These paths do not change runtime
 * behaviour, so their existing canonical documentation remains current.
 */
export function nonBehavioralPathsFromDiffs(diffs, repositoryRoot) {
  const sections = diffs.flatMap(splitDiffSections)
  const relocationMap = new Map()

  for (const section of sections) {
    const paths = pathsFromDiffSection(section)
    if (paths && /^rename from /m.test(section)) relocationMap.set(paths.from, paths.to)
  }

  return [
    ...new Set(
      sections
        .map((section) => onlyRelocationReferencesChanged(section, relocationMap, repositoryRoot))
        .filter(Boolean)
    )
  ].sort()
}

export function changedRepositoryPaths(repositoryRoot, baseCommit) {
  const changed = [
    git(repositoryRoot, [
      'diff',
      '--name-only',
      '--diff-filter=ACMRT',
      `${baseCommit}...HEAD`
    ]),
    git(repositoryRoot, ['diff', '--name-only', '--diff-filter=ACMRT', 'HEAD']),
    git(repositoryRoot, ['ls-files', '--others', '--exclude-standard'])
  ]

  return [...new Set(changed.flatMap(splitGitPaths))].sort()
}

function changedRepositoryDiffs(repositoryRoot, baseCommit) {
  return [
    git(repositoryRoot, ['diff', '--unified=0', '--find-renames=50%', `${baseCommit}...HEAD`]),
    git(repositoryRoot, ['diff', '--unified=0', '--find-renames=50%', 'HEAD'])
  ]
}

export function validateCurrentRepository(repositoryRoot, configuredBase) {
  const baseCommit = documentationBaseCommit(repositoryRoot, configuredBase)
  const changedPaths = changedRepositoryPaths(repositoryRoot, baseCommit)
  const nonBehavioralPaths = new Set(
    nonBehavioralPathsFromDiffs(changedRepositoryDiffs(repositoryRoot, baseCommit), repositoryRoot)
  )
  const documents = readCanonicalDocuments(repositoryRoot)

  return {
    baseCommit,
    changedPaths,
    documents,
    errors: validateDocumentationFreshness({
      changedPaths: changedPaths.filter((path) => !nonBehavioralPaths.has(path)),
      documents,
      repositoryRoot,
      implementationEvidenceRevisionStatus: (revision, sourcePath) =>
        implementationEvidenceRevisionStatus(repositoryRoot, revision, sourcePath)
    })
  }
}

export function canonicalDocumentName(path) {
  return basename(path)
}

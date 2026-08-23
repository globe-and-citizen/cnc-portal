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

export function buildDocumentationOwners(documents, repositoryRoot) {
  return documents.map((document) => ({
    path: normalizePath(document.path),
    sourcePaths: sourcePathsFromMarkdown(document.content, document.path, repositoryRoot)
  }))
}

function sourceIsOwnedBy(changedPath, declaredPath) {
  return changedPath === declaredPath || changedPath.startsWith(`${declaredPath}/`)
}

export function validateDocumentationFreshness({ changedPaths, documents, repositoryRoot }) {
  const owners = buildDocumentationOwners(documents, repositoryRoot)
  const changedDocumentationPaths = new Set(
    changedPaths
      .map(normalizePath)
      .filter((path) => DOCUMENTATION_ROOTS.some((root) => path.startsWith(`${root}/`) || path === `${root}.md`))
  )
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
      if (!changedDocumentationPaths.has(owner.path)) {
        errors.push(
          `${changedPath} is owned by ${owner.path}, which was not updated; review and update that document in this change.`
        )
      }
    }
  }

  return errors
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

export function changedRepositoryPaths(repositoryRoot, baseCommit) {
  const changed = [
    git(repositoryRoot, [
      'diff',
      '--name-only',
      '--diff-filter=ACMRTD',
      `${baseCommit}...HEAD`
    ]),
    git(repositoryRoot, ['diff', '--name-only', '--diff-filter=ACMRTD', 'HEAD']),
    git(repositoryRoot, ['ls-files', '--others', '--exclude-standard'])
  ]

  return [...new Set(changed.flatMap(splitGitPaths))].sort()
}

export function validateCurrentRepository(repositoryRoot, configuredBase) {
  const baseCommit = documentationBaseCommit(repositoryRoot, configuredBase)
  const changedPaths = changedRepositoryPaths(repositoryRoot, baseCommit)
  const documents = readCanonicalDocuments(repositoryRoot)

  return {
    baseCommit,
    changedPaths,
    documents,
    errors: validateDocumentationFreshness({
      changedPaths,
      documents,
      repositoryRoot
    })
  }
}

export function canonicalDocumentName(path) {
  return basename(path)
}

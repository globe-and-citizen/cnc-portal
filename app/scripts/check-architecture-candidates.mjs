#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const APP_DIRECTORY = dirname(SCRIPT_DIRECTORY)
const SOURCE_DIRECTORY = join(APP_DIRECTORY, 'src')
const BASELINE_FILE = join(SCRIPT_DIRECTORY, 'architecture-candidate-baseline.json')
const TEST_PATH_SEGMENTS = new Set(['__tests__', 'tests', '__mocks__'])

export const ARCHITECTURE_CANDIDATE_LIMITS = {
  componentFunctionProps: 3,
  componentForwardedProps: 3,
  singleConsumerComposableNestedCalls: 1
}

const isSourceFile = (file) => file.endsWith('.ts') || file.endsWith('.vue')

const isTestFile = (file) =>
  file.split('/').some((segment) => TEST_PATH_SEGMENTS.has(segment)) ||
  /\.(spec|test)\.(ts|vue)$/.test(file)

export function findMatchingDelimiter(source, openingIndex, opening = '{', closing = '}') {
  let depth = 0
  let quote = null
  let lineComment = false
  let blockComment = false

  for (let index = openingIndex; index < source.length; index++) {
    const character = source[index]
    const nextCharacter = source[index + 1]

    if (lineComment) {
      if (character === '\n') lineComment = false
      continue
    }

    if (blockComment) {
      if (character === '*' && nextCharacter === '/') {
        blockComment = false
        index++
      }
      continue
    }

    if (quote) {
      if (character === '\\') {
        index++
        continue
      }
      if (character === quote) quote = null
      continue
    }

    if (character === '/' && nextCharacter === '/') {
      lineComment = true
      index++
      continue
    }

    if (character === '/' && nextCharacter === '*') {
      blockComment = true
      index++
      continue
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character
      continue
    }

    if (character === opening) depth++
    if (character === closing) depth--
    if (depth === 0) return index
  }

  return -1
}

function splitTopLevel(source, delimiters) {
  const values = []
  let start = 0
  let braces = 0
  let brackets = 0
  let parentheses = 0
  let angles = 0
  let quote = null

  for (let index = 0; index < source.length; index++) {
    const character = source[index]

    if (quote) {
      if (character === '\\') {
        index++
        continue
      }
      if (character === quote) quote = null
      continue
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character
      continue
    }

    if (character === '{') braces++
    else if (character === '}') braces--
    else if (character === '[') brackets++
    else if (character === ']') brackets--
    else if (character === '(') parentheses++
    else if (character === ')') parentheses--
    else if (character === '<') angles++
    else if (character === '>' && angles > 0) angles--

    if (
      braces === 0 &&
      brackets === 0 &&
      parentheses === 0 &&
      angles === 0 &&
      delimiters.has(character)
    ) {
      values.push(source.slice(start, index))
      start = index + 1
    }
  }

  values.push(source.slice(start))
  return values
}

function findNamedTypeBody(source, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const interfaceMatch = new RegExp(`\\binterface\\s+${escapedName}\\s*{`).exec(source)
  if (interfaceMatch) {
    const openingIndex = interfaceMatch.index + interfaceMatch[0].lastIndexOf('{')
    const closingIndex = findMatchingDelimiter(source, openingIndex)
    return closingIndex === -1 ? null : source.slice(openingIndex + 1, closingIndex)
  }

  const typeMatch = new RegExp(`\\btype\\s+${escapedName}\\s*=\\s*{`).exec(source)
  if (!typeMatch) return null
  const openingIndex = typeMatch.index + typeMatch[0].lastIndexOf('{')
  const closingIndex = findMatchingDelimiter(source, openingIndex)
  return closingIndex === -1 ? null : source.slice(openingIndex + 1, closingIndex)
}

function findGenericTypeArgument(source, openingIndex) {
  const closingIndex = findMatchingDelimiter(source, openingIndex, '<', '>')
  return closingIndex === -1 ? null : source.slice(openingIndex + 1, closingIndex).trim()
}

function getPropsTypeBodies(source) {
  const bodies = []
  const pattern = /defineProps\s*<\s*/g
  let match

  while ((match = pattern.exec(source)) !== null) {
    const openingIndex = match.index + match[0].lastIndexOf('<')
    const typeArgument = findGenericTypeArgument(source, openingIndex)
    if (!typeArgument) continue

    if (typeArgument.startsWith('{')) {
      const closingIndex = findMatchingDelimiter(typeArgument, 0)
      if (closingIndex !== -1) bodies.push(typeArgument.slice(1, closingIndex))
      continue
    }

    const typeBody = findNamedTypeBody(source, typeArgument)
    if (typeBody) bodies.push(typeBody)
  }

  return bodies
}

function getComponentPropNames(source) {
  return new Set(
    getPropsTypeBodies(source).flatMap((body) =>
      splitTopLevel(body, new Set([',', ';', '\n']))
        .map((member) => /^(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:/.exec(member.trim())?.[1])
        .filter(Boolean)
    )
  )
}

function countFunctionProps(source) {
  return Math.max(
    0,
    ...getPropsTypeBodies(source).map(
      (body) =>
        splitTopLevel(body, new Set([',', ';', '\n'])).filter(
          (member) =>
            /^(?:readonly\s+)?[A-Za-z_$][\w$]*\??\s*:/.test(member.trim()) && member.includes('=>')
        ).length
    )
  )
}

function countForwardedProps(source) {
  const propNames = getComponentPropNames(source)
  if (propNames.size === 0) return 0
  const template = /<template[^>]*>([\s\S]*?)<\/template>/.exec(source)?.[1] ?? ''
  const importedComponentNames = [
    ...source.matchAll(/import\s+(?!type\s)([A-Z][A-Za-z0-9_$]*)\s+from\s+['"]/g)
  ].map((match) => match[1])
  const importedComponentTags = importedComponentNames.flatMap((name) =>
    [...template.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((match) => match[0])
  )
  if (importedComponentTags.length === 0) return 0

  return [...propNames].filter((name) => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const directForwarding = new RegExp(
      `:[A-Za-z][\\w-]*\\s*=\\s*["'](?:props\\.)?${escapedName}["']`,
      'g'
    )
    const directForwardingInTag = new RegExp(directForwarding.source)
    const forwardsWholePropsObject = /\bv-bind\s*=\s*["']props["']/
    const forwardingTags = importedComponentTags.filter(
      (tag) => directForwardingInTag.test(tag) || forwardsWholePropsObject.test(tag)
    )
    if (forwardingTags.length === 0) return false

    const templateWithoutForwarding = template
      .replace(directForwarding, '')
      .replace(/\bv-bind\s*=\s*["']props["']/g, '')
    return !new RegExp(`\\b${escapedName}\\b`).test(templateWithoutForwarding)
  }).length
}

function findFunctionBody(source, afterParameters) {
  const openingIndex = source.indexOf('{', afterParameters)
  if (openingIndex === -1) return null
  const closingIndex = findMatchingDelimiter(source, openingIndex)
  if (closingIndex === -1) return null
  return source.slice(openingIndex + 1, closingIndex)
}

function countReturnMembers(body) {
  const returnPattern = /\breturn\s*{/g
  let returnMatch
  let finalCount = 0

  while ((returnMatch = returnPattern.exec(body)) !== null) {
    const openingIndex = returnMatch.index + returnMatch[0].lastIndexOf('{')
    const closingIndex = findMatchingDelimiter(body, openingIndex)
    if (closingIndex === -1) continue
    finalCount = splitTopLevel(
      body.slice(openingIndex + 1, closingIndex),
      new Set([',', ';', '\n'])
    )
      .map((member) =>
        member
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
          .trim()
      )
      .filter((member) => member && !member.startsWith('//')).length
  }

  return finalCount
}

function collectComposableDefinitions(source, path) {
  const definitions = []
  const declarationPattern = /export\s+(?:async\s+)?function\s+(use[A-Z]\w*)\s*(?:<[^>]+>)?\s*\(/g
  let match

  while ((match = declarationPattern.exec(source)) !== null) {
    const parametersOpeningIndex = match.index + match[0].lastIndexOf('(')
    const parametersClosingIndex = findMatchingDelimiter(source, parametersOpeningIndex, '(', ')')
    if (parametersClosingIndex === -1) continue
    const body = findFunctionBody(source, parametersClosingIndex + 1)
    if (!body) continue

    const nestedCalls = new Set(
      [...body.matchAll(/\b(use[A-Z]\w*)\s*\(/g)]
        .map((nestedCall) => nestedCall[1])
        .filter((name) => name !== match[1])
    )
    definitions.push({
      path,
      subject: match[1],
      nestedCallCount: nestedCalls.size,
      returnMemberCount: countReturnMembers(body)
    })
  }

  return definitions
}

export function collectArchitectureCandidatesFromSources(sourceFiles) {
  const candidates = []
  const composableDefinitions = []

  for (const sourceFile of sourceFiles) {
    if (sourceFile.path.endsWith('.vue')) {
      const functionPropCount = countFunctionProps(sourceFile.source)
      if (functionPropCount > ARCHITECTURE_CANDIDATE_LIMITS.componentFunctionProps) {
        candidates.push({
          path: sourceFile.path,
          subject: 'component',
          metric: 'componentFunctionProps',
          actual: functionPropCount
        })
      }

      const forwardedPropCount = countForwardedProps(sourceFile.source)
      if (forwardedPropCount > ARCHITECTURE_CANDIDATE_LIMITS.componentForwardedProps) {
        candidates.push({
          path: sourceFile.path,
          subject: 'component',
          metric: 'componentForwardedProps',
          actual: forwardedPropCount
        })
      }
    }

    if (sourceFile.path.includes('/composables/') && sourceFile.path.endsWith('.ts')) {
      composableDefinitions.push(
        ...collectComposableDefinitions(sourceFile.source, sourceFile.path)
      )
    }
  }

  for (const composable of composableDefinitions) {
    if (
      composable.nestedCallCount <=
        ARCHITECTURE_CANDIDATE_LIMITS.singleConsumerComposableNestedCalls ||
      composable.returnMemberCount < 4
    ) {
      continue
    }

    const consumerCount = sourceFiles.filter(
      (sourceFile) =>
        sourceFile.path !== composable.path &&
        new RegExp(`\\b${composable.subject}\\s*\\(`).test(sourceFile.source)
    ).length

    if (consumerCount > 1) continue

    candidates.push({
      path: composable.path,
      subject: composable.subject,
      metric: 'singleConsumerComposableNestedCalls',
      actual: composable.nestedCallCount,
      consumerCount,
      returnMemberCount: composable.returnMemberCount
    })
  }

  return candidates.sort((left, right) =>
    `${left.path}:${left.subject}:${left.metric}`.localeCompare(
      `${right.path}:${right.subject}:${right.metric}`
    )
  )
}

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) yield* walk(fullPath)
    else if (isSourceFile(entry.name)) yield fullPath
  }
}

export async function collectProjectArchitectureCandidates(sourceDirectory = SOURCE_DIRECTORY) {
  const sourceFiles = []
  for await (const file of walk(sourceDirectory)) {
    const path = relative(APP_DIRECTORY, file).replaceAll('\\', '/')
    if (isTestFile(path)) continue
    sourceFiles.push({ path, source: await readFile(file, 'utf8') })
  }
  return collectArchitectureCandidatesFromSources(sourceFiles)
}

function candidateKey({ path, subject, metric }) {
  return `${path}:${subject}:${metric}`
}

export function validateArchitectureCandidates(candidates, baseline) {
  const exceptions = new Map(
    baseline.exceptions.map((exception) => [candidateKey(exception), exception])
  )
  const findings = []

  for (const candidate of candidates) {
    const exception = exceptions.get(candidateKey(candidate))
    if (!exception) {
      findings.push({ ...candidate, message: 'new architecture candidate: review or refactor it' })
      continue
    }
    if (candidate.actual > exception.allowed) {
      findings.push({
        ...candidate,
        message: `regression: ${candidate.actual} exceeds the baseline allowance of ${exception.allowed}`
      })
    }
  }

  for (const exception of baseline.exceptions) {
    const candidate = candidates.find((item) => candidateKey(item) === candidateKey(exception))
    if (!candidate || candidate.actual <= ARCHITECTURE_CANDIDATE_LIMITS[exception.metric]) {
      findings.push({
        ...exception,
        actual: candidate?.actual ?? 0,
        message: 'stale baseline exception: remove it after simplifying the architecture'
      })
    }
  }

  return findings
}

export function compareBaselines(reference, candidate) {
  const referenceExceptions = new Map(
    reference.exceptions.map((exception) => [candidateKey(exception), exception])
  )
  const findings = []

  for (const exception of candidate.exceptions) {
    const referenceException = referenceExceptions.get(candidateKey(exception))
    if (!referenceException) {
      findings.push(`new baseline exception: ${candidateKey(exception)}`)
      continue
    }
    if (exception.allowed > referenceException.allowed) {
      findings.push(
        `baseline allowance increased for ${candidateKey(exception)}: ` +
          `${referenceException.allowed} to ${exception.allowed}`
      )
    }
  }

  return findings
}

async function loadBaseline(file = BASELINE_FILE) {
  return JSON.parse(await readFile(file, 'utf8'))
}

function loadReferenceBaseline() {
  const baseBranch = process.env.GITHUB_BASE_REF || 'develop'
  try {
    return JSON.parse(
      execFileSync(
        'git',
        ['show', `origin/${baseBranch}:app/scripts/architecture-candidate-baseline.json`],
        {
          cwd: APP_DIRECTORY,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }
      )
    )
  } catch {
    return null
  }
}

function formatCandidate(candidate) {
  const details =
    candidate.metric === 'singleConsumerComposableNestedCalls'
      ? `; ${candidate.consumerCount} production consumer and ${candidate.returnMemberCount} returned members`
      : ''
  return `  ${candidate.path} (${candidate.subject}, ${candidate.metric}): ${candidate.actual}${details}`
}

export async function main({
  baselineFile = BASELINE_FILE,
  sourceDirectory = SOURCE_DIRECTORY,
  report = process.argv.includes('--report')
} = {}) {
  const baseline = await loadBaseline(baselineFile)
  const candidates = await collectProjectArchitectureCandidates(sourceDirectory)

  if (report) {
    if (candidates.length === 0) console.log('OK: no architecture candidates found.')
    else {
      console.log('Architecture candidates:\n')
      for (const candidate of candidates) console.log(formatCandidate(candidate))
    }
    return 0
  }

  const findings = validateArchitectureCandidates(candidates, baseline)
  const referenceBaseline = loadReferenceBaseline()
  const baselineFindings = referenceBaseline ? compareBaselines(referenceBaseline, baseline) : []

  if (findings.length === 0 && baselineFindings.length === 0) {
    console.log('OK: architecture candidates are within the ratchet baseline.')
    return 0
  }

  if (findings.length > 0) {
    console.error('Architecture candidate violations:\n')
    for (const finding of findings)
      console.error(`${formatCandidate(finding)} — ${finding.message}`)
  }

  if (baselineFindings.length > 0) {
    console.error('\nBaseline growth is not allowed:\n')
    for (const finding of baselineFindings) console.error(`  ${finding}`)
  }

  return 1
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isMainModule) {
  main().then((exitCode) => {
    process.exitCode = exitCode
  })
}

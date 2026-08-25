#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const APP_DIRECTORY = dirname(SCRIPT_DIRECTORY)
const SOURCE_DIRECTORY = join(APP_DIRECTORY, 'src')
const BASELINE_FILE = join(SCRIPT_DIRECTORY, 'api-surface-baseline.json')

export const API_SURFACE_LIMITS = {
  componentProps: 7,
  componentExposedMembers: 0,
  composableReturnMembers: 8,
  composableDependencies: 4
}

const TEST_PATH_SEGMENTS = new Set(['__tests__', 'tests', '__mocks__'])

const isSourceFile = (file) => file.endsWith('.ts') || file.endsWith('.vue')

const isTestFile = (file) =>
  file.split('/').some((segment) => TEST_PATH_SEGMENTS.has(segment)) ||
  /\.(spec|test)\.(ts|vue)$/.test(file)

/**
 * Return the index of the matching delimiter while ignoring strings and comments.
 */
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
  let lineComment = false
  let blockComment = false

  for (let index = 0; index < source.length; index++) {
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

function countObjectMembers(source) {
  return splitTopLevel(source, new Set([',', ';', '\n']))
    .map((value) =>
      value
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .trim()
    )
    .filter((value) => value && !value.startsWith('//')).length
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

function countTypeMembers(source, typeArgument) {
  if (typeArgument.startsWith('{')) {
    const closingIndex = findMatchingDelimiter(typeArgument, 0)
    return closingIndex === -1 ? 0 : countObjectMembers(typeArgument.slice(1, closingIndex))
  }

  const typeBody = findNamedTypeBody(source, typeArgument)
  return typeBody ? countObjectMembers(typeBody) : 0
}

function countComponentProps(source) {
  const counts = []
  const genericPattern = /defineProps\s*<\s*/g
  let genericMatch

  while ((genericMatch = genericPattern.exec(source)) !== null) {
    const openingIndex = genericMatch.index + genericMatch[0].lastIndexOf('<')
    const typeArgument = findGenericTypeArgument(source, openingIndex)
    if (typeArgument) counts.push(countTypeMembers(source, typeArgument))
  }

  const runtimePattern = /defineProps\s*\(\s*{/g
  let runtimeMatch

  while ((runtimeMatch = runtimePattern.exec(source)) !== null) {
    const openingIndex = runtimeMatch.index + runtimeMatch[0].lastIndexOf('{')
    const closingIndex = findMatchingDelimiter(source, openingIndex)
    if (closingIndex !== -1)
      counts.push(countObjectMembers(source.slice(openingIndex + 1, closingIndex)))
  }

  return Math.max(0, ...counts)
}

function countExposedMembers(source) {
  const counts = []
  const exposePattern = /defineExpose\s*\(\s*{/g
  let exposeMatch

  while ((exposeMatch = exposePattern.exec(source)) !== null) {
    const openingIndex = exposeMatch.index + exposeMatch[0].lastIndexOf('{')
    const closingIndex = findMatchingDelimiter(source, openingIndex)
    if (closingIndex !== -1)
      counts.push(countObjectMembers(source.slice(openingIndex + 1, closingIndex)))
  }

  return Math.max(0, ...counts)
}

function countParameters(source, parameters) {
  const trimmedParameters = parameters.trim()
  if (!trimmedParameters) return 0

  const values = splitTopLevel(trimmedParameters, new Set([',']))
  return values.reduce((total, value) => {
    const parameter = value.trim()
    if (!parameter) return total

    if (parameter.startsWith('{')) {
      const closingIndex = findMatchingDelimiter(parameter, 0)
      return (
        total + (closingIndex === -1 ? 1 : countObjectMembers(parameter.slice(1, closingIndex)))
      )
    }

    const typeName = parameter.match(/:\s*([A-Za-z_$][\w$]*)\s*(?:=|$)/)?.[1]
    if (typeName) {
      const typeBody = findNamedTypeBody(source, typeName)
      if (typeBody) return total + countObjectMembers(typeBody)
    }

    return total + 1
  }, 0)
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
    finalCount = countObjectMembers(body.slice(openingIndex + 1, closingIndex))
  }

  return finalCount
}

function findInlineException(source, metric, position = source.length) {
  const context = source.slice(Math.max(0, position - 800), position)
  const exceptionPattern = new RegExp(`@api-surface-exception\\s+${metric}\\s*:\\s*([^\\n*]+)`, 'g')
  const matches = [...context.matchAll(exceptionPattern)]
  return matches.at(-1)?.[1].trim() ?? null
}

function collectComposableMetrics(source, path) {
  const metrics = []
  const declarationPattern = /export\s+(?:async\s+)?function\s+(use[A-Z]\w*)\s*(?:<[^>]+>)?\s*\(/g
  let declarationMatch

  while ((declarationMatch = declarationPattern.exec(source)) !== null) {
    const parametersOpeningIndex = declarationMatch.index + declarationMatch[0].lastIndexOf('(')
    const parametersClosingIndex = findMatchingDelimiter(source, parametersOpeningIndex, '(', ')')
    if (parametersClosingIndex === -1) continue
    const body = findFunctionBody(source, parametersClosingIndex + 1)
    if (!body) continue
    const name = declarationMatch[1]
    metrics.push({
      path,
      subject: name,
      metric: 'composableDependencies',
      actual: countParameters(
        source,
        source.slice(parametersOpeningIndex + 1, parametersClosingIndex)
      ),
      exception: findInlineException(source, 'composableDependencies', declarationMatch.index)
    })
    metrics.push({
      path,
      subject: name,
      metric: 'composableReturnMembers',
      actual: countReturnMembers(body),
      exception: findInlineException(source, 'composableReturnMembers', declarationMatch.index)
    })
  }

  const arrowPattern = /export\s+const\s+(use[A-Z]\w*)\s*=\s*(?:async\s*)?\(/g
  let arrowMatch

  while ((arrowMatch = arrowPattern.exec(source)) !== null) {
    const parametersOpeningIndex = arrowMatch.index + arrowMatch[0].lastIndexOf('(')
    const parametersClosingIndex = findMatchingDelimiter(source, parametersOpeningIndex, '(', ')')
    if (parametersClosingIndex === -1) continue
    const arrowIndex = source.indexOf('=>', parametersClosingIndex)
    if (arrowIndex === -1) continue
    const body = findFunctionBody(source, arrowIndex + 2)
    if (!body) continue
    const name = arrowMatch[1]
    metrics.push({
      path,
      subject: name,
      metric: 'composableDependencies',
      actual: countParameters(
        source,
        source.slice(parametersOpeningIndex + 1, parametersClosingIndex)
      ),
      exception: findInlineException(source, 'composableDependencies', arrowMatch.index)
    })
    metrics.push({
      path,
      subject: name,
      metric: 'composableReturnMembers',
      actual: countReturnMembers(body),
      exception: findInlineException(source, 'composableReturnMembers', arrowMatch.index)
    })
  }

  return metrics
}

/** Collect every measured public surface in one client source file. */
export function collectSourceMetrics(source, path) {
  const metrics = []

  if (path.endsWith('.vue')) {
    metrics.push({
      path,
      subject: 'component',
      metric: 'componentProps',
      actual: countComponentProps(source),
      exception: findInlineException(source, 'componentProps')
    })
    metrics.push({
      path,
      subject: 'component',
      metric: 'componentExposedMembers',
      actual: countExposedMembers(source),
      exception: findInlineException(source, 'componentExposedMembers')
    })
  }

  if (path.includes('/composables/') && path.endsWith('.ts')) {
    metrics.push(...collectComposableMetrics(source, path))
  }

  return metrics
}

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) yield* walk(fullPath)
    else if (isSourceFile(entry.name)) yield fullPath
  }
}

export async function collectProjectMetrics(sourceDirectory = SOURCE_DIRECTORY) {
  const metrics = []
  for await (const file of walk(sourceDirectory)) {
    const path = relative(APP_DIRECTORY, file).replaceAll('\\', '/')
    if (isTestFile(path)) continue
    const source = await readFile(file, 'utf8')
    metrics.push(...collectSourceMetrics(source, path))
  }
  return metrics
}

function exceptionKey({ path, subject, metric }) {
  return `${path}:${subject}:${metric}`
}

export function validateMetrics(metrics, baseline) {
  const exceptions = new Map(
    baseline.exceptions.map((exception) => [exceptionKey(exception), exception])
  )
  const findings = []
  for (const item of metrics) {
    const limit = baseline.limits[item.metric]
    if (limit === undefined || item.actual <= limit) continue

    const key = exceptionKey(item)
    const exception = exceptions.get(key)
    if (!exception) {
      if (item.exception && /#\d+\b/.test(item.exception)) continue
      findings.push({
        ...item,
        message: item.exception
          ? `invalid exception: link its tracking issue with #123 (actual ${item.actual}, limit ${limit})`
          : `new violation: ${item.actual} exceeds the limit of ${limit}`
      })
      continue
    }

    if (item.actual > exception.allowed) {
      findings.push({
        ...item,
        message: `regression: ${item.actual} exceeds the baseline allowance of ${exception.allowed}`
      })
    }
  }

  for (const exception of baseline.exceptions) {
    const key = exceptionKey(exception)
    const current = metrics.find((item) => exceptionKey(item) === key)
    if (!current || current.actual <= baseline.limits[exception.metric]) {
      findings.push({
        ...exception,
        actual: current?.actual ?? 0,
        message: 'stale baseline exception: remove it after reducing the public surface'
      })
    }
  }

  return findings
}

export function compareBaselines(reference, candidate) {
  const referenceExceptions = new Map(
    reference.exceptions.map((exception) => [exceptionKey(exception), exception])
  )
  const findings = []

  for (const [metric, candidateLimit] of Object.entries(candidate.limits)) {
    const referenceLimit = reference.limits[metric]
    if (referenceLimit !== undefined && candidateLimit > referenceLimit) {
      findings.push(`limit ${metric} increased from ${referenceLimit} to ${candidateLimit}`)
    }
  }

  for (const exception of candidate.exceptions) {
    const referenceException = referenceExceptions.get(exceptionKey(exception))
    if (!referenceException) {
      findings.push(`new baseline exception: ${exceptionKey(exception)}`)
      continue
    }
    if (exception.allowed > referenceException.allowed) {
      findings.push(
        `baseline allowance increased for ${exceptionKey(exception)}: ` +
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
      execFileSync('git', ['show', `origin/${baseBranch}:app/scripts/api-surface-baseline.json`], {
        cwd: APP_DIRECTORY,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      })
    )
  } catch {
    // The first ratchet baseline has no ancestor to compare. Every later branch does.
    return null
  }
}

function formatFinding(finding) {
  return `  ${finding.path} (${finding.subject}, ${finding.metric}): ${finding.message}`
}

export async function main({
  baselineFile = BASELINE_FILE,
  sourceDirectory = SOURCE_DIRECTORY
} = {}) {
  const baseline = await loadBaseline(baselineFile)
  const metrics = await collectProjectMetrics(sourceDirectory)
  const findings = validateMetrics(metrics, baseline)
  const referenceBaseline = loadReferenceBaseline()
  const baselineFindings = referenceBaseline ? compareBaselines(referenceBaseline, baseline) : []

  if (findings.length === 0 && baselineFindings.length === 0) {
    console.log('OK: client API surface is within its ratchet baseline.')
    return 0
  }

  if (findings.length > 0) {
    console.error('Client API surface violations:\n')
    for (const finding of findings) console.error(formatFinding(finding))
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

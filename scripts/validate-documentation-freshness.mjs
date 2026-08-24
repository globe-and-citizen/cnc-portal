#!/usr/bin/env node

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCurrentRepository } from './lib/documentation-freshness.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

try {
  const { baseCommit, changedPaths, documents, errors } = validateCurrentRepository(repositoryRoot)

  console.log(`Documentation freshness base: ${baseCommit}`)
  console.log(`Canonical documentation owners: ${documents.length}`)
  console.log(`Changed repository paths: ${changedPaths.length}`)

  if (errors.length === 0) {
    console.log('Documentation freshness is valid.')
    process.exit(0)
  }

  console.error(`Documentation freshness failed (${errors.length}):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
} catch (error) {
  console.error(`Could not validate documentation freshness: ${error.message}`)
  process.exit(1)
}

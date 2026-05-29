import { test as base, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const COVERAGE_DIR = join(process.cwd(), 'coverage', 'e2e', '.tmp')

/**
 * Window shape exposed by `vite-plugin-istanbul`-instrumented bundles.
 * Each top-level key is a source file path, each value is the Istanbul
 * counters object (statementMap, fnMap, branchMap, s, f, b, …).
 */
type IstanbulCoverage = Record<string, unknown>

declare global {
  interface Window {
    __coverage__?: IstanbulCoverage
  }
}

/**
 * After every test, snapshot `window.__coverage__` and write it to disk so
 * `nyc` can later aggregate all snapshots into an lcov report. No-ops if the
 * page wasn't instrumented (regular dev/prod builds, or VITE_E2E unset).
 */
async function dumpCoverage(page: Page): Promise<void> {
  if (page.isClosed()) return
  const coverage = await page.evaluate<IstanbulCoverage | undefined>(() => window.__coverage__)
  if (!coverage) return
  await mkdir(COVERAGE_DIR, { recursive: true })
  await writeFile(
    join(COVERAGE_DIR, `coverage-${randomUUID()}.json`),
    JSON.stringify(coverage),
    'utf-8'
  )
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page)
    await dumpCoverage(page)
  }
})

export { expect } from '@playwright/test'

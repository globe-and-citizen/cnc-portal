import { test as playwright, type BrowserContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const COVERAGE_DIR = join(process.cwd(), 'coverage', 'e2e', '.tmp')
const TOKEN_PRICE_ROUTE = 'https://api.coingecko.com/api/v3/coins/**'
const TOKEN_PRICE_RESPONSE = {
  market_data: { current_price: { usd: 1, cad: 1, eur: 1, idr: 1, inr: 1 } }
}

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

/** Capture one page's Istanbul counters before its browser context is closed. */
export async function captureCoverage(page: Page): Promise<void> {
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

/** Replace the external token-price boundary with deterministic local values. */
export async function stubTokenPrices(target: Page | BrowserContext): Promise<void> {
  await target.route(TOKEN_PRICE_ROUTE, (route) => route.fulfill({ json: TOKEN_PRICE_RESPONSE }))
}

/**
 * Base lifecycle shared by every browser profile. It owns only hermetic browser
 * concerns so mocked specs can safely run in separate Playwright workers.
 */
export const test = playwright.extend({
  page: async ({ page }, use) => {
    await stubTokenPrices(page)
    await use(page)
    await captureCoverage(page)
  }
})

export { expect } from '@playwright/test'

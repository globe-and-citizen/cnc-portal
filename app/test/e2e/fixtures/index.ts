import { test as base, type BrowserContext, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Hex } from 'viem'
import { E2E_OWNER_PRIVATE_KEY, revertChain, snapshotChain } from '../e2e-chain'
import { useWallet } from '../e2e-page'
import { signInToRealStack } from '../company/real-company-page'
import {
  deleteIntegratedTeam,
  removeIntegratedTeamFeatureOverride,
  setIntegratedTeamFeatureOverride,
  type IntegratedFeatureStatus
} from '../integrated-api'
import {
  createOperationalTeamFixture,
  type OperationalTeamFixture,
  type OperationalTeamOptions
} from '../factories/operational-team'

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

async function stubTokenPrices(target: Page | BrowserContext): Promise<void> {
  await target.route(TOKEN_PRICE_ROUTE, (route) => route.fulfill({ json: TOKEN_PRICE_RESPONSE }))
}

export type WalletPageFactory = (privateKey: Hex) => Promise<Page>
export type OperationalTeamFactory = (
  options?: OperationalTeamOptions
) => Promise<OperationalTeamFixture>
export type TeamFeatureOverrideFactory = (
  teamId: string,
  functionName: string,
  status: IntegratedFeatureStatus
) => Promise<void>

interface E2EFixtures {
  authenticatedPage: Page
  walletPage: WalletPageFactory
  operationalTeam: OperationalTeamFactory
  teamFeatureOverride: TeamFeatureOverrideFactory
  chainIsolation: void
}

export const test = base.extend<E2EFixtures>({
  chainIsolation: [
    async ({}, use) => {
      const snapshotId = await snapshotChain()
      try {
        await use()
      } finally {
        await revertChain(snapshotId)
      }
    },
    { auto: true }
  ],
  page: async ({ page }, use) => {
    await stubTokenPrices(page)
    await use(page)
    await dumpCoverage(page)
  },
  authenticatedPage: async ({ page }, use) => {
    await useWallet(page, E2E_OWNER_PRIVATE_KEY)
    await signInToRealStack(page)
    await use(page)
  },
  walletPage: async ({ browser }, use) => {
    const sessions: Array<{ context: BrowserContext; page: Page }> = []
    await use(async (privateKey) => {
      const context = await browser.newContext()
      await stubTokenPrices(context)
      const page = await context.newPage()
      sessions.push({ context, page })
      await useWallet(page, privateKey)
      await signInToRealStack(page)
      return page
    })
    for (const { context, page } of sessions.reverse()) {
      await dumpCoverage(page)
      await context.close()
    }
  },
  operationalTeam: async ({}, use) => {
    const teams: OperationalTeamFixture[] = []
    await use(async (options) => {
      const team = await createOperationalTeamFixture(options)
      teams.push(team)
      return team
    })
    for (const team of teams.reverse()) {
      await deleteIntegratedTeam(team.teamId)
    }
  },
  teamFeatureOverride: async ({}, use) => {
    const overrides: Array<{ teamId: string; functionName: string }> = []
    await use(async (teamId, functionName, status) => {
      await setIntegratedTeamFeatureOverride(teamId, functionName, status)
      overrides.push({ teamId, functionName })
    })
    for (const { teamId, functionName } of overrides.reverse()) {
      await removeIntegratedTeamFeatureOverride(teamId, functionName)
    }
  }
})

export { expect } from '@playwright/test'

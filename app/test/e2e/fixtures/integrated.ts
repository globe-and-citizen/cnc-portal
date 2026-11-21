import type { BrowserContext, Page } from '@playwright/test'
import {
  type IntegratedFeatureStatus,
  deleteIntegratedTeam,
  removeIntegratedTeamFeatureOverride,
  setIntegratedTeamFeatureOverride
} from '../integrated-api'
import {
  type OperationalTeamFixture,
  type OperationalTeamOptions,
  createOperationalTeamFixture
} from '../factories/operational-team'
import { captureCoverage, stubTokenPrices } from './base'
import { E2E_OWNER_PRIVATE_KEY } from '../e2e-chain'
import type { Hex } from 'viem'
import { test as chainTest } from './chain'
import { signInToRealStack } from '../company/real-company-page'
import { useWallet } from '../e2e-page'

export type WalletPageFactory = (privateKey: Hex) => Promise<Page>
export type OperationalTeamFactory = (
  options?: OperationalTeamOptions
) => Promise<OperationalTeamFixture>
export type TeamFeatureOverrideFactory = (
  teamId: string,
  functionName: string,
  status: IntegratedFeatureStatus
) => Promise<void>

interface IntegratedFixtures {
  authenticatedPage: Page
  walletPage: WalletPageFactory
  operationalTeam: OperationalTeamFactory
  teamFeatureOverride: TeamFeatureOverrideFactory
}

/** Full-stack fixtures layered on top of per-test local-chain isolation. */
export const test = chainTest.extend<IntegratedFixtures>({
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
      await captureCoverage(page)
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

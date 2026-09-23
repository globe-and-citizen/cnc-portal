import { expect, test } from '../fixtures'
import { parseUnits } from 'viem'
import { E2E_MEMBER, E2E_OWNER, revertChain, snapshotChain } from '../e2e-chain'
import {
  createOfferOnChain,
  deployCommunityCreditE2EFixture,
  getLendingOffer,
  lenderDeposits,
  type CommunityCreditE2EFixture
} from './community-credit-chain'
import {
  lendToRound,
  openCommunityCredit,
  openRound,
  publishCreditCall
} from './community-credit-page'

let fixture: CommunityCreditE2EFixture
let snapshotId: string

test.beforeAll(async () => {
  fixture = await deployCommunityCreditE2EFixture()
})

test.beforeEach(async () => {
  snapshotId = await snapshotChain()
})

test.afterEach(async () => {
  await revertChain(snapshotId)
})

test.describe('Community Credit — round', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(180_000)

  test(
    'publishes a general-access round visible in the UI and on-chain',
    { tag: '@US-CC-002' },
    async ({ page }) => {
      await openCommunityCredit(page, fixture)
      await publishCreditCall(page, { name: 'E2E General Round' })

      await expect(
        page.locator('[data-test="credit-round-card"]', { hasText: 'E2E General Round' })
      ).toBeVisible({ timeout: 30_000 })

      const offer = await getLendingOffer(fixture.fixedReturn, 1n)
      expect(offer.token.toLowerCase()).toBe(fixture.usdc.toLowerCase())
      expect(offer.fundingAccess).toBe(0) // General
      expect(offer.totalFunded).toBe(0n)
    }
  )

  test(
    'lends to an open round and reflects the deposit in the UI and on-chain',
    { tag: '@US-CC-003' },
    async ({ page }) => {
      await openCommunityCredit(page, fixture)
      await publishCreditCall(page, { name: 'E2E Lend Round' })
      await openRound(page, 'E2E Lend Round')

      await lendToRound(page, '1000')

      await expect(page.getByText('Credit signed', { exact: false }).first()).toBeVisible({
        timeout: 30_000
      })
      await expect
        .poll(() => lenderDeposits(fixture.fixedReturn, 1n, E2E_OWNER))
        .toBe(parseUnits('1000', 6))
    }
  )

  test(
    'restricts lending to whitelisted members only',
    { tag: '@US-CC-003-06' },
    async ({ page }) => {
      await openCommunityCredit(page, fixture)
      await publishCreditCall(page, {
        name: 'E2E Restricted Round',
        access: 'restricted',
        whitelist: [E2E_MEMBER]
      })
      await openRound(page, 'E2E Restricted Round')

      // The signed-in owner is not on this round's whitelist, so Lend must not be
      // offered — a restricted round accepts funds only from a whitelisted member.
      await expect(page.locator('[data-test="round-cta-lend"]')).toHaveCount(0)
    }
  )

  test(
    'shows the whitelist allocation as the lend cap, not the unrelated general cap',
    { tag: '@US-CC-003-07' },
    async ({ page }) => {
      // Seeded directly on-chain (not through the wizard) so this test can sign in
      // as the whitelisted member from the start, instead of switching identity
      // mid-test — the E2E wallet is selected once, before sign-in.
      await createOfferOnChain(fixture.fixedReturn, {
        // Whitelisted allocations must sum to at least fundingTarget — match it
        // exactly to the one allocation below.
        fundingTarget: parseUnits('500', 6),
        fundingAccess: 1, // Whitelist
        isCapEnabled: true,
        lenderCap: parseUnits('999999', 6), // deliberately large, must NOT be shown
        whitelistAddrs: [E2E_MEMBER],
        allocations: [parseUnits('500', 6)]
      })

      // No off-chain title was set for this on-chain-seeded offer, so the round
      // falls back to displaying "Round #<offerId>" (see lendingOfferToCreditRound).
      await openCommunityCredit(page, fixture, { user: 'member' })
      await openRound(page, 'Round #1')
      await page.locator('[data-test="round-cta-lend"]').click()

      await expect(page.locator('[data-test="lend-cap"]')).toContainText('500 USDC')
    }
  )
})

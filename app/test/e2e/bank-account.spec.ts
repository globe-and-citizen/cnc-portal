import { test, expect } from './fixtures'

const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const BANK_ADDRESS = '0x0000000000000000000000000000000000000001'
const NONCE = '41vj7bz5Ow8oT5xaE'

const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body)
})

const bankTeam = {
  id: '1',
  name: 'E2E Bank Team',
  slug: 'e2e-bank-team',
  description: 'A deterministic team used by the Bank Account E2E suite.',
  isHidden: false,
  isArchived: false,
  isMigrated: true,
  ownerAddress: TEST_ADDRESS,
  members: [
    {
      id: 'owner-1',
      name: 'E2E Owner',
      address: TEST_ADDRESS,
      teamId: 1
    }
  ],
  currentOfficer: null,
  teamContracts: [
    {
      address: BANK_ADDRESS,
      type: 'Bank',
      deployer: TEST_ADDRESS,
      admins: []
    }
  ]
}

test.describe('Bank Account', () => {
  test('opens the Bank Account page for a team with a deployed Bank', async ({ page }) => {
    // The backend is stubbed so this read-only scenario is deterministic and
    // does not depend on a local API server. Contract reads remain outside
    // this first route smoke test.
    await page.route(/\/\/[^/]+(?::\d+)?\/api\//, (route) => {
      const { pathname } = new URL(route.request().url())

      if (pathname.startsWith('/api/user/nonce/')) {
        return route.fulfill(json({ nonce: NONCE }))
      }
      if (pathname === '/api/auth/siwe') {
        return route.fulfill(json({ accessToken: 'e2e.test.token' }))
      }
      if (pathname.startsWith('/api/user/0x')) {
        return route.fulfill(
          json({ address: TEST_ADDRESS, name: 'E2E Owner', nonce: NONCE, imageUrl: null })
        )
      }
      if (pathname === '/api/teams/1') {
        return route.fulfill(json(bankTeam))
      }
      if (pathname === '/api/teams') {
        return route.fulfill(json([bankTeam]))
      }
      if (pathname === '/api/notification') {
        return route.fulfill(json([]))
      }

      return route.fulfill(json({}))
    })

    await page.goto('/')
    await page.getByTestId('sign-in').click()
    await expect(page).toHaveURL(/\/teams$/, { timeout: 15000 })

    // Keep navigation in the SPA. A hard page reload deliberately drops the
    // in-memory E2E wallet connection and would exercise the locked-session
    // screen rather than the Bank Account journey.
    await page.locator('[data-test="team-card-1"] [data-test="team-link"]').click()
    await expect(page).toHaveURL(/\/teams\/1$/)
    await page.getByText('Accounts', { exact: true }).click()

    await expect(page).toHaveURL(/\/teams\/1\/accounts\/bank-account$/)
    await expect(page.getByRole('heading', { name: 'Balance' })).toBeVisible()
    await expect(page.getByText('Token Holding', { exact: true })).toBeVisible()
    await expect(page.locator('[data-test="bank-transactions"]')).toBeVisible()
  })
})

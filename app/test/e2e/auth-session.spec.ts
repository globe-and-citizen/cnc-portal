import type { Page } from '@playwright/test'
import { json, stubBackend } from './e2e-page'
import { expect, test } from './fixtures/mocked'

const user = {
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const,
  name: 'Session Tester',
  imageUrl: null
}
const token = 'e2e.test.token'
const workspace = (page: Page) => page.locator('[data-test="team-list"]')
const storedToken = (page: Page) => page.evaluate(() => localStorage.getItem('authToken'))

async function rejectFeatureRequest(page: Page, status: 401 | 403) {
  const release = Promise.withResolvers<void>()
  await stubBackend(page, {
    user,
    team: {},
    respond: async (path, request) => {
      if (path === '/api/teams') return json([])
      if (path !== '/api/notification') return
      expect(request.headers().authorization).toBe(`Bearer ${token}`)
      await release.promise
      return json({ message: 'Rejected' }, status)
    }
  })
  await page.goto('/login')
  const notification = page.waitForResponse(
    (response) => response.url().endsWith('/api/notification') && response.status() === status
  )
  try {
    await page.getByTestId('sign-in').click()
    await expect(workspace(page)).toBeVisible()
  } finally {
    release.resolve()
  }
  await notification
}

test.describe(
  '[US-AUTH-001] Session failure and recovery',
  {
    tag: ['@browser', '@mocked', '@parallel-safe']
  },
  () => {
    test('[AC-US-AUTH-001-10] retains the saved session during an outage and verifies it on reload', async ({
      page
    }) => {
      let unavailable = false
      let requests = 0
      await stubBackend(page, {
        user,
        team: {},
        respond: async (path) => {
          if (path === '/api/teams') return json([])
          if (path !== '/api/auth/token') return
          requests++
          return unavailable ? json({ message: 'Unavailable' }, 503) : json({})
        }
      })
      await page.goto('/login')
      await page.getByTestId('sign-in').click()
      await expect(workspace(page)).toBeVisible()

      unavailable = true
      await page.reload()
      // Verification retries and the lazy login view both need to settle.
      await expect(page.getByTestId('sign-in')).toBeVisible({ timeout: 30_000 })
      expect(requests).toBe(4)
      await expect(workspace(page)).toHaveCount(0)
      expect(await storedToken(page)).toBe(token)

      unavailable = false
      await page.reload()
      await expect(workspace(page)).toBeVisible()
      expect(requests).toBe(5)
      expect(await storedToken(page)).toBe(token)
    })

    test('[AC-US-AUTH-001-11] preserves the session after a feature request returns 403', async ({
      page
    }) => {
      await rejectFeatureRequest(page, 403)
      await expect(workspace(page)).toBeVisible()
      await expect(page).toHaveURL(/\/teams$/)
      expect(await storedToken(page)).toBe(token)
    })

    test('[AC-US-AUTH-001-12] ends the current session after a feature request returns 401', async ({
      page
    }) => {
      await rejectFeatureRequest(page, 401)
      await expect(page.getByTestId('sign-in')).toBeVisible()
      await expect(workspace(page)).toHaveCount(0)
      expect(await storedToken(page)).toBeNull()
    })

    for (const step of ['nonce', 'signature', 'profile'] as const) {
      /**
       * Covers:
       * - [AC-US-AUTH-001-13]
       * - [AC-US-AUTH-001-15]
       */
      test(`retries the same sign-in flow after ${step} fails`, async ({ page }) => {
        let failing = true
        await stubBackend(page, {
          user,
          team: {},
          respond: async (path) => {
            if (path === '/api/teams') return json([])
            if (!failing) return
            if (step === 'nonce' && path.startsWith('/api/user/nonce/')) {
              return json({ message: 'Nonce unavailable' }, 400)
            }
            if (step === 'signature' && path === '/api/auth/siwe') {
              return json({ message: 'Signature rejected' }, 401)
            }
            if (step === 'profile' && path === `/api/user/${user.address}`) {
              return json({ message: 'Profile unavailable' }, 404)
            }
          }
        })
        await page.goto('/login')
        const signIn = page.getByTestId('sign-in')
        await signIn.click()
        const error = {
          nonce: 'Failed to fetch nonce',
          signature: 'Failed to get authentication token',
          profile: 'Failed to fetch user data'
        }[step]
        await expect(page.getByText(error, { exact: true })).toBeVisible()
        await expect(workspace(page)).toHaveCount(0)
        expect(await storedToken(page)).toBeNull()

        failing = false
        await signIn.click()
        await expect(workspace(page)).toBeVisible()
        expect(await storedToken(page)).toBe(token)
      })
    }
  }
)

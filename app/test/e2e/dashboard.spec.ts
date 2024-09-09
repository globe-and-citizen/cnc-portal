import { test as login } from '../fixtures/login.fixture'
import { testWithSynpress } from '@synthetixio/synpress'

const test = testWithSynpress(login)

const { expect, describe, beforeEach } = test

describe('Dashboard', () => {
  beforeEach(async ({ page, login }) => {
    await login()
    await page.goto('http://localhost:5173')
  })

  test('should be able to access the dashboard', async ({ page }) => {
    await expect(page.locator('h1').first()).toHaveText('Welcome To the CNC portal')
    await expect(page.locator('p').first()).toHaveText(
      'Our Website is still in construction. Look into our wonderfull tip feature and try to tip your team'
    )
    await expect(page.locator('[data-testid="tip-your-team-button"]')).toHaveText('Tip your Team')
  })
})

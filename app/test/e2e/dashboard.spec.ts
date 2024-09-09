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
    await page.locator('data-test=tip-button').click()
    await page.waitForURL('http://localhost:5173/teams')
    expect(page.url()).toContain('http://localhost:5173/teams')
  })
})

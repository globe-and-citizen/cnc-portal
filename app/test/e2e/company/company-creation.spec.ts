import { expect, test as base } from '../fixtures'
import { json } from '../e2e-page'
import {
  type CompanyApi,
  enterCompanyDetails,
  finishWithoutContracts,
  gate,
  member,
  openCompanyCreation
} from './company-page'

const test = base.extend<{ companyCreation: CompanyApi }>({
  companyCreation: async ({ page }, use) => {
    await use(await openCompanyCreation(page))
  }
})

// Browser coverage of US-COMPANIES-001. The API is simulated, so database
// persistence, automatic owner membership and unique slugs need backend coverage.
test.describe('[US-COMPANIES-001] Company creation', { tag: '@US-COMPANIES-001' }, () => {
  test.describe.configure({ mode: 'parallel' })

  /**
   * Covers:
   * - [AC-US-COMPANIES-001-01]
   * - [AC-US-COMPANIES-001-02]
   * - [AC-US-COMPANIES-001-04]
   */
  test('validates required details and creates a company with an initial member', async ({
    page,
    companyCreation: api
  }) => {
    await page.locator('[data-test="next-button"]').click()
    await expect(page.getByText('Company name is required', { exact: true })).toBeVisible()
    await expect(page.locator('[data-test="step-1"]')).toBeVisible()
    await expect(page.locator('[data-test="step-2"]')).toHaveCount(0)
    expect(api.attempts).toHaveLength(0)

    await enterCompanyDetails(page)
    await page.getByPlaceholder('Search by name or address').fill(member.address)
    await page.locator('[data-test="user-row"]').filter({ hasText: member.name }).click()
    await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
    await page.locator('[data-test="create-team-button"]').click()
    await finishWithoutContracts(page)
    expect(api.attempts).toEqual([{ name: 'E2E Company', description: '', members: [member] }])
    expect(api.companies).toHaveLength(1)
  })

  /**
   * Covers:
   * - [AC-US-COMPANIES-001-07]
   */
  test('preserves details and lets the creator remove a member before submission', async ({
    page,
    companyCreation: api
  }) => {
    await enterCompanyDetails(page, 'A company created through the browser')
    await page.getByPlaceholder('Search by name or address').fill(member.address)
    await page.locator('[data-test="user-row"]').filter({ hasText: member.name }).click()
    await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
    await page.locator('[data-test="previous-button"]').click()
    await expect(page.getByPlaceholder('Acme Corp')).toHaveValue('E2E Company')
    await expect(page.getByPlaceholder('Enter a short description')).toHaveValue(
      'A company created through the browser'
    )
    await page.locator('[data-test="next-button"]').click()
    await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
    await expect(
      page.locator('[data-test="user-row"]').filter({ hasText: member.name })
    ).toHaveCount(0)
    await page
      .locator('[data-test="members-list"] [data-test="user-name"]')
      .filter({ hasText: member.name })
      .click()
    await expect(page.getByText('1 selected', { exact: true })).toHaveCount(0)
    await page.locator('[data-test="create-team-button"]').click()
    await finishWithoutContracts(page)
    expect(api.attempts).toEqual([
      {
        name: 'E2E Company',
        description: 'A company created through the browser',
        members: []
      }
    ])
  })

  /**
   * Covers:
   * - [AC-US-COMPANIES-001-08]
   */
  test('shows a failed creation and retries the same details successfully', async ({
    page,
    companyCreation: api
  }) => {
    api.failCreation = true
    await enterCompanyDetails(page, 'Preserved after an API failure')
    await page.locator('[data-test="create-team-button"]').click()
    // Keep failing through the shared HTTP client's automatic retries.
    await expect(page.locator('[data-test="create-team-error"]')).toBeVisible({
      timeout: 20_000
    })
    await expect(page.locator('[data-test="step-2"]')).toBeVisible()
    await expect(page.locator('[data-test="step-3"]')).toHaveCount(0)
    expect(api.companies).toHaveLength(0)
    const failedAttempts = api.attempts.length
    expect(failedAttempts).toBeGreaterThan(0)
    api.failCreation = false
    await page.locator('[data-test="create-team-button"]').click()
    await finishWithoutContracts(page)
    expect(api.attempts).toHaveLength(failedAttempts + 1)
    for (const attempt of api.attempts) expect(attempt).toEqual(api.attempts[0])
    expect(api.companies).toHaveLength(1)
  })

  test('disables submission and back navigation while creation is pending', async ({
    page,
    companyCreation: api
  }) => {
    const creation = gate()
    api.beforeCreate = () => creation.promise
    await enterCompanyDetails(page)
    await page.locator('[data-test="create-team-button"]').click()
    try {
      await expect.poll(() => api.attempts.length).toBe(1)
      await expect(page.locator('[data-test="create-team-button"]')).toBeDisabled()
      await expect(page.locator('[data-test="previous-button"]')).toBeDisabled()
      expect(api.companies).toHaveLength(0)
    } finally {
      creation.release()
    }
    await finishWithoutContracts(page)
    expect(api.attempts).toHaveLength(1)
  })

  test('opens creation from the company menu and cancels without creating a company', async ({
    page
  }) => {
    const api = await openCompanyCreation(page, 'menu')
    await expect(page).toHaveURL(/\/teams$/)
    await page.getByPlaceholder('Acme Corp').fill('Cancelled company')
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('[data-test="empty-state"]')).toBeVisible()
    expect(api.attempts).toHaveLength(0)
    expect(api.companies).toHaveLength(0)
  })

  /**
   * Covers:
   * - [AC-US-COMPANIES-001-05]
   */
  test('blocks creation when the directory supplies an invalid member address', async ({
    page,
    companyCreation: api
  }) => {
    // Defensive validation of a malformed directory response, not an invented
    // free-text member input: the actual UI only selects directory entries.
    await page.route(/\/api\/user(?:\?.*)?$/, (route) =>
      route.fulfill(
        json({
          users: [{ name: 'Invalid member', address: 'invalid-wallet', imageUrl: null }]
        })
      )
    )
    await enterCompanyDetails(page)
    await page.getByPlaceholder('Search by name or address').fill('Invalid member')
    await page.locator('[data-test="user-row"]').filter({ hasText: 'Invalid member' }).click()
    await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
    await expect(page.locator('[data-test="create-team-button"]')).toBeDisabled()
    expect(api.attempts).toHaveLength(0)
    await page
      .locator('[data-test="members-list"] [data-test="user-name"]')
      .filter({ hasText: 'Invalid member' })
      .click()
    await expect(page.locator('[data-test="create-team-button"]')).toBeEnabled()
  })
})

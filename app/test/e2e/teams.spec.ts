import { metaMaskFixtures } from '@synthetixio/synpress/playwright'
import { testWithSynpress } from '@synthetixio/synpress'
import connectedSetup from 'test/wallet-setup/connected.setup'
import type { Page } from '@playwright/test'

const test = testWithSynpress(metaMaskFixtures(connectedSetup))

const { expect, describe, beforeEach } = test

describe('Teams', () => {
  const users = [
    {
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      name: 'Local 1',
      nonce: 'tHBSeHXuveVFzEirM'
    },
    {
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      name: 'Local 2',
      nonce: 'tHBSeHXuveVFzEirM'
    }
  ]

  // const teams = [
  //   {
  //     id: '1',
  //     name: 'Team 1',
  //     description: 'Description of Team 1',
  //     bankAddress: null,
  //     members: [],
  //     ownerAddress: 'Owner Address',
  //     votingAddress: null,
  //     boardOfDirectorsAddress: null
  //   },
  //   {
  //     id: '2',
  //     name: 'Team 2',
  //     description: 'Description of Team 2',
  //     bankAddress: null,
  //     members: [],
  //     ownerAddress: 'Owner Address',
  //     votingAddress: null,
  //     boardOfDirectorsAddress: null
  //   }
  // ]

  beforeEach(async ({ page }) => {
    await page.route('**/api/notification', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      })
    })
  })

  describe('Team List', () => {
    // test('should display loading state and then render team list', async ({ page }) => {
    //   // Mock api to return teams

    //   await page.route(`**/api/teams`, async (route) => {
    //     // Simulate a loading state by delaying the response
    //     await page.waitForTimeout(500) // Delay for 2 seconds to simulate loading
    //     await route.fulfill({
    //       status: 200,
    //       contentType: 'application/json',
    //       body: JSON.stringify(teams)
    //     })
    //   })

    //   await page.goto('http://localhost:5173/teams')
    //   // Loading state assertion
    //   expect(await page.isVisible('[data-test="loader"]')).toBeTruthy()

    //   // Wait for teams to be rendered
    //   await page.waitForSelector('[data-test="team-list"]')
    //   expect(await page.isVisible('[data-test="loader"]')).toBeFalsy()
    //   expect(await page.isVisible('[data-test="team-list"]')).toBeTruthy()

    //   // Check if teams are rendered
    //   for (const team of teams) {
    //     expect(await page.isVisible(`[data-test="team-card-${team.id}"]`)).toBeTruthy()
    //     expect(await page.textContent(`[data-test="team-card-${team.id}"]`)).toContain(team.name)
    //     expect(await page.textContent(`[data-test="team-card-${team.id}"]`)).toContain(
    //       team.description
    //     )
    //   }

    //   // expect(await page.isHidden('[data-test="loading-state"]')).toBeTruthy()
    //   expect(await page.isVisible('[data-test="add-team-card"]')).toBeTruthy()

    //   await page.click('div[data-test="team-card-1"]')
    //   await page.waitForURL('http://localhost:5173/teams/1')

    //   expect(page.url()).toBe('http://localhost:5173/teams/1')
    // })

    // test('should render empty state if no teams are available', async ({ page }) => {
    //   // Mock api to return empty teams
    //   await page.route(`**/api/teams`, async (route) => {
    //     await route.fulfill({
    //       status: 200,
    //       contentType: 'application/json',
    //       body: JSON.stringify([])
    //     })
    //   })

    //   await page.goto('http://localhost:5173/teams')
    //   // Wait for empty state to appear
    //   await page.waitForSelector('[data-test="empty-state"]')

    //   expect(await page.isVisible('[data-test="empty-state"]')).toBeTruthy()
    //   expect(await page.isVisible('[data-test="add-team-card"]')).toBeTruthy()
    // })

    test('should render error state and toast if unable to fetch teams', async ({ page }) => {
      // Mock api to return 500 error
      await page.route(`**/api/teams`, async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false
          })
        })
      })

      await page.goto('http://localhost:5173/teams')
      // Wait for error message to appear
      await page.waitForSelector('[data-test="error-state"]')

      expect(await page.isVisible('[data-test="error-state"]')).toBeTruthy()
    })
  })

  describe('Add Team', () => {
    const addMember = async (page: Page, userIndex: number) => {
      await page.route(`**/api/user/search*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            users: Array(users[userIndex])
          })
        })
      })
      // Fill form
      await page.fill('[data-test="team-name-input"]', 'Team 1')
      await page.fill('[data-test="team-description-input"]', 'Description of Team 1')

      await page.click('[data-test="next-button"]')
      await page.click(`[data-test="member-name-input"]`)
      await page.keyboard.type(`Local ${userIndex + 1}`)

      // Wait for user search to load
      await page.waitForSelector(`[data-test="user-dropdown-${users[userIndex].address}"]`)
      expect(
        await page.isVisible(`[data-test="user-dropdown-${users[userIndex].address}"]`)
      ).toBeTruthy()

      // Select user
      await page.click(`[data-test="user-dropdown-${users[userIndex].address}"]`)
      expect(page.locator('[data-test="step-2"] [data-test="user-name"]')).toContainText(
        users[userIndex].name
      )
    }

    // test('should be able to add a new team', async ({ page, metamask }) => {
    test('should be able to add a new team', async ({ page }) => {
      // Mock api
      await page.route(`**/api/teams`, async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      })

      await page.goto('http://localhost:5173/teams')
      await page.click('div[data-test="add-team"]')

      await addMember(page, 0)
      // Submit form
      await page.route(`**/api/teams`, async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      })
      await page.click('[data-test="create-team-button"]')

      // Wait for success toast
      await page.waitForTimeout(3000)
      await page.waitForSelector('[data-test="toast-container"]')
      expect(await page.textContent('[data-test="toast-container"]')).toContain(
        'Team created successfully'
      )

      await page.route(`**/api/teams`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              name: 'Team 1',
              description: 'Description of Team 1',
              bankAddress: null,
              members: [
                {
                  address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                  name: 'Local 1'
                }
              ],
              ownerAddress: 'Owner Address',
              votingAddress: null,
              boardOfDirectorsAddress: null
            }
          ])
        })
      })
      await page.fill('[data-test="share-name-input"]', 'Testing')
      await page.fill('[data-test="share-symbol-input"]', 'TST')

      await page.click('[data-test="deploy-contracts-button"]')
      // TODO: Stuck here
      // await metamask.confirmSignature()
      // await page.reload()
      // // Wait for team card to appear
      // expect(await page.isVisible('[data-test="team-card-1"]')).toBeTruthy()
    })

    // test('should show error validation if form is not filled correctly', async ({ page }) => {
    //   await page.route(`**/api/teams`, async (route) => {
    //     await route.fulfill({
    //       status: 201,
    //       contentType: 'application/json',
    //       body: JSON.stringify([])
    //     })
    //   })

    //   await page.goto('http://localhost:5173/teams')
    //   await page.click('div[data-test="add-team"]')

    //   // Submit form
    //   await page.click('[data-test="create-team-button"]')

    //   // Wait for error message to appear
    //   // Team name error
    //   await page.waitForSelector('div[data-test="name-error"]')
    //   expect(await page.textContent('div[data-test="name-error"]')).toContain('Value is required')

    //   // Share name error
    //   await page.waitForSelector('div[data-test="share-name-error"]')
    //   expect(await page.textContent('div[data-test="share-name-error"]')).toContain(
    //     'Value is required'
    //   )

    //   // Share symbol error
    //   await page.waitForSelector('div[data-test="share-symbol-error"]')
    //   expect(await page.textContent('div[data-test="share-symbol-error"]')).toContain(
    //     'Value is required'
    //   )
    // })

    // test('should show error toast if unable to add team', async ({ page, metamask }) => {
    //   await page.route(`**/api/teams`, async (route) => {
    //     await route.fulfill({
    //       status: 201,
    //       contentType: 'application/json',
    //       body: JSON.stringify([])
    //     })
    //   })

    //   await page.goto('http://localhost:5173/teams')
    //   await page.click('div[data-test="add-team"]')

    //   // Fill form
    //   await addMember(page, 0)

    //   // Submit form
    //   await page.click('[data-test="create-team-button"]')
    //   await metamask.rejectTransaction()

    //   // Wait for error toast
    //   await page.waitForSelector('[data-test="toast-container"]')
    //   expect(await page.isVisible('[data-test="toast-container"]')).toBeTruthy()
    //   expect(await page.textContent('[data-test="toast-container"]')).toContain(
    //     'Failed to create officer contract'
    //   )
    // })
  })
})

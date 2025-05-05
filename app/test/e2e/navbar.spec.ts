import { metaMaskFixtures } from '@synthetixio/synpress/playwright'
import { testWithSynpress } from '@synthetixio/synpress'
import connectedSetup from 'test/wallet-setup/connected.setup'

const test = testWithSynpress(metaMaskFixtures(connectedSetup))

const { expect, describe } = test

describe('Navbar', () => {
  describe('profile', () => {
    test('should be able to edit user', async ({ page, metamask }) => {
      const address = await metamask.getAccountAddress()
      expect(await page.textContent('data-test=user-name')).toBe('Local 1')
      await page.locator('data-test=profile').click()

      await page.locator('data-test=toggleEditUser').click()
      await page.waitForSelector('data-test=edit-user-modal')

      expect(page.locator('data-test=name-input')).toHaveValue('John Doe')
      await page.locator('data-test=name-input').fill('John Doe')

      await page.route('**/api/user/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            address: address,
            name: 'John Doe'
          })
        })
      })
      await page.locator('data-test=submit-edit-user').click()

      await page.waitForSelector('data-test=user-name')
      expect(await page.textContent('data-test=user-name')).toBe('John Doe')
    })

    test('should be able to logout', async ({ page }) => {
      await page.locator('data-test=profile').click()
      await page.locator('data-test=logout').click()
      await page.waitForURL('http://localhost:5173/login')

      expect(page.url()).toBe('http://localhost:5173/login')
    })
  })

  describe('notifications', () => {
    const notifications = {
      success: true,
      data: [
        {
          id: 3,
          subject: 'Team Invitation',
          message: 'You have been added to a new team: LOCAL by Farrell',
          isRead: false,
          userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          createdAt: '2024-11-29T13:14:23.239Z',
          author: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          resource: 'teams/12'
        },
        {
          id: 2,
          subject: 'Team Invitation',
          message: 'You have been added to a new team: LOCAL by Local 1',
          isRead: false,
          userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          createdAt: '2024-11-29T13:10:40.050Z',
          author: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          resource: 'teams/1'
        }
      ]
    }
    test('should render list of notifications with pagination', async ({ page }) => {
      await page.route('**/api/notification', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(notifications)
        })
      })
      await page.reload()

      await page.locator('data-test=notifications').click()
      await page.waitForSelector('a[data-test="notification-3"]')

      await expect(page.locator('a[data-test="notification-3"]')).toBeVisible()
      await expect(page.locator('a[data-test="notification-2"]')).toBeVisible()

      await expect(page.locator('a[data-test="notification-1"]')).not.toBeVisible()
    })

    test('should not render anything if there is no notifications', async ({ page }) => {
      await page.locator('data-test=notifications').click()

      expect(page.locator('data-test=notification-1')).not.toBeVisible()
    })
  })
})

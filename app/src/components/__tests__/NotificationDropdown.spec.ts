import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, it, expect, beforeEach } from 'vitest'
import NotificationDropdown from '@/components/NotificationDropdown.vue'
import type { Notification } from '@/types/notification'
import { mockNotificationsRef, mockUpdateNotificationMutateAsync } from '@/tests/mocks/query.mock'
import { mockRouterPush } from '@/tests/mocks/router.mock'

const buildNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 1,
  subject: null,
  message: 'New notification',
  isRead: false,
  userAddress: '0x123',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  author: null,
  resource: null,
  ...overrides
})

describe('NotificationDropdown.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    mockNotificationsRef.value = [buildNotification()]
    mockRouterPush.mockReset()
    mockUpdateNotificationMutateAsync.mockReset()
    mockUpdateNotificationMutateAsync.mockResolvedValue(undefined)

    wrapper = mount(NotificationDropdown, {
      props: {}
    })
  })

  it('renders correctly and displays the dropdown button', () => {
    const button = wrapper.find('div[role="button"]')
    expect(button.exists()).toBe(true)
  })

  it('renders the notifications list', async () => {
    // Force an update to apply mock data
    await wrapper.vm.$nextTick()
    const notifications = wrapper.findAll('.notification__body')
    expect(notifications.length).toBe(1)
  })

  it('shows the badge when there are unread notifications', async () => {
    await wrapper.vm.$nextTick()
    const badge = wrapper.find('.badge')
    expect(badge.exists()).toBe(true)
  })

  it('does not render pagination controls when there are no notifications', async () => {
    mockNotificationsRef.value = []
    await nextTick()

    expect(wrapper.find('.join').exists()).toBe(false)
  })

  it('handles notification click and redirects to team route', async () => {
    mockNotificationsRef.value = [buildNotification({ id: 42, resource: 'teams/42' })]
    await nextTick()

    await wrapper.find('[data-test="notification-42"]').trigger('click')

    expect(mockUpdateNotificationMutateAsync).toHaveBeenCalledWith({ pathParams: { id: 42 } })
    expect(mockRouterPush).toHaveBeenCalledWith('/teams/42')
  })

  it('redirects elections resource to administration path', async () => {
    mockNotificationsRef.value = [buildNotification({ id: 77, resource: 'elections/15' })]
    await nextTick()

    await wrapper.find('[data-test="notification-77"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith('/teams/15/administration/bod-elections')
  })

  it('does not redirect when resource is missing', async () => {
    mockNotificationsRef.value = [buildNotification({ id: 8, resource: null })]
    await nextTick()

    await wrapper.find('[data-test="notification-8"]').trigger('click')

    expect(mockUpdateNotificationMutateAsync).toHaveBeenCalledWith({ pathParams: { id: 8 } })
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('supports next/prev pagination boundaries', async () => {
    mockNotificationsRef.value = [
      buildNotification({ id: 1 }),
      buildNotification({ id: 2 }),
      buildNotification({ id: 3 }),
      buildNotification({ id: 4 }),
      buildNotification({ id: 5 })
    ]
    await nextTick()

    const buttons = wrapper.findAll('button')
    const prev = buttons[0]
    const next = buttons[1]

    expect(wrapper.text()).toContain('1 / 2')
    expect(prev.attributes('disabled')).toBeDefined()
    expect(next.attributes('disabled')).toBeUndefined()

    await next.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('2 / 2')

    await next.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('2 / 2')

    await prev.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('1 / 2')
  })
})

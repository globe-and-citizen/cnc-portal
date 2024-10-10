import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NotificationDropdown from '@/components/NotificationDropdown.vue'
import { ref } from 'vue'
// Mock data
const mockNotifications = [
  {
    id: '1',
    message: 'Notification 1',
    isRead: false,
    resource: 'teams/1',
    author: 'Author 1',
    createdAt: '2024-07-01'
  },
  {
    id: '2',
    message: 'Notification 2',
    isRead: true,
    resource: 'teams/2',
    author: 'Author 2',
    createdAt: '2024-07-02'
  }
  // Add more mock notifications as needed
]

describe('NotificationDropdown.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    // Mock the fetch function to return the mock notifications
    vi.mock('@/composables/useCustomFetch', async (importOriginal) => {
      const actual: Object = await importOriginal()
      return ({
        ...actual,
        useCustomFetch: () => ({
          json: () => ({
            data: ref({ data: mockNotifications }),
            execute: vi.fn()
          }),
          put: () => ({
            json: () => ({
              execute: vi.fn()
            })
          }),
          get: () => ({
            json: () => ({
              data: ref({ data: mockNotifications }),
              execute: vi.fn()
            })
          })
        })
      })
    })

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
    expect(notifications.length).toBe(mockNotifications.length)
  })

  it('shows the badge when there are unread notifications', async () => {
    await wrapper.vm.$nextTick()
    const badge = wrapper.find('.badge')
    expect(badge.exists()).toBe(true)
  })
})

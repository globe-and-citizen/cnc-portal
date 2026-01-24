import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NotificationDropdown from '@/components/NotificationDropdown.vue'

const mockNotifications = [
  {
    id: 1,
    message: 'Notification 1',
    isRead: false,
    resource: 'teams/1',
    author: 'Author 1',
    createdAt: new Date('2024-07-01'),
    subject: null,
    userAddress: '0xUser'
  },
  {
    id: 2,
    message: 'Notification 2',
    isRead: true,
    resource: 'teams/2',
    author: 'Author 2',
    createdAt: new Date('2024-07-02'),
    subject: null,
    userAddress: '0xUser'
  },
  {
    id: 3,
    message: 'Notification 3',
    isRead: true,
    resource: 'wage-claim/1',
    author: 'Author 2',
    createdAt: new Date('2024-07-02'),
    subject: null,
    userAddress: '0xUser'
  }
]


vi.mock('@/stores', () => ({
  useUserDataStore: vi.fn(() => ({ address: '0xUserAddress' })),
  useToastStore: vi.fn(() => ({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  })),
}))


vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  }))
}))


describe('NotificationDropdown.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
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

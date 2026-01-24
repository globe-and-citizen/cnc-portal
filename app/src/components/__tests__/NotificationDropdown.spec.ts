import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NotificationDropdown from '@/components/NotificationDropdown.vue'

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
    expect(notifications.length).toBe(1)
  })

  it('shows the badge when there are unread notifications', async () => {
    await wrapper.vm.$nextTick()
    const badge = wrapper.find('.badge')
    expect(badge.exists()).toBe(true)
  })
})

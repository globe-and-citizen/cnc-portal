import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NotificationDropdown from '@/components/NotificationDropdown.vue'
import { ref, type Ref } from 'vue'

vi.mock('@/stores', () => ({
  useUserDataStore: vi.fn(),
  useToastStore: vi.fn(() => ({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  }))
}))

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  }))
}))

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
  },
  {
    id: '3',
    message: 'Notification 3',
    isRead: true,
    resource: 'wage-claim/1',
    author: 'Author 2',
    createdAt: '2024-07-02'
  }
  // Add more mock notifications as needed
]

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: (url: Ref<string>) => ({
    json: () => ({
      data: ref({ data: mockNotifications }),
      execute: vi.fn(),
      error: ref(null)
    }),
    put: () => ({
      json: () => ({
        execute: vi.fn()
      })
    }),
    get: () => ({
      json: () => ({
        execute: /*vi.fn()*/ vi.fn(() => {
          console.log(`url: `, url)
        }),
        error: ref(null)
      })
    })
  })
}))

describe('NotificationDropdown.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    // Mock the fetch function to return the mock notifications
    // vi.mock('@/composables/useCustomFetch', () => ({
    //   useCustomFetch: mockUseCustomFetch
    // }))

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

  it('calls handle wage correctly', async () => {
    await wrapper.vm.$nextTick()
    const notification = wrapper.find('[data-test="notification-3"]')
    expect(notification.exists()).toBeTruthy()
    notification.trigger('click')
    await wrapper.vm.$nextTick()
    //expect(getExecute).toHaveBeenCalledWith(`teams/1/cash-remuneration/claim`)
  })
})

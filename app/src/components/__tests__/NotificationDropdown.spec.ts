import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NotificationDropdown from '@/components/NotificationDropdown.vue'
import { ref } from 'vue'
import type { Team, Notification } from '@/types'

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

interface ComponentData {
  getWageClaimAPI: (throwOnFailed?: boolean) => Promise<unknown>
  updateEndPoint: string
  team: Partial<Team>
  wageClaim: unknown
  getResource: (notification: Notification) => string[]
}
vi.mock('@/stores', () => ({
  useUserDataStore: vi.fn(() => ({ address: '0xUserAddress' })),
  useToastStore: vi.fn(() => ({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  })),
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
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  }))
}))

const executeMock = vi.fn()

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: () => {
    const data = ref<unknown>(null)
    return {
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
          data,
          execute: executeMock,
          error: ref(null)
        })
      })
    }
  }
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

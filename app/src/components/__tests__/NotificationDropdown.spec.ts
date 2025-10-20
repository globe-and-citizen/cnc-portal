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

const mockNotificationStore = {
  notifications: mockNotifications,
  isLoading: ref(false),
  error: ref(null),
  fetchNotifications: vi.fn(async () => {
    mockNotificationStore.notifications = mockNotifications
  }),
  addBulkNotifications: vi.fn(),
  updateNotification: vi.fn()
}

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
  useNotificationStore: vi.fn(() => mockNotificationStore)
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

  // it('calls handle wage correctly', async () => {
  //   const wrapperVm: ComponentData = wrapper.vm as unknown as ComponentData
  //   executeMock.mockImplementation(() => {
  //     if (wrapperVm.updateEndPoint === 'teams/1/cash-remuneration/claim') {
  //       wrapperVm.wageClaim = {
  //         id: 1,
  //         createdAt: '2024-02-02T12:00:00Z',
  //         address: '0xUserToApprove',
  //         hoursWorked: 20,
  //         hourlyRate: '17.5',
  //         name: 'Local 1',
  //         teamId: 1,
  //         cashRemunerationSignature: '0xSignature'
  //       }
  //     } else if (wrapperVm.updateEndPoint === 'teams/1') {
  //       wrapperVm.team = { cashRemunerationEip712Address: '0xCashRemunerationEip712Address' }
  //     }
  //   })

  //   await wrapper.vm.$nextTick()
  //   const notification = wrapper.find('[data-test="notification-3"]')
  //   expect(notification.exists()).toBeTruthy()
  //   notification.trigger('click')
  //   await wrapper.vm.$nextTick()

  //   await wrapper.vm.$nextTick()
  //   expect(executeMock).toHaveBeenCalled()
  //   expect(mockUseWriteContract.writeContract).toBeCalled()
  // })
  describe('Methods', () => {
    it('getResource', async () => {
      const wrapperVm: ComponentData = wrapper.vm as unknown as ComponentData
      expect(wrapperVm.getResource(mockNotifications[2])).toEqual(['wage-claim', '1'])
    })
  })
})

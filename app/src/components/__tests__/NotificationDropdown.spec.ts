import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NotificationDropdown from '@/components/NotificationDropdown.vue'
import { ref, type Ref } from 'vue'
import * as fetch from '@/composables/useCustomFetch'
import { error } from 'console'
import type { Team, Notification } from '@/types'

interface ComponentData {
  getWageClaimAPI: (throwOnFailed?: boolean) => Promise<any>
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
  // Add more mock notifications as needed
]

const executeMock = vi.fn()
// const mockUseFetch = {
//   data: ref<unknown>(null),
//   error: ref(null),
//   execute: vi.fn()
// }

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: (url: Ref<string>) => {
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
          data,//: mockUseFetch.data,
          execute: executeMock,// mockUseFetch.execute, 
          error: ref(null)
        })
      })
    }
  }
  // (url: Ref<string>) => {
  //   const data = ref<unknown>(null)
  //   return {
  //     json: () => ({
  //       data: ref({ data: mockNotifications }),
  //       execute: vi.fn(),
  //       error: ref(null)
  //     }),
  //     put: () => ({
  //       json: () => ({
  //         execute: vi.fn()
  //       })
  //     }),
  //     get: () => ({
  //       json: () => ({
  //         data,
  //         execute: vi.fn(() => {
  //           if (url.value === 'teams/1/cash-remuneration/claim') {
  //             data.value = {
  //               id: 1,
  //               createdAt: '2024-02-02T12:00:00Z',
  //               address: '0xUserToApprove',
  //               hoursWorked: 20,
  //               hourlyRate: '17.5',
  //               name: 'Local 1',
  //               teamId: 1,
  //               cashRemunerationSignature: '0xSignature'
  //             }
  //           } else if (url.value === 'teams/1') {
  //             data.value = { cashRemunerationEip712Address: '0xCashRemunerationEip712Address' }
  //           }
  //         }),
  //         error: ref(null)
  //       })
  //     })
  //   }
  // }
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

  it('calls handle wage correctly', async () => {
    const wrapperVm: ComponentData = wrapper.vm as unknown as ComponentData
    executeMock.mockImplementation(() => {
      console.log(`updateEndPoint`, (/*wrapper.vm as unknown as ComponentData*/wrapperVm).updateEndPoint)
      if (/*(wrapper.vm as unknown as ComponentData)*/wrapperVm.updateEndPoint === 'teams/1/cash-remuneration/claim') {
        console.log(`executing claim...`)
        /*mockUseFetch.data.value*/ ;/*(wrapper.vm as unknown as ComponentData)*/wrapperVm.wageClaim = {
          id: 1,
          createdAt: '2024-02-02T12:00:00Z',
          address: '0xUserToApprove',
          hoursWorked: 20,
          hourlyRate: '17.5',
          name: 'Local 1',
          teamId: 1,
          cashRemunerationSignature: '0xSignature'
        }
      } else if (/*(wrapper.vm as unknown as ComponentData)*/wrapperVm.updateEndPoint === 'teams/1') {
        console.log(`executing cash remuneration...`)
        /*mockUseFetch.data.value*/ ;/*(wrapper.vm as unknown as ComponentData)*/wrapperVm.team = { cashRemunerationEip712Address: '0xCashRemunerationEip712Address' }
      }
    })
  
    await wrapper.vm.$nextTick()
    const notification = wrapper.find('[data-test="notification-3"]')
    expect(notification.exists()).toBeTruthy()
    notification.trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.vm.$nextTick()
    console.log(`updateEndPoint`, /*(wrapper.vm as unknown as ComponentData)*/wrapperVm.updateEndPoint)
    expect(executeMock).toHaveBeenCalled()
    expect(mockUseWriteContract.writeContract).toBeCalled()
  })
  describe('Methods', () => {
    it('getResource', async () => {
      const wrapperVm: ComponentData = wrapper.vm as unknown as ComponentData
      expect(wrapperVm.getResource(mockNotifications[2])).toEqual(['wage-claim', '1'])
    })
  })
})

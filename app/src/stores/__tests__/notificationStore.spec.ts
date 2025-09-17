import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationStore } from '../notificationStore'
import { nextTick, ref } from 'vue'

// Hoisted mocks
const mocks = vi.hoisted(() => ({
  useCustomFetch: vi.fn()
}))

// Mock the useCustomFetch composable
vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: mocks.useCustomFetch
}))

describe('Notification Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.useCustomFetch.mockImplementation(() => ({
      json: () => ({
        data: ref({
          data: []
        })
      })
    }))
  })

  it('initializes with empty notifications array', () => {
    const store = useNotificationStore()
    expect(store.notifications).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBe(null)
  })

  it('fetchNotifications updates the notifications state', async () => {
    const mockNotifications = {
      data: [
        {
          id: 1,
          message: 'Test notification',
          isRead: false,
          resource: 'teams/1',
          createdAt: new Date().toISOString()
        }
      ]
    }

    mocks.useCustomFetch.mockImplementation(() => ({
      json: () => ({
        data: ref({ data: mockNotifications.data })
      })
    }))

    const store = useNotificationStore()
    await store.fetchNotifications()
    await nextTick()

    expect(store.notifications).toEqual(mockNotifications.data)
    expect(store.isLoading).toBe(false)
  })

  it('handles fetchNotifications error', async () => {
    const errorMessage = 'Failed to fetch notifications'
    mocks.useCustomFetch.mockImplementation(() => ({
      json: () => {
        throw new Error(errorMessage)
      }
    }))

    const store = useNotificationStore()
    await expect(store.fetchNotifications()).rejects.toThrow()
    expect(store.error).toBeTruthy()
    expect(store.isLoading).toBe(false)
  })

  it('addBulkNotifications calls API and refreshes notifications', async () => {
    const mockPayload = {
      userIds: ['0x123'] as `0x${string}`[],
      message: 'Test message',
      subject: 'Test subject',
      author: '0xabc', // Add a valid author address
      resource: 'teams/1'
    }

    let executeCalled = false
    mocks.useCustomFetch.mockImplementation(() => ({
      json: () => ({
        data: ref({ data: [] })
      }),
      post: () => ({
        execute: async () => {
          executeCalled = true
          return { success: true }
        }
      })
    }))

    const store = useNotificationStore()
    await store.addBulkNotifications(mockPayload)

    expect(executeCalled).toBe(true)
    expect(mocks.useCustomFetch).toHaveBeenCalledWith('notification/bulk/', {
      immediate: false
    })
  })

  it.skip('updateNotification updates a specific notification', async () => {
    let executeCalled = false
    const notificationId = 1

    mocks.useCustomFetch.mockImplementation(() => ({
      json: () => ({
        data: ref({ data: [] })
      }),
      put: () => ({
        execute: async () => {
          executeCalled = true
          return { success: true }
        }
      })
    }))

    const store = useNotificationStore()
    await store.updateNotification(notificationId)

    expect(executeCalled).toBe(true)
    expect(mocks.useCustomFetch).toHaveBeenCalledWith(`notification/${notificationId}`, {
      immediate: false
    })
  })
})

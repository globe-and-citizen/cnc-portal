import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationStore } from '../notificationStore'
import { ref } from 'vue'
import type { Notification } from '@/types/notification'

// Mock TanStack Query hooks
vi.mock('@/queries/notification.queries', () => ({
  useNotifications: vi.fn(() => ({
    data: ref<Notification[]>([]),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn()
  })),
  useAddBulkNotifications: vi.fn(() => ({
    mutateAsync: vi.fn()
  })),
  useUpdateNotification: vi.fn(() => ({
    mutateAsync: vi.fn()
  }))
}))

describe('Notification Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with empty notifications array', () => {
    const store = useNotificationStore()
    expect(store.notifications).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('has fetchNotifications, addBulkNotifications, and updateNotification methods', () => {
    const store = useNotificationStore()
    expect(typeof store.fetchNotifications).toBe('function')
    expect(typeof store.addBulkNotifications).toBe('function')
    expect(typeof store.updateNotification).toBe('function')
  })
})

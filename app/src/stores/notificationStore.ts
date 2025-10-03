import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  NotificationResponse,
  BulkNotificationPayload,
  Notification
} from '@/types/notification'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { log } from '@/utils'

export const useNotificationStore = defineStore('notification', () => {
  // State
  const notifications = ref<Notification[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  // Actions
  const fetchNotifications = async () => {
    try {
      isLoading.value = true
      const { data } = await useCustomFetch<NotificationResponse>('notification').json()
      notifications.value = data.value?.data || []
    } catch (err) {
      error.value = err as Error
      log.error('Failed to fetch notifications:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const addBulkNotifications = async (payload: BulkNotificationPayload) => {
    try {
      const { execute } = useCustomFetch('notification/bulk/', {
        immediate: false
      }).post(payload)
      await execute()
      await fetchNotifications() // Refresh after adding
    } catch (err) {
      log.error('Failed to send notifications:', err)
      throw err
    }
  }

  const updateNotification = async (id: number) => {
    try {
      const { execute } = useCustomFetch(`notification/${id}`).put()
      await execute()
      await fetchNotifications() // Refresh after update
    } catch (err) {
      log.error('Failed to update notification:', err)
      throw err
    }
  }

  return {
    // State
    notifications,
    isLoading,
    error,
    // Actions
    fetchNotifications,
    addBulkNotifications,
    updateNotification
  }
})

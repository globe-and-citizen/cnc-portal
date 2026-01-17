import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { BulkNotificationPayload, Notification } from '@/types/notification'
import { log } from '@/utils'
import {
  useNotificationsQuery,
  useAddBulkNotificationsQuery,
  useUpdateNotification
} from '@/queries/notification.queries'

export const useNotificationStore = defineStore('notification', () => {
  // Use queries
  const { data: notificationsData, isLoading, error, refetch } = useNotificationsQuery()
  const addBulkMutation = useAddBulkNotificationsQuery()
  const updateMutation = useUpdateNotification()

  // Computed state
  const notifications = computed<Notification[]>(() => notificationsData.value || [])

  // Actions
  const fetchNotifications = async () => {
    try {
      await refetch()
    } catch (err) {
      log.error('Failed to fetch notifications:', err)
      throw err
    }
  }

  const addBulkNotifications = async (payload: BulkNotificationPayload) => {
    try {
      await addBulkMutation.mutateAsync(payload)
    } catch (err) {
      log.error('Failed to send notifications:', err)
      throw err
    }
  }

  const updateNotification = async (id: number) => {
    try {
      await updateMutation.mutateAsync(id)
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

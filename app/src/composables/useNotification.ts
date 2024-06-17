import { watch, ref } from 'vue'
import { type NotificationResponse } from '@/types'
import { useCustomFetch } from '@/composables/useCustomFetch'

const isUnread = ref(false)

export const useNotification = () => {
  const {
    isFetching: isNotificationsFetching,
    error: notificationError,
    data: notifications,
    execute: executeFetchNotifications
  } = useCustomFetch<NotificationResponse>('notification').json()

  watch(notifications, () => {
    if (notifications.value) {
      const { data } = notifications.value

      const idx = data.findIndex((notification: any) => notification.isRead === false)

      isUnread.value = idx > -1
    }
  })

  return {
    isNotificationsFetching,
    notificationError,
    notifications,
    executeFetchNotifications,
    isUnread
  }
}

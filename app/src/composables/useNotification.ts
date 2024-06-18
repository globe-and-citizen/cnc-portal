import { watch, ref, type Ref } from 'vue'
import { type NotificationResponse } from '@/types'
import { useCustomFetch } from '@/composables/useCustomFetch'

const isUnread = ref(false)

export const useNotification = () => {
  const id: Ref<number | string | null> = ref(null)

  const {
    isFetching: isNotificationsFetching,
    error: notificationError,
    data: notifications,
    execute: executeFetchNotifications
  } = useCustomFetch<NotificationResponse>('notification').json()

  const {
    //isFetching: isUpdateNotificationsFetching,
    //error: isUpdateNotificationError,
    execute: executeUpdateNotifications
    //data: _notifications
  } = useCustomFetch<NotificationResponse>('notification', {
    immediate: false,
    beforeFetch: async ({ options, url, cancel }) => {
      options.body = JSON.stringify({ id: id.value })

      return { options, url, cancel }
    }
  })
    .put()
    .json()

  const updateNotification = async (_id: number | string | null) => {
    id.value = _id

    await executeUpdateNotifications()
    await executeFetchNotifications()
  }

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
    isUnread,
    updateNotification
  }
}

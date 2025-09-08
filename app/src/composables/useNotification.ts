import { useCustomFetch } from '@/composables/useCustomFetch'
import type { NotificationPayload } from '@/types/notification'
import { log } from '@/utils'

export function useNotifications() {
  const addBodActionNotification = async ({
    userIds,
    message,
    subject,
    author,
    resource
  }: NotificationPayload) => {
    try {
      const payload: NotificationPayload = {
        userIds,
        message,
        subject,
        author,
        resource
      }

      const { execute } = useCustomFetch('notification/', {
        immediate: false
      }).post(payload)

      await execute()
    } catch (err) {
      log.error('Failed to send BOD action notification:', err)
      throw err
    }
  }

  return {
    addBodActionNotification
  }
}

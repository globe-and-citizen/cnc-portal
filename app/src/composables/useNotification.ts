import { useCustomFetch } from '@/composables/useCustomFetch'
import type { BulkNotificationPayload } from '@/types/notification'
import { log } from '@/utils'

export function useNotifications() {
  const addUsersNotification = async ({
    userIds,
    message,
    subject,
    author,
    resource
  }: BulkNotificationPayload) => {
    try {
      const payload: BulkNotificationPayload = {
        userIds,
        message,
        subject,
        author,
        resource
      }

      const { execute } = useCustomFetch('notification/bulk/', {
        immediate: false
      }).post(payload)

      await execute()
    } catch (err) {
      log.error('Failed to send notification to users:', err)
      throw err
    }
  }

  return {
    addUsersNotification
  }
}

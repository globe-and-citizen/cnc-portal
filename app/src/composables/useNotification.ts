import { NotificationAPI } from '@/apis/notificationApi'
import { parseError } from '@/utils'
import { ref } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { ToastType } from '@/types'

const isUnread = ref(false)
const notifications = ref()

export const useNotification = () => {
  const { addToast } = useToastStore()

  async function fetchData() {
    try {
      notifications.value = await NotificationAPI.getNotifications()
      const idx = notifications.value.findIndex(
        (notification: any) => notification.isRead === false
      )
      /*console.log(`notifications: `, notifications.value)
            console.log(`idx: `, idx)*/
      isUnread.value = idx > -1
    } catch (error) {
      addToast({ message: parseError(error), type: ToastType.Error, timeout: 3000 })
    }
  }

  fetchData()

  return { notifications, isUnread }
}

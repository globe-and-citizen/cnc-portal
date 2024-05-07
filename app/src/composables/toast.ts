import { ToastType } from '@/types'
import { ref } from 'vue'

export function useToast() {
  const type = ref(ToastType.Success)
  const show = ref(false)
  const message = ref('')

  async function showToast(toastType: ToastType, toastMessage: string) {
    type.value = toastType
    show.value = true
    message.value = toastMessage

    setTimeout(() => {
      show.value = false
    }, 3000)
  }

  return { showToast }
}

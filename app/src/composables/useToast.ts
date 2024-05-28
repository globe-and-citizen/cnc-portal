import { ref } from 'vue'
import { ToastType } from '@/types'

interface Toast {
  message: string
  type: ToastType
}

const toasts = ref<Toast[]>([])

export function useToast() {
  const addToast = (message: string, type: ToastType = ToastType.Success) => {
    toasts.value.push({ message, type })
    setTimeout(() => {
      toasts.value.shift()
    }, 5000) // Remove toast after 5 seconds
  }

  return {
    toasts,
    addToast
  }
}

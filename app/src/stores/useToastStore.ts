import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ToastType } from '@/types'

interface Toast {
  message: string
  type: ToastType
  timeout: number
}

export const useToastStore = defineStore('_toast', () => {
  const toasts = ref<Toast[]>([])

  const addToast = (
    message: string,
    type: ToastType = ToastType.Success,
    timeout: number = 5000
  ) => {
    toasts.value.push({ message, type, timeout })
    setTimeout(() => {
      toasts.value.shift()
    }, timeout)
  }

  return {
    toasts,
    addToast
  }
})

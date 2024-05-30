import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ToastType } from '@/types'

interface Toast {
  id: number;
  message: string
  type: ToastType
  timeout: number
}

export const useToastStore = defineStore('_toast', () => {
  const toasts = ref<Toast[]>([])
  let id = 0

  const addToast = (
    message: string,
    type: ToastType = ToastType.Success,
    timeout: number = 5000
  ) => {
    toasts.value.push({ id: id++, message, type, timeout })
    setTimeout(() => {
      //toasts.value.shift()
      removeToast(id)
    }, timeout)
  }

  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  return {
    toasts,
    addToast
  }
})

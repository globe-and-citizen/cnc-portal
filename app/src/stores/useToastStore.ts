import { defineStore } from 'pinia'
import { ref } from 'vue'
import { type Toast } from '@/types'

export const useToastStore = defineStore('_toast', () => {
  const toasts = ref<Toast[]>([])
  let id = 0

  const addToast = (toast: Toast) => {
    toasts.value.push({ ...toast, id: id++ })
    setTimeout(() => {
      removeToast(id)
    }, toast.timeout)
  }

  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return {
    toasts,
    addToast
  }
})

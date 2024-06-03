import { defineStore } from 'pinia'
import { ref } from 'vue'
import { type Toast } from '@/types'

export const useToastStore = defineStore('_toast', () => {
  const toasts = ref<Toast[]>([])
  let id = 0

  const addToast = (toast: Toast) => {
    id++
    const currentId = id
    toasts.value.push({ ...toast, id: currentId })
    setTimeout(() => {
      console.log(' will remove Toast ', currentId)
      removeToast(currentId)
    }, toast.timeout)
  }

  const removeToast = (id: number) => {
    console.log('Removing toast with id ', id)

    const toastsTemp = toasts.value.filter((toast) => toast.id !== id)
    toasts.value = []
    toasts.value = toastsTemp
    if (toasts.value.length === 0) {
      id = 0
    }
  }

  return {
    toasts,
    addToast
  }
})

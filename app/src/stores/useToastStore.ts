import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ToastType, type Toast } from '@/types'

const DEFAULT_TIMEOUT = 5000

export const useToastStore = defineStore('_toast', () => {
  const toasts = ref<Toast[]>([])
  let toastId = 0

  const addToast = (toast: Toast) => {
    const currentId = ++toastId
    toasts.value.push({ ...toast, id: currentId })
    setTimeout(() => {
      removeToast(currentId)
    }, toast.timeout)
  }

  const addSuccessToast = (message: string) => {
    addToast({ message, timeout: DEFAULT_TIMEOUT, type: ToastType.Success })
  }
  const addInfoToast = (message: string) => {
    addToast({ message, timeout: DEFAULT_TIMEOUT, type: ToastType.Info })
  }
  const addWarningToast = (message: string) => {
    addToast({ message, timeout: DEFAULT_TIMEOUT, type: ToastType.Warning })
  }
  const addErrorToast = (message: string) => {
    addToast({ message, timeout: DEFAULT_TIMEOUT, type: ToastType.Error })
  }
  const removeToast = (id: number) => {
    const toastsTemp = toasts.value.filter((toast) => toast.id !== id)
    toasts.value = []
    toasts.value = toastsTemp
    if (toasts.value.length < 1) {
      toastId = 0
    }
  }

  return {
    toasts,
    addSuccessToast,
    addInfoToast,
    addWarningToast,
    addErrorToast
  }
})

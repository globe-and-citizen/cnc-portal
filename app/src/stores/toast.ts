import { ToastType } from '@/types'
import { defineStore } from 'pinia'

export const useToastStore = defineStore('toast', {
  state: () => ({
    type: ToastType.Success as ToastType,
    message: '' as string,
    showToast: false as boolean
  }),
  actions: {
    show(type: ToastType, message: string) {
      this.type = type
      this.message = message

      this.showToast = true

      setTimeout(() => {
        this.showToast = false
      }, 3000)
    }
  }
})

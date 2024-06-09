import { useToastStore } from '@/stores/useToastStore'
import { ToastType } from '@/types'

export function useErrorHandler() {
  const { addToast } = useToastStore()

  function handleError(error: any) {
    console.log('Error:', error.message)
    error.value = error.message
    addToast({ type: ToastType.Error, message: error.message, timeout: 5000 })
  }

  return { handleError }
}

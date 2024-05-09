import { useToastStore } from '@/stores/toast'
import { ToastType } from '@/types'

export function useErrorHandler() {
  const { show } = useToastStore()

  function handleError(error: any) {
    console.log('Error:', error.message)
    error.value = error.message
    show(ToastType.Error, error.message)
  }

  return { handleError }
}

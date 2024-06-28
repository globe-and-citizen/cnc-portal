import { useToastStore } from '@/stores/useToastStore'
export function useErrorHandler() {
  const { addErrorToast } = useToastStore()

  function handleError(error: any) {
    console.log('Error:', error.message)
    error.value = error.message
    addErrorToast(error.message)
  }

  return { handleError }
}

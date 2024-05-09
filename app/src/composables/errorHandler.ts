import { useToast } from "vue-toastification"

export function useErrorHandler() {

  function handleError(error: any) {
    console.log('Error:', error.message)
    error.value = error.message
    const $toast = useToast()
    $toast.error(error.message)
  }

  return { handleError }
}

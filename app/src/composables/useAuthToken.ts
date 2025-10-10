import { useStorage } from '@vueuse/core'
import { computed } from 'vue'

export function useAuthToken() {
  const token = useStorage('authToken', '')
  return computed(() => token.value)
}

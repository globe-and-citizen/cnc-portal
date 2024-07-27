import { useCustomFetch } from '@/composables/useCustomFetch'
import { useUserDataStore } from '@/stores/user'
import type { User } from '@/types/user'
import { log } from '@/utils/generalUtil'
import { ref } from 'vue'

export function useAuth() {
  const isAuthenticated = ref(false)
  const user = ref<User | null>(null)

  // TODO: Handle auth status and user data here

  /**
   * Logs out the user by clearing the user data and forcing a page reload
   */
  const logout = () => {
    log.info('Logging out user')
    const { clearUserData } = useUserDataStore()
    clearUserData()

    log.info('User logged out')
    log.info('Reloading the page')
    window.location.reload()
  }

  const validateToken = async () => {
    const { error } = await useCustomFetch(`auth/token`)
    return error.value ? false : true
  }

  return { isAuthenticated, user, logout, validateToken }
}

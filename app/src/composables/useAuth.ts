import { useUserDataStore } from '@/stores/user'
import type { User } from '@/types/user'
import { log } from '@/utils/generalUtil'
import { ref } from 'vue'

export function useAuth() {
  const isAuthenticated = ref(false)
  const user = ref<User | null>(null)

  /**
   * Logs out the user by clearing the user data and forcing a page reload
   */
  const logout = () => {
    log.info('Logging out user')
    const { clearUserData } = useUserDataStore()
    clearUserData()

    log.info('User logged out')
    log.info('Redirecting to login page')
    window.location.reload()
  }

  return { isAuthenticated, user, logout }
}

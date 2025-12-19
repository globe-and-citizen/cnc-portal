import { useUserDataStore } from '@/stores/user'
import type { User } from '@/types/user'
import { log } from '@/utils/generalUtil'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useValidateToken } from '@/queries/auth.queries'

export function useAuth() {
  const isAuthenticated = ref(false)
  const user = ref<User | null>(null)
  const router = useRouter()
  
  // Initialize the query at the top level
  const { error, refetch } = useValidateToken()

  // TODO: Handle auth status and user data here

  /**
   * Logs out the user by clearing the user data, waiting 5 seconds, then redirecting to login
   */
  const logout = () => {
    log.info('Logging out user')
    const { clearUserData } = useUserDataStore()
    clearUserData()

    log.info('User logged out')
    log.info('Waiting 5 seconds before redirecting to login page')

    // Wait for 5 seconds then redirect
    setTimeout(() => {
      log.info('Redirecting to login page')
      router.push({ name: 'login' })
    }, 5000)
  }

  const validateToken = async () => {
    await refetch()
    return !error.value
  }

  return { isAuthenticated, user, logout, validateToken }
}

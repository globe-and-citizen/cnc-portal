import router from '@/router'
import { AuthService } from '@/services/authService'
import { useUserDataStore } from '@/stores/user'

export const logout = () => {
  AuthService.logout()
  useUserDataStore().clearUserData()
  useUserDataStore().setAuthStatus(false)
  router.push('/login')
}

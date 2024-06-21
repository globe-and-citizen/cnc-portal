import { AuthService } from '@/services/authService'
import { useUserDataStore } from '@/stores/user'

export const logout = () => {
  AuthService.logout()
  useUserDataStore().clearUserData()
  useUserDataStore().setAuthStatus(false)
  window.location.reload()
}

import { AuthService } from '@/services/authService'
import { useOwnerAddressStore } from '@/stores/address'
import { useUserDataStore } from '@/stores/user'

export const logout = () => {
  AuthService.logout()
  useOwnerAddressStore().clearOwnerAddress()
  useUserDataStore().clearUserData()
  useUserDataStore().setAuthStatus()
  window.location.reload()
}

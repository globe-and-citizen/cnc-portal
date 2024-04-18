import { AuthService } from '@/services/authService'
import { useOwnerAddressStore } from '@/stores/address'

export const logout = () => {
  AuthService.logout()
  const ownerAddressStore = useOwnerAddressStore()

  ownerAddressStore.clearOwnerAddress()
  window.location.reload()
}

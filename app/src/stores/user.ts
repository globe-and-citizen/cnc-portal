import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { AuthService } from '@/services/authService'

export const useUserDataStore = defineStore('user', () => {
  const userName = useStorage('name', '')
  const userAddress = useStorage('ownerAddress', '')
  const userNonce = useStorage('nonce', '')
  const isAuth = useStorage('isAuth', false)

  function setUserData(name: string, address: string, nonce: string) {
    userName.value = name
    userAddress.value = address
    userNonce.value = nonce
  }

  function clearUserData() {
    userName.value = ''
    userAddress.value = ''
    userNonce.value = ''
  }
  async function setAuthStatus() {
    const authStatus = await AuthService.isAuthenticated()
    isAuth.value = authStatus
  }

  return {
    name: userName,
    address: userAddress,
    nonce: userNonce,
    isAuth,
    setUserData,
    clearUserData,
    setAuthStatus
  }
})

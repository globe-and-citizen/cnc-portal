import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useUserDataStore = defineStore('user', () => {
  const userName = useStorage('name', '')
  const userAddress = useStorage('ownerAddress', '')
  const userNonce = useStorage('nonce', '')
  const userImageUrl = useStorage('imageUrl', '')
  const isAuth = useStorage('isAuth', false)

  function setUserData(name: string, address: string, nonce: string, imageUrl: string) {
    userName.value = name
    userAddress.value = address
    userNonce.value = nonce
    userImageUrl.value = imageUrl
  }

  function clearUserData() {
    userName.value = ''
    userAddress.value = ''
    userNonce.value = ''
    isAuth.value = false // Reset authentication status as well if clearing user data
  }

  function setAuthStatus(status: boolean) {
    isAuth.value = status
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

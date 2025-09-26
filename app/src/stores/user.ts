import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useUserDataStore = defineStore('user', () => {
  const userName = useStorage('name', '')
  const userAddress = useStorage('ownerAddress', '')
  const userNonce = useStorage('nonce', '')
  const userImageUrl = useStorage('imageUrl', '')
  const isAuth = useStorage('isAuth', false)
  const isNameGenerated = useStorage('isNameGenerated', false)

  function setUserData(name: string, address: string, nonce: string, imageUrl: string) {
    userName.value = name
    userAddress.value = address
    userNonce.value = nonce
    userImageUrl.value = imageUrl
    isNameGenerated.value = false
  }

  function clearUserData() {
    userName.value = ''
    userAddress.value = ''
    userNonce.value = ''
    isAuth.value = false // Reset authentication status as well if clearing user data
    isNameGenerated.value = false
  }

  function setAuthStatus(status: boolean) {
    isAuth.value = status
  }

  return {
    name: userName,
    address: userAddress,
    nonce: userNonce,
    imageUrl: userImageUrl,
    isNameGenerated,
    isAuth,
    setUserData,
    clearUserData,
    setAuthStatus
  }
})

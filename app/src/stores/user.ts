import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { Address } from 'viem'

export const useUserDataStore = defineStore('user', () => {
  const userName = useStorage('name', '')
  const userAddress = useStorage<Address>('ownerAddress', '' as Address)
  const userNonce = useStorage('nonce', '')
  const userImageUrl = useStorage('imageUrl', '')
  const isAuth = useStorage('isAuth', false)

  function setUserData(name: string, address: Address, nonce: string, imageUrl: string) {
    userName.value = name
    userAddress.value = address
    userNonce.value = nonce
    userImageUrl.value = imageUrl
  }

  function clearUserData() {
    userName.value = ''
    userAddress.value = '' as Address
    userNonce.value = ''
    userImageUrl.value = ''
    isAuth.value = false // Reset authentication status as well if clearing user data
  }

  function setAuthStatus(status: boolean) {
    isAuth.value = status
  }

  return {
    name: userName,
    address: userAddress,
    nonce: userNonce,
    imageUrl: userImageUrl,
    isAuth,
    setUserData,
    clearUserData,
    setAuthStatus
  }
})

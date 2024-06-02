import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useUserDataStore = defineStore('user', () => {
  const userName = useStorage('name', '')
  const userAddress = useStorage('ownerAddress', '')
  const userNonce = useStorage('nonce', '')

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

  return { name: userName, address: userAddress, nonce: userNonce, setUserData, clearUserData }
})

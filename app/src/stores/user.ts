import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

export const useUserDataStore = defineStore({
  id: 'userData',
  state: () => ({
    name: useStorage('name', ''),
    address: useStorage('ownerAddress', ''),
    nonce: useStorage('nonce', '')
  }),
  actions: {
    setUserData(name: string, address: string, nonce: string) {
      this.name = name
      this.address = address
      this.nonce = nonce
      useStorage('name', name) // Save name to localStorage
      useStorage('ownerAddress', address) // Save address to localStorage
      useStorage('nonce', nonce) // Save nonce to localStorage
    },
    clearUserData() {
      this.name = ''
      this.address = ''
      this.nonce = ''
      localStorage.clear() // Clear all localStorage
    }
  }
})

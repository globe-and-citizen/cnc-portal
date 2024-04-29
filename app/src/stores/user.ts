import { defineStore } from 'pinia'

export const useUserDataStore = defineStore({
  id: 'userData',
  state: () => ({
    name: localStorage.getItem('name') || '',
    address: localStorage.getItem('ownerAddress') || '',
    nonce: localStorage.getItem('nonce') || ''
  }),
  actions: {
    setUserData(name: string, address: string, nonce: string) {
      this.name = name
      this.address = address
      this.nonce = nonce
      localStorage.setItem('name', name) // Save name to localStorage
      localStorage.setItem('ownerAddress', address) // Save address to localStorage
      localStorage.setItem('nonce', nonce) // Save nonce to localStorage
    },
    clearUserData() {
      this.name = ''
      this.address = ''
      this.nonce = ''
      localStorage.clear() // Clear all localStorage
    }
  }
})

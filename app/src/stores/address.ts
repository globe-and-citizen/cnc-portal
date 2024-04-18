import { defineStore } from 'pinia'

export const useOwnerAddressStore = defineStore({
  id: 'ownerAddress',
  state: () => ({
    ownerAddress: localStorage.getItem('ownerAddress') || '' // Load owner address from localStorage
  }),
  actions: {
    setOwnerAddress(address: string) {
      this.ownerAddress = address
      localStorage.setItem('ownerAddress', address) // Save owner address to localStorage
    },
    clearOwnerAddress() {
      this.ownerAddress = ''
      localStorage.removeItem('ownerAddress') // Remove owner address from localStorage
    }
  }
})

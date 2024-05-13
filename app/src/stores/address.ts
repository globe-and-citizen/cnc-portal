import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

export const useOwnerAddressStore = defineStore({
  id: 'ownerAddress',
  state: () => ({
    ownerAddress: useStorage('ownerAddress', '') // Load owner address from localStorage
  }),
  actions: {
    setOwnerAddress(address: string) {
      this.ownerAddress = address
      useStorage('ownerAddress', address) // Save owner address to localStorage
    },
    clearOwnerAddress() {
      this.ownerAddress = ''
      useStorage('ownerAddress', '') // Remove owner address from localStorage
    }
  }
})

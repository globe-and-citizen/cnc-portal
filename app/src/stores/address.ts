import { defineStore } from 'pinia'

export const useOwnerAddressStore = defineStore({
  id: 'ownerAddress',
  state: () => ({
    ownerAddress: ''
  }),
  actions: {
    setOwnerAddress(address: string) {
      this.ownerAddress = address
    },
    getOwnerAddress() {
      return this.ownerAddress
    }
  }
})

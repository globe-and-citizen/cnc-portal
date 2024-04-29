import { defineStore } from 'pinia'

export const useUserDataStore = defineStore({
  id: 'userData',
  state: () => ({
    userData: localStorage.getItem('userData') || '' // Load user data from localStorage
  }),
  actions: {
    setUserData(name: string, nonce: string, address: string) {
      const data = { name, nonce, address }
      this.userData = JSON.stringify(data)
      localStorage.setItem('userData', JSON.stringify(data)) // Save user data to localStorage
    },
    clearUserData() {
      this.userData = ''
      localStorage.removeItem('userData') // Remove user data from localStorage
    }
  }
})

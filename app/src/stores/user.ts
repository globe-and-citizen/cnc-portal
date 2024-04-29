import type { User } from '@/types/index'
import { defineStore } from 'pinia'

export const useUserDataStore = defineStore({
  id: 'userData',
  state: () => ({
    userData: localStorage.getItem('userData') || '' // Load user data from localStorage
  }),
  actions: {
    setUserData(user: Partial<User>) {
      this.userData = JSON.stringify(user)
      localStorage.setItem('userData', JSON.stringify(user)) // Save user data to localStorage
    },
    clearUserData() {
      this.userData = ''
      localStorage.removeItem('userData') // Remove user data from localStorage
    }
  }
})

import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { AuthService } from '@/services/authService'

export const useUserDataStore = defineStore({
  id: 'userData',
  state: () => ({
    name: useStorage('name', ''),
    address: useStorage('ownerAddress', ''),
    nonce: useStorage('nonce', ''),
    isAuth: useStorage('isAuth', false)
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
    },
    async setAuthStatus() {
      const isAuth = await AuthService.isAuthenticated()
      this.isAuth = isAuth
      useStorage('isAuth', isAuth) // Save isAuth to localStorage
    }
  }
})

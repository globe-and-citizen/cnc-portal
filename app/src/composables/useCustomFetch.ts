import { AuthService } from '@/services/authService'
import { BACKEND_URL } from '@/constant/index'
import { createFetch } from '@vueuse/core'

export const useCustomFetch = createFetch({
  baseUrl: `${BACKEND_URL}/api/`,
  combination: 'chain',
  options: {
    async beforeFetch({ options }) {
      const token = AuthService.getToken()
      options = {
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
      return { options }
    }
  }
})

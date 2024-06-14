import { AuthService } from '@/services/authService'
import { BACKEND_URL } from '@/constant/index'
import { createFetch } from '@vueuse/core'

export const useCustomFetch = createFetch({
  baseUrl: `${BACKEND_URL}/api/`,
  combination: 'overwrite',
  fetchOptions: {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AuthService.getToken()}`
    }
  },
  options: {
    async beforeFetch({ options }) {
      options = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${AuthService.getToken()}`
        }
      }

      return { options }
    }
  }
})

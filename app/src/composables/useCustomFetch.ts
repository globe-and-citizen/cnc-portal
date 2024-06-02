import { AuthService } from '@/services/authService'
import { BACKEND_URL } from '@/constant/index'
import { createFetch } from '@vueuse/core'

const token: string | null = AuthService.getToken()
export const useCustomFetch = createFetch({
  baseUrl: `${BACKEND_URL}/api/`,
  fetchOptions: {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
})
import axios from 'axios'
import { BACKEND_URL } from '@/constant'
import type { Router } from 'vue-router'
import { useUserDataStore } from '@/stores/user'

const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api/`,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Setup the 401 response interceptor
 * This should be called after app initialization to ensure router and Pinia are available
 */
export const setupAuthInterceptor = (router: Router) => {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle 401 errors globally - logout user
      if (error.response?.status === 401) {
        console.warn('Unauthorized request detected - logging out user')

        // Use Pinia store to clear auth data (guaranteed to be available)
        const userStore = useUserDataStore()
        userStore.clearUserData()

        // Redirect to login page
        router.push({ name: 'login' }).catch(() => {
          // Fallback to direct navigation if router push fails
          window.location.href = '/login'
        })
      }
      return Promise.reject(error)
    }
  )
}

export default apiClient

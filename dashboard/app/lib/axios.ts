import axios from 'axios'
import type { AxiosInstance } from 'axios'
import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { BACKEND_URL } from '~/constant/index'

/**
 * Create axios instance with configured base URL
 * Uses Nuxt runtime config to get the backend URL
 */
function createApiClient(): AxiosInstance {
  return axios.create({
    baseURL: `${BACKEND_URL}/api/`,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export const apiClient = createApiClient()

/**
 * Setup request interceptor to add auth token
 * Adds Bearer token from localStorage to all requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = useLocalStorage<string | null>('dashboard-auth-token', null)
    if (token.value) {
      config.headers.Authorization = `Bearer ${token.value}`
    }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

/**
 * Setup response interceptor for error handling
 * Should be called after app initialization to ensure router and Pinia are available
 *
 * @param router - Vue Router instance for redirects
 * @throws Error if called before router is available
 *
 * @example
 * // In app setup
 * setupAuthInterceptor(router)
 */
export const setupAuthInterceptor = (router: Router) => {
  apiClient.interceptors.response.use(
    response => response,
    async (error) => {
      // Handle 401 Unauthorized - clear auth and redirect to login
      if (error.response?.status === 401) {
        console.warn('Unauthorized request (401) - clearing auth and redirecting to login')

        // Clear auth store
        const authStore = useAuthStore()
        authStore.logout()

        // Clear auth token from localStorage
        localStorage.removeItem('authToken')

        // Redirect to login
        try {
          await router.push({ name: 'login' })
        } catch (err) {
          // Fallback to direct navigation if router push fails
          console.warn('Router push failed, using window navigation')
          window.location.href = '/login'
        }
      }

      // Handle 403 Forbidden - user lacks permissions
      if (error.response?.status === 403) {
        console.warn('Access forbidden (403) - user lacks required permissions')
        // Optionally redirect to an access-denied page or home
        try {
          await router.push({ name: 'index' })
        } catch {
          // Silently fail if router push fails
        }
      }

      // Handle 404 Not Found
      if (error.response?.status === 404) {
        console.warn('Resource not found (404)')
      }

      // Handle 500 Server Error
      if (error.response?.status === 500) {
        console.error('Server error (500)', error.response.data)
      }

      // Handle network errors
      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        console.error('Network error - request timeout or connection refused', error)
      }

      return Promise.reject(error)
    }
  )
}

/**
 * Get the current axios instance
 * Can be used to make requests directly if needed
 *
 * @returns Configured axios instance
 *
 * @example
 * const client = getApiClient()
 * const response = await client.get('/user/0x123...')
 */
export const getApiClient = (): AxiosInstance => {
  return apiClient
}

export default apiClient

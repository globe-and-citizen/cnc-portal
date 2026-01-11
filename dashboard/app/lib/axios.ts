import axios from 'axios'
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders
} from 'axios'
import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
// import { BACKEND_URL } from '~/constant/index'

const BACKEND_URL = 'https://apiv2.cncportal.io'
/**
 * Create a configured axios instance.
 * Uses Nuxt runtime config via BACKEND_URL helper, with sensible defaults.
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
 * Request interceptor: attach Bearer token from AuthStore (preferred)
 * and fallback to localStorage if store is not available yet.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let token: string | null = null
    try {
      const authStore = useAuthStore()
      token = authStore.getToken()
    } catch {
      // Pinia not ready (early import or SSR context) – fallback
      token
        = typeof localStorage !== 'undefined'
          ? localStorage.getItem('dashboard-auth-token')
          : null
    }

    if (token) {
      const headers = (config.headers ?? {}) as AxiosRequestHeaders
      headers.Authorization = `Bearer ${token}`
      config.headers = headers
    }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

/**
 * Base response interceptor: lightweight handling/logging.
 * For full auth flows (redirects), use setupAuthInterceptor(router).
 */
apiClient.interceptors.response.use(
  response => response,
  (error) => {
    if (error.response?.status === 401) {
      // Keep minimal global handling; pages/queries can decide specifics
      console.warn('Unauthorized request detected')
    }
    return Promise.reject(error)
  }
)

/**
 * Optional router-aware interceptor with richer handling.
 * Call once in app initialization (e.g., a Nuxt plugin).
 */
export const setupAuthInterceptor = (router: Router) => {
  apiClient.interceptors.response.use(
    response => response,
    async (error) => {
      if (error.response?.status === 401) {
        console.warn(
          'Unauthorized (401) – clearing auth and redirecting to login'
        )
        try {
          const authStore = useAuthStore()
          authStore.clearAuth()
        } catch {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('dashboard-auth-token')
            localStorage.removeItem('dashboard-auth-address')
          }
        }
        try {
          await router.push({ name: 'login' })
        } catch (e) {
          console.warn('Router push failed, using window navigation', e)
          window.location.href = '/login'
        }
      }

      if (error.response?.status === 403) {
        console.warn('Access forbidden (403) – insufficient permissions')
        try {
          await router.push({ name: 'index' })
        } catch {
          // no-op if routing fails
        }
      }

      if (error.response?.status === 404) {
        console.warn('Resource not found (404)')
      }

      if (error.response?.status === 500) {
        console.error('Server error (500)', error.response.data)
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        console.error('Network error – timeout or connection refused', error)
      }

      return Promise.reject(error)
    }
  )
}

/**
 * Get the configured axios instance.
 */
export const getApiClient = (): AxiosInstance => apiClient

export default apiClient

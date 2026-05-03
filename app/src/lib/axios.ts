import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { BACKEND_URL } from '@/constant'
import type { Router } from 'vue-router'
import { useUserDataStore } from '@/stores/user'

const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api/`,
  headers: {
    Accept: 'application/json'
  }
})

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Let the browser/axios set the correct multipart boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  } else {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

// Retry transient failures (serverless cold starts, brief upstream blips).
// Retriable on network errors and on these status codes.
const RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 500

type RetryableConfig = InternalAxiosRequestConfig & { __retryCount?: number }

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined
    if (!config) return Promise.reject(error)

    const status = error.response?.status
    const shouldRetry =
      (status !== undefined && RETRY_STATUSES.has(status)) ||
      (status === undefined && error.code !== 'ERR_CANCELED')

    if (!shouldRetry) return Promise.reject(error)

    config.__retryCount = (config.__retryCount ?? 0) + 1
    if (config.__retryCount > MAX_RETRIES) return Promise.reject(error)

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    return apiClient.request(config)
  }
)

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

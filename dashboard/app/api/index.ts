import axios from 'axios'

/**
 * Base Axios Instance
 *
 * Configured axios instance with default settings for API calls.
 * Note: For authenticated requests, use the apiClient from lib/axios instead,
 * which includes auth token injection and error handling.
 *
 * @deprecated Use apiClient from @/lib/axios for authenticated requests
 */
export const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - can be used to add auth tokens, etc.
apiClient.interceptors.request.use(
  (config) => {
    // Add any global request modifications here
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - can be used for global error handling
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle global errors here
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

/**
 * Get the backend URL from runtime config
 */
export const getBackendUrl = (): string => {
  const config = useRuntimeConfig()
  return config.public.backendUrl || 'https://apiv2.cncportal.io'
}

export default apiClient

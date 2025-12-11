import axios from 'axios'
import { BACKEND_URL } from '@/constant'

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

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors globally if needed
    if (error.response?.status === 401) {
      // Will be handled by individual queries if needed
      console.warn('Unauthorized request detected')
    }
    return Promise.reject(error)
  }
)

export default apiClient
